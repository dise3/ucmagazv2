import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import { platform } from 'node:os';

const MSK_OFFSET_HOURS = 3;

export const MAIN_STORE_BOT_TOKEN =
    process.env.MAIN_STORE_BOT_TOKEN || process.env.MAIN_BOT_TOKEN || '';
export const MAIN_STORE_ADMIN_CHAT_IDS = (
    process.env.MAIN_STORE_ADMIN_CHAT_IDS ||
    process.env.MAIN_ADMIN_CHAT_ID ||
    ''
)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
export const STORE_LABEL = process.env.STORE_LABEL || 'Дочерний магазин';

export function getMskDayKey(date: Date = new Date()): string {
    const msk = new Date(date.getTime() + MSK_OFFSET_HOURS * 60 * 60 * 1000);
    return msk.toISOString().slice(0, 10);
}

export function getTodayMskKey(): string {
    return getMskDayKey(new Date());
}

export function formatRub(amount: number): string {
    return `${amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}₽`;
}

export function formatUsdt(amount: number): string {
    return `${amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USDT`;
}

async function ensureChildTreasury(supabase: SupabaseClient) {
    await supabase.from('child_treasury').upsert({ id: 1 }, { onConflict: 'id' });
}

export async function sendTelegramBot(
    botToken: string,
    chatId: string | number | string[],
    text: string,
    replyMarkup?: object
) {
    if (!botToken) {
        console.error('[treasury_child] bot token missing');
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
            console.error('[treasury_child] Telegram error:', e.response?.data || e.message);
        }
    }
}

/** После оплаты заказа — ₽ в журнал за день (МСК), не в USDT */
export async function recordChildOrderRevenue(
    supabase: SupabaseClient,
    orderId: number,
    priceRub: number,
    createdAt?: string
) {
    if (!priceRub || priceRub <= 0) return;

    const { data: existing } = await supabase
        .from('child_treasury_order_log')
        .select('order_id')
        .eq('order_id', orderId)
        .maybeSingle();
    if (existing) return;

    const dayKey = getMskDayKey(createdAt ? new Date(createdAt) : new Date());

    const { data: row } = await supabase
        .from('child_daily_rub_ledger')
        .select('rub_total')
        .eq('day_date', dayKey)
        .maybeSingle();

    const newTotal = Number(row?.rub_total ?? 0) + priceRub;
    if (row) {
        await supabase.from('child_daily_rub_ledger').update({ rub_total: newTotal }).eq('day_date', dayKey);
    } else {
        await supabase.from('child_daily_rub_ledger').insert({ day_date: dayKey, rub_total: newTotal });
    }

    await supabase.from('child_treasury_order_log').insert({
        order_id: orderId,
        rub_amount: priceRub,
        day_date: dayKey,
    });
}

async function getUnconvertedRubDays(supabase: SupabaseClient) {
    const today = getTodayMskKey();
    const { data } = await supabase
        .from('child_daily_rub_ledger')
        .select('day_date, rub_total')
        .is('converted_at', null)
        .lt('day_date', today)
        .order('day_date', { ascending: true });

    const days = data ?? [];
    const totalRub = days.reduce((s, d) => s + Number(d.rub_total), 0);
    return { days, totalRub, today };
}

export async function getChildTreasurySummary(supabase: SupabaseClient) {
    await ensureChildTreasury(supabase);
    const { data: t } = await supabase.from('child_treasury').select('*').eq('id', 1).single();
    const { days, totalRub, today } = await getUnconvertedRubDays(supabase);
    const { data: todayRow } = await supabase
        .from('child_daily_rub_ledger')
        .select('rub_total')
        .eq('day_date', today)
        .maybeSingle();

    return {
        balanceUsdt: Number(t?.balance_usdt ?? 0),
        lastRate: t?.usdt_rate_rub ? Number(t.usdt_rate_rub) : null,
        todayRub: Number(todayRow?.rub_total ?? 0),
        todayMsk: today,
        unconvertedRub: totalRub,
        unconvertedDays: days.map((d) => ({
            day_date: d.day_date,
            rub_total: Number(d.rub_total),
        })),
    };
}

export function formatChildTreasuryMessage(s: Awaited<ReturnType<typeof getChildTreasurySummary>>): string {
    const unconvertedLines =
        s.unconvertedDays.length > 0
            ? s.unconvertedDays
                .map((d) => `• ${d.day_date}: ${formatRub(d.rub_total)}`)
                .join('\n')
            : '—';
    const rateLine = s.lastRate ? `\nПоследний курс: <b>${s.lastRate}</b> руб/USDT` : '';
    return (
        `💰 <b>Казначейство</b>\n\n` +
        `📅 Сегодня (${s.todayMsk}): <b>${formatRub(s.todayRub)}</b> — ещё не по курсу\n\n` +
        `⏳ К конвертации:\n${unconvertedLines}\n` +
        `<b>Итого: ${formatRub(s.unconvertedRub)}</b>${rateLine}\n\n` +
        `💵 <b>К выводу: ${formatUsdt(s.balanceUsdt)}</b>`
    );
}

