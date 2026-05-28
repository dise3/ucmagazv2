import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MAIN_BOT_TOKEN = process.env.MAIN_BOT_TOKEN || '';
export const MAIN_ADMIN_CHAT_ID = process.env.MAIN_ADMIN_CHAT_ID
    ? process.env.MAIN_ADMIN_CHAT_ID.split(',').map((id) => id.trim())
    : [];
export const STORE_LABEL = process.env.STORE_LABEL || 'Дочерний магазин';

export function formatRub(amount: number): string {
    return `${amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}₽`;
}

async function ensureBalanceRow(supabase: SupabaseClient) {
    await supabase.from('shop_balance').upsert({ id: 1 }, { onConflict: 'id' });
}

export async function sendTelegramBot(
    botToken: string,
    chatId: string | number | string[],
    text: string,
    replyMarkup?: object
) {
    if (!botToken) {
        console.error('[withdraw] bot token missing');
        return;
    }
    const ids = Array.isArray(chatId) ? chatId : [chatId];
    for (const id of ids) {
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: id,
                text,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            });
        } catch (e: any) {
            console.error('[withdraw] Telegram error:', e.response?.data || e.message);
        }
    }
}

export async function getRubBalances(supabase: SupabaseClient) {
    await ensureBalanceRow(supabase);
    const { data } = await supabase
        .from('shop_balance')
        .select('balance_rub, balance_rub_reserved')
        .eq('id', 1)
        .single();
    const total = Number(data?.balance_rub ?? 0);
    const reserved = Number(data?.balance_rub_reserved ?? 0);
    return { total, reserved, available: Math.max(0, total - reserved) };
}

export function formatBalanceMessage(balances: Awaited<ReturnType<typeof getRubBalances>>): string {
    return (
        `💰 <b>Баланс</b>\n\n` +
        `Доступно: <b>${formatRub(balances.available)}</b>\n` +
        `(в резерве заявок: ${formatRub(balances.reserved)})`
    );
}

/** Зачисление ₽ — вызывает главный магазин через API */
export async function creditRub(supabase: SupabaseClient, amount: number) {
    if (amount <= 0) return { ok: false, error: 'Сумма должна быть > 0' };
    await ensureBalanceRow(supabase);
    const { data } = await supabase.from('shop_balance').select('balance_rub').eq('id', 1).single();
    const next = Number(data?.balance_rub ?? 0) + amount;
    const { error } = await supabase.from('shop_balance').update({ balance_rub: next }).eq('id', 1);
    if (error) return { ok: false, error: error.message };
    return { ok: true, balanceRub: next };
}

export async function createWithdrawalRequest(
    supabase: SupabaseClient,
    params: {
        amountRub: number;
        platform: 'binance' | 'bybit';
        walletId: string;
        adminChatId: string;
    }
) {
    const { available } = await getRubBalances(supabase);
    if (params.amountRub <= 0) {
        return { ok: false, error: 'Сумма должна быть больше 0' };
    }
    if (params.amountRub > available) {
        return { ok: false, error: `Недостаточно средств. Доступно: ${formatRub(available)}` };
    }

    await ensureBalanceRow(supabase);
    const { data: bal } = await supabase.from('shop_balance').select('balance_rub_reserved').eq('id', 1).single();
    const reserved = Number(bal?.balance_rub_reserved ?? 0) + params.amountRub;

    const { error: reserveErr } = await supabase
        .from('shop_balance')
        .update({ balance_rub_reserved: reserved })
        .eq('id', 1);
    if (reserveErr) return { ok: false, error: reserveErr.message };

    const { data: req, error } = await supabase
        .from('withdrawal_requests')
        .insert({
            store_label: STORE_LABEL,
            amount_rub: params.amountRub,
            platform: params.platform,
            wallet_id: params.walletId,
            status: 'pending',
            admin_chat_id: params.adminChatId,
        })
        .select()
        .single();

    if (error || !req) {
        await supabase
            .from('shop_balance')
            .update({ balance_rub_reserved: reserved - params.amountRub })
            .eq('id', 1);
        return { ok: false, error: error?.message || 'Не удалось создать заявку' };
    }

    const platformLabel = params.platform === 'binance' ? 'Binance' : 'Bybit';
    const adminText =
        `📤 <b>Заявка на вывод #${req.id}</b>\n\n` +
        `🏪 <b>${STORE_LABEL}</b>\n` +
        `💵 Сумма: <b>${formatRub(params.amountRub)}</b>\n` +
        `📱 Площадка: <b>${platformLabel}</b>\n` +
        `🆔 ID: <code>${params.walletId}</code>`;

    const keyboard = {
        inline_keyboard: [[{ text: '✅ Выполнено', callback_data: `wdone_${req.id}` }]],
    };

    if (!MAIN_BOT_TOKEN) {
        console.error('[withdraw] MAIN_BOT_TOKEN не задан — заявка только в БД #' + req.id);
        return { ok: true, request: req, warned: 'MAIN_BOT_TOKEN не настроен' };
    }
    if (!MAIN_ADMIN_CHAT_ID.length) {
        console.error('[withdraw] MAIN_ADMIN_CHAT_ID не задан');
        return { ok: true, request: req, warned: 'MAIN_ADMIN_CHAT_ID не настроен' };
    }

    await sendTelegramBot(MAIN_BOT_TOKEN, MAIN_ADMIN_CHAT_ID, adminText, keyboard);
    return { ok: true, request: req };
}

export async function completeWithdrawal(supabase: SupabaseClient, requestId: number, botToken: string) {
    const { data: req } = await supabase.from('withdrawal_requests').select('*').eq('id', requestId).single();

    if (!req) return { ok: false, error: 'Заявка не найдена' };
    if (req.status === 'completed') return { ok: false, error: 'Уже выполнена' };

    const amount = Number(req.amount_rub);

    await ensureBalanceRow(supabase);
    const { data: bal } = await supabase
        .from('shop_balance')
        .select('balance_rub, balance_rub_reserved')
        .eq('id', 1)
        .single();

    const balance = Number(bal?.balance_rub ?? 0);
    const reserved = Number(bal?.balance_rub_reserved ?? 0);
    if (balance < amount) {
        return { ok: false, error: 'Недостаточно рублей на балансе' };
    }

    const { error: updErr } = await supabase
        .from('withdrawal_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', requestId);
    if (updErr) return { ok: false, error: updErr.message };

    await supabase
        .from('shop_balance')
        .update({
            balance_rub: balance - amount,
            balance_rub_reserved: Math.max(0, reserved - amount),
        })
        .eq('id', 1);

    const platformLabel = req.platform === 'binance' ? 'Binance' : 'Bybit';
    await sendTelegramBot(
        botToken,
        req.admin_chat_id,
        `✅ <b>Вывод выполнен</b>\n\n` +
            `Заявка #${requestId}\n` +
            `💵 ${formatRub(amount)} → ${platformLabel}\n` +
            `🆔 <code>${req.wallet_id}</code>`
    );

    return { ok: true, request: req };
}
