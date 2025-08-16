-- =============================================
-- Agregar verificación de edad y aceptación de cookies
-- =============================================

-- Agregar columnas para verificación de edad en subjects (usuarios anónimos)
ALTER TABLE subjects 
ADD COLUMN age_verified BOOLEAN NULL DEFAULT NULL COMMENT 'NULL=no verificado, 1=mayor de edad, 0=menor de edad',
ADD COLUMN age_verified_at TIMESTAMP NULL COMMENT 'Cuándo se verificó la edad',
ADD COLUMN cookies_accepted BOOLEAN NULL DEFAULT NULL COMMENT 'NULL=no decidido, 1=aceptadas, 0=rechazadas',
ADD COLUMN cookies_accepted_at TIMESTAMP NULL COMMENT 'Cuándo se aceptaron/rechazaron las cookies';

-- Agregar columnas para verificación de edad en users (usuarios registrados)
ALTER TABLE users 
ADD COLUMN age_verified BOOLEAN NULL DEFAULT NULL COMMENT 'NULL=no verificado, 1=mayor de edad, 0=menor de edad',
ADD COLUMN age_verified_at TIMESTAMP NULL COMMENT 'Cuándo se verificó la edad',
ADD COLUMN cookies_accepted BOOLEAN NULL DEFAULT NULL COMMENT 'NULL=no decidido, 1=aceptadas, 0=rechazadas',
ADD COLUMN cookies_accepted_at TIMESTAMP NULL COMMENT 'Cuándo se aceptaron/rechazaron las cookies';

-- Crear índices para consultas rápidas
CREATE INDEX idx_subjects_age_verified ON subjects(age_verified);
CREATE INDEX idx_users_age_verified ON users(age_verified);
CREATE INDEX idx_subjects_cookies_accepted ON subjects(cookies_accepted);
CREATE INDEX idx_users_cookies_accepted ON users(cookies_accepted);