/** Конвертация прошлых дней (кроме сегодня МСК) — вызывает главный магазин */
export async function convertChildRubToUsdt(supabase: SupabaseClient, rateRubPerUsdt: number) {
    if (!rateRubPerUsdt || rateRubPerUsdt <= 0) {
        return { ok: false as const, error: 'Некорректный курс' };
    }

    const { days, totalRub, today } = await getUnconvertedRubDays(supabase);
    if (totalRub <= 0) {
        return { ok: false as const, error: `Нет ₽ для конвертации (сегодня ${today} не учитывается)` };
    }

    const usdtAdded = totalRub / rateRubPerUsdt;
    const now = new Date().toISOString();

    await ensureChildTreasury(supabase);
    const { data: t } = await supabase.from('child_treasury').select('balance_usdt').eq('id', 1).single();
    const newUsdt = Number(t?.balance_usdt ?? 0) + usdtAdded;

    const { error } = await supabase
        .from('child_treasury')
        .update({ balance_usdt: newUsdt, usdt_rate_rub: rateRubPerUsdt })
        .eq('id', 1);
    if (error) return { ok: false as const, error: error.message };

    for (const d of days) {
        await supabase
            .from('child_daily_rub_ledger')
            .update({ converted_at: now })
            .eq('day_date', d.day_date);
    }

    return {
        ok: true as const,
        totalRub,
        usdtAdded,
        rate: rateRubPerUsdt,
        newBalanceUsdt: newUsdt,
    };
}

export async function createWithdrawalRequest(
    supabase: SupabaseClient,
    params: {
        amountUsdt: number;
        payoutDetails: string;
        platform: 'binance' | 'bybit'
        adminChatId: string;
    }
) {
    await ensureChildTreasury(supabase);
    const { data: t } = await supabase.from('child_treasury').select('balance_usdt').eq('id', 1).single();
    const balance = Number(t?.balance_usdt ?? 0);

    if (params.amountUsdt <= 0) {
        return { ok: false as const, error: 'Сумма должна быть больше 0' };
    }
    if (params.amountUsdt > balance) {
        return { ok: false as const, error: `Недостаточно USDT. Доступно: ${formatUsdt(balance)}` };
    }

    const { error: reserveErr } = await supabase
        .from('child_treasury')
        .update({ balance_usdt: balance - params.amountUsdt })
        .eq('id', 1);
    if (reserveErr) return { ok: false as const, error: reserveErr.message };

    const { data: req, error } = await supabase
        .from('withdrawal_requests')
        .insert({
            store_label: STORE_LABEL,
            amount_usdt: params.amountUsdt,
            payout_details: params.payoutDetails,
            platform: params.platform,
            status: 'pending',
            admin_chat_id: params.adminChatId,
        })
        .select()
        .single();

    if (error || !req) {
        await supabase.from('child_treasury').update({ balance_usdt: balance }).eq('id', 1);
        return { ok: false as const, error: error?.message || 'Не удалось создать заявку' };
    }

    const platformLabel = params.platform === 'binance' ? 'Binance' : 'Bybit';
    const adminText =
        `🏪 <b>Заявка на вывод #${req.id} (дочерний)</b>\n\n` +
        `💵 <b>${formatUsdt(params.amountUsdt)}</b>\n` +
        `📱 Площадка: <b>${platformLabel}</b>\n` +
        `📋 <code>${params.payoutDetails}</code>`;

    const keyboard = {
        inline_keyboard: [[{ text: '✅ Выполнено', callback_data: `wdone_${req.id}` }]],
    };

    if (!MAIN_STORE_BOT_TOKEN) {
        console.error('[treasury_child] MAIN_STORE_BOT_TOKEN не задан — заявка только в БД #' + req.id);
        return { ok: true as const, request: req, warned: 'MAIN_STORE_BOT_TOKEN не настроен' };
    }
    if (!MAIN_STORE_ADMIN_CHAT_IDS.length) {
        console.error('[treasury_child] MAIN_STORE_ADMIN_CHAT_IDS не задан');
        return { ok: true as const, request: req, warned: 'MAIN_STORE_ADMIN_CHAT_IDS не настроен' };
    }

    await sendTelegramBot(MAIN_STORE_BOT_TOKEN, MAIN_STORE_ADMIN_CHAT_IDS, adminText, keyboard);
    return { ok: true as const, request: req };
}

/** Завершение вывода — вызывает главный магазин (wdone_) */
export async function completeWithdrawalRequest(
    supabase: SupabaseClient,
    requestId: number,
    childBotToken: string
) {
    const { data: req } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (!req) return { ok: false as const, error: 'Заявка не найдена' };
    if (req.status !== 'pending') {
        return { ok: false as const, error: req.status === 'completed' ? 'Уже выполнена' : 'Неверный статус' };
    }

    const amount = Number(req.amount_usdt);
    const { error: updErr } = await supabase
        .from('withdrawal_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', requestId);
    if (updErr) return { ok: false as const, error: updErr.message };


    const platformLabel = req.platform === 'binance' ? 'Binance' : 'Bybit';
    await sendTelegramBot(
        childBotToken,
        req.admin_chat_id,
        `✅ <b>Вывод #${requestId} выполнен</b>\n\n` +
        `💵 ${formatUsdt(amount)}\n` +
        `📱 ${platformLabel}\n` +
        `📋 <code>${req.payout_details}</code>`
    );

    return { ok: true as const };
}
