-- =============================================
-- Tabla de planes de suscripción con límites
-- =============================================

CREATE TABLE subscription_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL UNIQUE,
  daily_limit INT NULL COMMENT 'NULL = ilimitado, número = límite diario',
  price_cents INT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  interval_type ENUM('month', 'year') NOT NULL DEFAULT 'month',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Insertar los planes existentes
INSERT INTO subscription_plans (name, stripe_price_id, daily_limit, price_cents, description) VALUES
('2 al día', 'price_1RwLyk8WAF6l0p4eaF60CxC4', 2, 999, '2 pronósticos al día'),
('5 al día', 'price_1RwM048WAF6l0p4edGLdFN52', 5, 1499, '5 pronósticos al día'),
('Ilimitado', 'price_1RwM1f8WAF6l0p4eFaJduOzi', NULL, 2499, 'Acceso ilimitado a todos los pronósticos');

-- Crear tabla para rastrear uso diario
CREATE TABLE daily_usage (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  date_used DATE NOT NULL,
  predictions_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date_used),
  INDEX idx_user_date (user_id, date_used),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
