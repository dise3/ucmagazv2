# Интеграция для проекта главного магазина

Дочерний магазин (этот репозиторий) при выводе шлёт сообщение в **ваш главный Telegram-бот**.  
Кнопка «Выполнено» приходит в webhook **главного** проекта — там нужно обработать callback и дернуть API дочернего.

## Переменные (.env главного проекта)

```env
CHILD_STORE_API_URL=https://api-дочернего-магазина.example.com
TREASURY_API_SECRET=одинаковый_секрет_с_дочерним
```

## Обработчик callback в webhook главного бота

```typescript
if (data.startsWith('wdone_')) {
    const requestId = parseInt(data.replace('wdone_', ''), 10);
    if (!requestId) return;

    try {
        const res = await axios.post(
            `${process.env.CHILD_STORE_API_URL}/api/treasury/withdrawal/complete`,
            { requestId },
            { headers: { 'x-treasury-secret': process.env.TREASURY_API_SECRET } }
        );
        if (res.data.ok) {
            await editTg(chatId, msgId, callback_query.message.text + '\n\n✅ <b>ВЫПОЛНЕНО</b>', { inline_keyboard: [] });
            await answerCallback(callback_query.id, 'Вывод подтверждён');
        } else {
            await answerCallback(callback_query.id, res.data.error || 'Ошибка');
        }
    } catch (e: any) {
        await answerCallback(callback_query.id, 'Не удалось связаться с дочерним API');
    }
}
```

## Зачисление USDT дочернему (после конвертации ₽ на главном)

```typescript
await axios.post(
    `${process.env.CHILD_STORE_API_URL}/api/treasury/credit`,
    { amount: 150.5 },
    { headers: { 'x-treasury-secret': process.env.TREASURY_API_SECRET } }
);
```

## Схема

```
[Дочерний бот / WebApp]  →  заявка в БД дочернего
         ↓
[MAIN_BOT_TOKEN]  →  сообщение админу в главном боте (кнопка wdone_123)
         ↓
[Главный webhook]  →  POST /api/treasury/withdrawal/complete
         ↓
[Дочерний API]  →  списание USDT + уведомление админу дочернего бота
```

Конвертация ₽→USDT, учёт выручки по дням — только в главном проекте, в этот репозиторий не входят.
