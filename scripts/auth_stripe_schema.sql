-- =============================================
-- Auth & Stripe integration schema additions
-- Compatible with MySQL 8.0 (pre-8.0.29 safe)
-- =============================================

-- Switch to your database first
-- USE AiPredictions;

-- -----------------------------
-- 1. users table (create if missing)
-- -----------------------------
CREATE TABLE IF NOT EXISTS users (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email              VARCHAR(255) NOT NULL UNIQUE,
  name               VARCHAR(255),
  image              VARCHAR(255),
  password_hash      VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- If users table already exists but lacks stripe_customer_id, add it
-- (will error if column already present – ignore the error or run the check below)
ALTER TABLE users
  ADD COLUMN stripe_customer_id VARCHAR(255) NULL;

-- -----------------------------
-- 2. accounts table (OAuth/Credentials)
-- -----------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT UNSIGNED NOT NULL,
  type                    VARCHAR(255) NOT NULL,
  provider                VARCHAR(255) NOT NULL,
  provider_account_id     VARCHAR(255) NOT NULL,
  refresh_token           TEXT,
  access_token            TEXT,
  expires_at              BIGINT,
  token_type              VARCHAR(255),
  scope                   TEXT,
  id_token                TEXT,
  session_state           TEXT,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provider_account (provider, provider_account_id),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- -----------------------------
-- 3. sessions table
-- -----------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_token  VARCHAR(255) NOT NULL UNIQUE,
  user_id        INT UNSIGNED NOT NULL,
  expires        DATETIME NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- -----------------------------
-- 4. payments table
-- -----------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT UNSIGNED NOT NULL,
  type                    ENUM('subscription','match') NOT NULL,
  stripe_checkout_id      VARCHAR(255) NOT NULL,
  stripe_subscription_id  VARCHAR(255),
  match_slug              VARCHAR(255),
  status                  ENUM('active','canceled','expired','incomplete') NOT NULL DEFAULT 'active',
  current_period_end      DATETIME,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_type (user_id, type),
  KEY idx_match_slug (match_slug),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =============================================
-- End of schema script
-- =============================================
