# Главный магазин — куда вставить код и что в БД


Два проекта = **две базы Supabase**. Не смешивать таблицы дочернего и главного.

---

## 1. База данных главного магазина

В **Supabase главного** проекта выполните файл:

**`supabase_treasury_main.sql`** (лежит в этом репозитории — скопируйте в главный проект или выполните оттуда).

| Таблица | Зачем |
|---------|--------|
| `main_treasury` | Баланс USDT после конвертации, последний курс `usdt_rate_rub` |
| `daily_rub_ledger` | Сколько ₽ принято за каждый день (МСК) |
| `treasury_order_log` | Чтобы не считать один заказ дважды |

**Не нужно** в главной БД: `withdrawal_requests`, `shop_balance` дочернего — они только в Supabase **дочернего** магазина.

---

## 2. Переменные `.env` главного сервера

```env
CHILD_STORE_API_URL=https://ваш-api-дочернего.ru
TREASURY_API_SECRET=тот_же_секрет_что_у_дочернего
```

---

## 3. Куда вставить обработчик «Выполнено»

В **главном** проекте откройте файл, где обрабатывается Telegram webhook.  
Обычно это `server/server.ts`, маршрут **`POST /api/bot-webhook`**.

Структура такая же, как у дочернего:

```text
app.post('/api/bot-webhook', async (req, res) => {
    ...
    if (callback_query) {
        const data = callback_query.data;
        const currentChatId = ...
        const msgId = callback_query.message.message_id;

        // ... ваши кнопки: admin_panel, done_123, adm_rates ...

        // ▼▼▼ ВСТАВИТЬ СЮДА (рядом с done_, hold_ и т.д.) ▼▼▼

        if (data.startsWith('wdone_')) {
            ...
        }

        // ▲▲▲ конец вставки ▲▲▲
    }
});
```

**Место:** внутри блока `if (callback_query) { ... }`, **до** закрывающей `}` этого блока (в дочернем проекте это рядом с `done_`, `hold_`, `adm_activate_accounts`).

### Готовый код

```typescript
if (data.startsWith('wdone_')) {
    if (!ADMIN_CHAT_ID.includes(currentChatId)) {
        await answerCallback(callback_query.id, 'Нет доступа');
        return;
    }

    const requestId = parseInt(data.replace('wdone_', ''), 10);
    if (!requestId) {
        await answerCallback(callback_query.id, 'Неверный номер заявки');
        return;
    }

    try {
        const res = await axios.post(
            `${process.env.CHILD_STORE_API_URL}/api/treasury/withdrawal/complete`,
            { requestId },
            {
                headers: {
                    'x-treasury-secret': process.env.TREASURY_API_SECRET,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (res.data?.ok) {
            const prevText = callback_query.message?.text || 'Заявка на вывод';
            await editTg(
                currentChatId,
                msgId,
                prevText + '\n\n✅ <b>ВЫПОЛНЕНО</b>',
                { inline_keyboard: [] }
            );
            await answerCallback(callback_query.id, 'Вывод подтверждён');
        } else {
            await answerCallback(callback_query.id, res.data?.error || 'Ошибка дочернего API');
        }
    } catch (e: any) {
        console.error('[wdone]', e.response?.data || e.message);
        await answerCallback(callback_query.id, 'Не удалось связаться с API дочернего');
    }
}
```

Нужны уже существующие в главном проекте: `axios`, `editTg`, `answerCallback`, `ADMIN_CHAT_ID`.

---

## 4. Зачисление ₽ партнёру (дочернему балансу)

После того как вы начислили долю в рублях (или после конвертации — по вашей логике), с **главного** сервера:

```typescript
await axios.post(
    `${process.env.CHILD_STORE_API_URL}/api/treasury/credit`,
    { amount: 5000 },
    {
        headers: {
            'x-treasury-secret': process.env.TREASURY_API_SECRET,
            'Content-Type': 'application/json',
        },
    }
);
```

`5000` — рубли на баланс дочернего (тогда он сможет нажать «Вывести средства»).

---

## 5. Конвертация ₽→USDT (только главный, отдельная кнопка)

Это **не** срабатывает автоматически при заявке `wdone_`.

Логику конвертации (курс, прошлые дни, баланс USDT) нужно сделать в **главном** `server.ts` + таблицы из `supabase_treasury_main.sql`. В дочерний репозиторий она не входит.

При заявке из дочернего в главный бот приходит только текст:

> 5 000₽ → Binance, ID …

USDT для перевода на биржу вы считаете сами: `сумма_₽ / курс` или добавите в главном боте строку «≈ XX USDT» при показе заявки.

---

## 6. Схема

```text
Дочерний бот                    Главный бот                 Дочерний API
     │                               │                            │
     │  заявка 5000₽ (Telegram)      │                            │
     ├──────────────────────────────►│  сообщение + [Выполнено]   │
     │                               │  wdone_5                   │
     │                               ├───────────────────────────►│ complete #5
     │◄──────────────────────────────┼────────────────────────────┤ «Вывод выполнен»
```

