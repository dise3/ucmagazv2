-- Дочерний магазин: USDT-баланс, журнал ₽ по дням (МСК), заявки на вывод

CREATE TABLE IF NOT EXISTS child_treasury (
  id INTEGER PRIMARY KEY DEFAULT 1,
  balance_usdt FLOAT8 NOT NULL DEFAULT 0,
  usdt_rate_rub FLOAT8,
  CONSTRAINT child_treasury_single_row CHECK (id = 1)
);

INSERT INTO child_treasury (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS child_daily_rub_ledger (
  day_date DATE PRIMARY KEY,
  rub_total FLOAT8 NOT NULL DEFAULT 0,
  converted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS child_treasury_order_log (
  order_id BIGINT PRIMARY KEY,
  rub_amount FLOAT8 NOT NULL,
  day_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заявки на вывод (USDT → главный магазин)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  store_label TEXT NOT NULL DEFAULT 'Дочерний магазин',
  amount_usdt FLOAT8 NOT NULL,
  payout_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_chat_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Миграция со старой схемы (shop_balance / amount_rub)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawal_requests' AND column_name = 'amount_rub'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawal_requests' AND column_name = 'amount_usdt'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN amount_usdt FLOAT8;
    ALTER TABLE withdrawal_requests ADD COLUMN payout_details TEXT;
    UPDATE withdrawal_requests SET
      amount_usdt = amount_rub,
      payout_details = COALESCE(platform, '') || ': ' || COALESCE(wallet_id, '')
    WHERE amount_usdt IS NULL;
    ALTER TABLE withdrawal_requests ALTER COLUMN amount_usdt SET NOT NULL;
    ALTER TABLE withdrawal_requests ALTER COLUMN payout_details SET NOT NULL;
  END IF;
END $$;

ALTER TABLE child_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_daily_rub_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_treasury_order_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "child_treasury_all" ON child_treasury;
CREATE POLICY "child_treasury_all" ON child_treasury FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "child_daily_rub_all" ON child_daily_rub_ledger;
CREATE POLICY "child_daily_rub_all" ON child_daily_rub_ledger FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "child_treasury_order_log_all" ON child_treasury_order_log;
CREATE POLICY "child_treasury_order_log_all" ON child_treasury_order_log FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "withdrawal_requests_all" ON withdrawal_requests;
CREATE POLICY "withdrawal_requests_all" ON withdrawal_requests FOR ALL USING (true) WITH CHECK (true);
