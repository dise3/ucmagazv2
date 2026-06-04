import cron from 'node-cron';

const DEFAULT_MESSAGE = 'Мы работаем 24/7, пополнить можно в любое время';

export function getNightBroadcastMessage(): string {
    return process.env.NIGHT_BROADCAST_TEXT?.trim() || DEFAULT_MESSAGE;
}

/** Каждый день в 02:30 по Москве */
export function startNightBroadcastSchedule(run: () => Promise<void>) {
    if (process.env.NIGHT_BROADCAST_ENABLED === 'false') {
        console.log('[cron] Ночная рассылка отключена (NIGHT_BROADCAST_ENABLED=false)');
        return;
    }

    cron.schedule(
        '30 2 * * *',
        () => {
            run().catch((e) => console.error('[cron] Ошибка ночной рассылки:', e));
        },
        { timezone: 'Europe/Moscow' }
    );

    console.log('[cron] Ночная рассылка: 02:30 Europe/Moscow — «' + getNightBroadcastMessage() + '»');
}
