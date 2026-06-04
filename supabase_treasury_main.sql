-- =============================================================================
-- SQL для Supabase ГЛАВНОГО магазина (отдельный проект, не дочерний!)
-- =============================================================================
-- Заявки дочернего магазина хранятся в БД дочернего — здесь не нужны.
-- Эти таблицы — для вашей выручки: учёт ₽ по дням и конвертация в USDT.

CREATE TABLE IF NOT EXISTS main_treasury (
  id INTEGER PRIMARY KEY DEFAULT 1,
  balance_usdt FLOAT8 NOT NULL DEFAULT 0,
  usdt_rate_rub FLOAT8,
  CONSTRAINT main_treasury_single_row CHECK (id = 1)
);

INSERT INTO main_treasury (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS daily_rub_ledger (
  day_date DATE PRIMARY KEY,
  rub_total FLOAT8 NOT NULL DEFAULT 0,
  converted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS treasury_order_log (
  order_id BIGINT PRIMARY KEY,
  rub_amount FLOAT8 NOT NULL,
  day_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE main_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rub_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_order_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "main_treasury_all" ON main_treasury;
CREATE POLICY "main_treasury_all" ON main_treasury FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "daily_rub_all" ON daily_rub_ledger;
CREATE POLICY "daily_rub_all" ON daily_rub_ledger FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "treasury_order_log_all" ON treasury_order_log;
CREATE POLICY "treasury_order_log_all" ON treasury_order_log FOR ALL USING (true) WITH CHECK (true);
