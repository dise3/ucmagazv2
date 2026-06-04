-- Топ покупателей: имена в заказах
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_first_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_last_name TEXT;
