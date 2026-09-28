CREATE TABLE IF NOT EXISTS merchants (
    id              VARCHAR(36) PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    business_name   VARCHAR(255) NOT NULL,
    wallet_address  VARCHAR(42) NOT NULL,
    wallet_network  VARCHAR(20) DEFAULT 'polygon',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id                  VARCHAR(36) PRIMARY KEY,
    merchant_id         VARCHAR(36) NOT NULL REFERENCES merchants(id),
    amount_inr          NUMERIC(12,2) NOT NULL,
    amount_usdt         NUMERIC(18,6) NOT NULL,
    locked_rate         NUMERIC(10,4) NOT NULL,
    status              VARCHAR(30) DEFAULT 'PENDING',
    onramp_txn_id       VARCHAR(100),
    upi_qr_data         TEXT,
    upi_qr_image_url    TEXT,
    tx_hash             VARCHAR(66),
    destination_wallet  VARCHAR(42) NOT NULL,
    destination_network VARCHAR(20) DEFAULT 'polygon',
    customer_vpa        VARCHAR(255),
    customer_phone      VARCHAR(20),
    expires_at          TIMESTAMPTZ NOT NULL,
    paid_at             TIMESTAMPTZ,
    crypto_sent_at      TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id              VARCHAR(36) PRIMARY KEY,
    provider        VARCHAR(30) NOT NULL,
    event_id        VARCHAR(100) UNIQUE NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    payload         JSONB NOT NULL,
    processed       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_onramp_txn ON orders(onramp_txn_id);
