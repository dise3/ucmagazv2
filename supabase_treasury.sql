

CREATE TABLE IF NOT EXISTS shop_balance (
  id INTEGER PRIMARY KEY DEFAULT 1,
  balance_rub FLOAT8 NOT NULL DEFAULT 0,
  balance_rub_reserved FLOAT8 NOT NULL DEFAULT 0,
  CONSTRAINT shop_balance_single_row CHECK (id = 1)
);

INSERT INTO shop_balance (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  store_label TEXT NOT NULL DEFAULT 'Дочерний магазин',
  amount_rub FLOAT8 NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('binance', 'bybit')),
  wallet_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_chat_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Если раньше выполняли версию с USDT — переименование колонок
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_balance' AND column_name = 'balance_usdt'
  ) THEN
    ALTER TABLE shop_balance RENAME COLUMN balance_usdt TO balance_rub;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shop_balance' AND column_name = 'balance_usdt_reserved'
  ) THEN
    ALTER TABLE shop_balance RENAME COLUMN balance_usdt_reserved TO balance_rub_reserved;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawal_requests' AND column_name = 'amount_usdt'
  ) THEN
    ALTER TABLE withdrawal_requests RENAME COLUMN amount_usdt TO amount_rub;
  END IF;
END $$;

ALTER TABLE shop_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_balance_all" ON shop_balance;
CREATE POLICY "shop_balance_all" ON shop_balance FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "withdrawal_requests_all" ON withdrawal_requests;
CREATE POLICY "withdrawal_requests_all" ON withdrawal_requests FOR ALL USING (true) WITH CHECK (true);
