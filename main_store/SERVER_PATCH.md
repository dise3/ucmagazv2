# Вставки в server.ts главного магазина

## 1. Импорт (вверху файла)

```typescript
import {
    recordOrderRevenue,
    getMainTreasurySummary,
    formatMainTreasuryMessage,
    convertRubToUsdt,
    completeChildWithdrawal,
    creditChildStore,
    formatRub,
} from './treasury_main.ts';
```

## 2. После оплаты заказа (в `/api/payment-callback`, когда `status: paid`)

Сразу после получения `order`:

```typescript
try {
    await recordOrderRevenue(supabase, order.id, Number(order.price_rub) || 0, order.created_at);
} catch (e) {
    console.error('[treasury_main] recordOrderRevenue', e);
}
```

## 3. Кнопка в админ-меню `getAdminMainKeyboard`

Добавьте строку:

```typescript
[{ text: "💱 Конвертация ₽→USDT", callback_data: "adm_convert" }],
[{ text: "➕ Зачислить ₽ дочернему", callback_data: "adm_credit_child" }],
```

## 4. Тип AdminState — добавить поля

```typescript
withdrawAmount?: number;
creditChildAmount?: number;
```

## 5. Текст админа — в блоке `if (state)` внутри `ADMIN_CHAT_ID`

```typescript
if (state.action === 'await_convert_rate') {
    const rate = parseFloat(text.trim().replace(',', '.'));
    if (isNaN(rate) || rate <= 0) {
        await sendTg(chatId, '❌ Введите курс (руб за 1 USDT), например: 95');
        return;
    }
    const result = await convertRubToUsdt(supabase, rate);
    adminStates.delete(chatId);
    if (!result.ok) {
        await sendTg(chatId, `❌ ${result.error}`, getAdminMainKeyboard());
    } else {
        await sendTg(
            chatId,
            `✅ <b>Конвертация</b>\n\n` +
                `${formatRub(result.totalRub!)} → ${result.usdtAdded!.toFixed(2)} USDT\n` +
                `Курс: ${result.rate} руб/USDT\n` +
                `Баланс USDT: ${result.newBalanceUsdt!.toFixed(2)}`,
            getAdminMainKeyboard()
        );
    }
    return;
}

if (state.action === 'await_credit_child') {
    const amount = parseFloat(text.trim().replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
        await sendTg(chatId, '❌ Введите сумму в рублях');
        return;
    }
    const result = await creditChildStore(amount);
    adminStates.delete(chatId);
    if (!result.ok) {
        await sendTg(chatId, `❌ ${result.error}`, getAdminMainKeyboard());
    } else {
        await sendTg(
            chatId,
            `✅ Дочернему зачислено <b>${formatRub(amount)}</b>\nБаланс: ${formatRub(result.balanceRub ?? 0)}`,
            getAdminMainKeyboard()
        );
    }
    return;
}
```

## 6. Callback — в блоке `if (callback_query)`

```typescript
if (data === 'adm_convert') {
    const summary = await getMainTreasurySummary(supabase);
    const text = formatMainTreasuryMessage(summary);
    if (summary.unconvertedRub <= 0) {
        await editTg(currentChatId, msgId, text + '\n\n<i>Нет ₽ за прошлые дни.</i>', {
            inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'adm_back' }]],
        });
    } else {
        adminStates.set(currentChatId, { action: 'await_convert_rate' });
        await editTg(currentChatId, msgId, text + '\n\n📉 Курс (руб за 1 USDT):', {
            inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'adm_back' }]],
        });
    }
}

if (data === 'adm_credit_child') {
    adminStates.set(currentChatId, { action: 'await_credit_child' });
    await editTg(currentChatId, msgId, '➕ Сумма в <b>рублях</b> для дочернего магазина:', {
        inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'adm_back' }]],
    });
}

if (data.startsWith('wdone_')) {
    if (!ADMIN_CHAT_ID.includes(currentChatId)) {
        await answerCallback(callback_query.id, 'Нет доступа');
        return;
    }
    const requestId = parseInt(data.replace('wdone_', ''), 10);
    if (!requestId) {
        await answerCallback(callback_query.id, 'Неверный ID');
        return;
    }
    const result = await completeChildWithdrawal(requestId);
    if (result.ok) {
        const prev = callback_query.message?.text || '';
        await editTg(currentChatId, msgId, prev + '\n\n✅ <b>ВЫПОЛНЕНО</b>', { inline_keyboard: [] });
        await answerCallback(callback_query.id, 'Вывод подтверждён');
    } else {
        await answerCallback(callback_query.id, result.error || 'Ошибка');
    }
}
```

## 7. .env главного

```env
CHILD_STORE_API_URL=https://api-дочернего
TREASURY_API_SECRET=общий_секрет
```
