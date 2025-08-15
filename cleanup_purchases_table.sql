-- =============================================
-- Script para eliminar la tabla purchases
-- Ejecutar SOLO después de verificar que todo funciona con payments
-- =============================================

-- Verificar que no haya datos importantes en purchases
SELECT COUNT(*) as total_purchases FROM purchases;

-- Verificar que la tabla payments tiene todos los datos necesarios
SELECT 
  COUNT(*) as total_payments,
  COUNT(CASE WHEN type = 'match' THEN 1 END) as match_payments,
  COUNT(CASE WHEN type = 'subscription' THEN 1 END) as subscription_payments
FROM payments;

-- Una vez verificado que todo funciona correctamente:
-- DROP TABLE purchases;

-- También puedes eliminar las tablas relacionadas al sistema legacy si no las usas:
-- DROP TABLE daily_free_uses;
-- DROP TABLE daily_ipua_uses;  
-- DROP TABLE prediction_access_logs;
-- DROP TABLE subject_fingerprints;
-- DROP TABLE subjects;
-- DROP TABLE subscription_daily_uses;

-- IMPORTANTE: Solo ejecuta estos DROP después de confirmar que todo funciona perfectamente
