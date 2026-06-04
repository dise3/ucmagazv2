-- Заказы «пополнение по входу»
ALTER TABLE orders ADD COLUMN IF NOT EXISTS account_login TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS account_password TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS game_nickname TEXT;
