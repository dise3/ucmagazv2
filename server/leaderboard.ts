import type { SupabaseClient } from '@supabase/supabase-js';

export type LeaderboardEntry = {
    rank: number;
    displayName: string;
    totalUc: number;
};

/** Имя из Telegram (first + last), не @username; 2 буквы заменяются на * */
export function maskDisplayName(firstName?: string | null, lastName?: string | null): string {
    const name = [firstName, lastName]
        .filter((s) => s && String(s).trim())
        .map((s) => String(s).trim())
        .join(' ')
        .trim();

    if (!name) return 'Покупатель';

    const chars = [...name];
    const letterIdx: number[] = [];
    chars.forEach((c, i) => {
        if (c !== ' ' && /\p{L}/u.test(c)) letterIdx.push(i);
    });

    if (letterIdx.length === 0) return 'Покупатель';
    if (letterIdx.length <= 2) {
        return chars
            .map((c, i) => (letterIdx.includes(i) ? '*' : c))
            .join('');
    }

    const mid = Math.floor(letterIdx.length / 2);
    const maskAt = new Set([letterIdx[mid], letterIdx[mid + 1] ?? letterIdx[mid]]);

    return chars.map((c, i) => (maskAt.has(i) ? '*' : c)).join('');
}

export async function getLeaderboard(
    supabase: SupabaseClient,
    limit = 10
): Promise<LeaderboardEntry[]> {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('user_chat_id, amount_uc, buyer_first_name, buyer_last_name')
        .in('status', ['paid', 'completed'])
        .eq('order_type', 'uc')
        .not('user_chat_id', 'is', null)
        .neq('uid_player', 'MANUAL_ORDER');

    if (error) {
        console.error('[leaderboard]', error);
        return [];
    }

    const { data: broadcastUsers } = await supabase
        .from('broadcast_users')
        .select('chat_id, first_name, last_name');

    const nameByChat = new Map<number, { first: string | null; last: string | null }>();
    broadcastUsers?.forEach((u) => {
        nameByChat.set(Number(u.chat_id), {
            first: u.first_name,
            last: u.last_name,
        });
    });

    const totals = new Map<
        number,
        { totalUc: number; first: string | null; last: string | null }
    >();

    for (const o of orders || []) {
        const chatId = Number(o.user_chat_id);
        if (!chatId) continue;

        const prev = totals.get(chatId) ?? {
            totalUc: 0,
            first: o.buyer_first_name ?? null,
            last: o.buyer_last_name ?? null,
        };
        prev.totalUc += Number(o.amount_uc) || 0;
        if (o.buyer_first_name) prev.first = o.buyer_first_name;
        if (o.buyer_last_name) prev.last = o.buyer_last_name;
        totals.set(chatId, prev);
    }

    const sorted = [...totals.entries()]
        .map(([chatId, v]) => {
            const fallback = nameByChat.get(chatId);
            const first = v.first ?? fallback?.first ?? null;
            const last = v.last ?? fallback?.last ?? null;
            return {
                chatId,
                totalUc: v.totalUc,
                displayName: maskDisplayName(first, last),
            };
        })
        .sort((a, b) => b.totalUc - a.totalUc)
        .slice(0, limit);

    return sorted.map((row, i) => ({
        rank: i + 1,
        displayName: row.displayName,
        totalUc: row.totalUc,
    }));
}
