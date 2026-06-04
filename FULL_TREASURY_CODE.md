# Полный код: дочерний + главный магазин

---

## ДОЧЕРНИЙ МАГАЗИН (этот проект `ucmagaz2`)

Уже в репозитории. Файлы:

| Файл | Назначение |
|------|------------|
| `supabase_treasury.sql` | БД: `shop_balance`, `withdrawal_requests` |
| `server/treasury.ts` | Баланс ₽, заявка, уведомление в главный бот |
| `server/server.ts` | Кнопки, API, webhook (фрагменты ниже) |

### .env дочернего

```env
BOT_TOKEN=...
ADMIN_CHAT_ID=...
MAIN_BOT_TOKEN=токен_главного_бота
MAIN_ADMIN_CHAT_ID=ваш_telegram_id
STORE_LABEL=Название магазина
TREASURY_API_SECRET=общий_секрет
BACKEND_URL=https://api-дочернего
```

### API дочернего (уже в server.ts)

```typescript
app.post('/api/treasury/withdrawal/complete', ...);
app.post('/api/treasury/credit', ...);
```

### server/treasury.ts — полный файл

См. [`server/treasury.ts`](server/treasury.ts) (194 строки).

### server.ts — фрагменты дочернего

**Импорт:**

```typescript
import {
    getRubBalances,
    formatBalanceMessage,
    formatRub,
    createWithdrawalRequest,
    completeWithdrawal,
    creditRub,
} from './treasury.ts';

const TREASURY_API_SECRET = process.env.TREASURY_API_SECRET || '';
const checkTreasurySecret = (req: express.Request) =>
    TREASURY_API_SECRET && req.headers['x-treasury-secret'] === TREASURY_API_SECRET;
```

**Клавиатура:**

```typescript
[{ text: "💸 Вывести средства", callback_data: "money" }],
```

**API:**

```typescript
app.post('/api/treasury/withdrawal/complete', async (req, res) => {
    if (!checkTreasurySecret(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const requestId = parseInt(req.body?.requestId, 10);
    if (!requestId) return res.status(400).json({ ok: false, error: 'requestId required' });
    const result = await completeWithdrawal(supabase, requestId, BOT_TOKEN!);
    res.status(result.ok ? 200 : 400).json(result);
});

app.post('/api/treasury/credit', async (req, res) => {
    if (!checkTreasurySecret(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const result = await creditRub(supabase, Number(req.body?.amount));
    res.status(result.ok ? 200 : 400).json(result);
});
```

**Текст админа (state):** `await_withdraw_amount`, `await_withdraw_wallet` — см. `server/server.ts` ~1099–1141.

**Callback:** `money`, `wdraw_binance`, `wdraw_bybit` — см. `server/server.ts` ~2021–2047.

---

## ГЛАВНЫЙ МАГАЗИН (другой проект)

Скопируйте папку [`main_store/`](main_store/):

| Файл | Куда |
|------|------|
| `main_store/treasury_main.ts` | → `server/treasury_main.ts` |
| `main_store/SERVER_PATCH.md` | вставки в `server.ts` |
| `supabase_treasury_main.sql` | Supabase главного |

### supabase_treasury_main.sql — полный

См. [`supabase_treasury_main.sql`](supabase_treasury_main.sql).

### treasury_main.ts — полный

См. [`main_store/treasury_main.ts`](main_store/treasury_main.ts).

### Вставки в server.ts главного

См. [`main_store/SERVER_PATCH.md`](main_store/SERVER_PATCH.md).

---

## Порядок запуска

1. Supabase дочернего → `supabase_treasury.sql`
2. Supabase главного → `supabase_treasury_main.sql`
3. `.env` на обоих серверах (одинаковый `TREASURY_API_SECRET`)
4. Главный: скопировать `treasury_main.ts` + патч в `server.ts`
5. Перезапустить оба сервера
6. Дочернему зачислить ₽: с главного «Зачислить дочернему» или SQL / API credit

---

## Схема

```
ДОЧЕРНИЙ                          ГЛАВНЫЙ
────────                          ───────
оплаты → (нет учёта ₽)            оплаты → daily_rub_ledger
/admin → Вывести ₽                /admin → Конвертация ₽→USDT
       → главный бот wdone_N              → completeChildWithdrawal → API дочернего
                                      → Зачислить ₽ дочернему → API credit
```
