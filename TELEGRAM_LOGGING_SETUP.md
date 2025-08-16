# Sistema de Logging a Telegram - Configuración

## Descripción
Se ha implementado un sistema completo de logging que envía notificaciones a Telegram a través de un webhook de N8N para rastrear todas las actividades de los usuarios en la aplicación.

## Variables de Entorno Requeridas

Agrega la siguiente variable a tu archivo `.env` o configuración de Vercel:

```env
URL_N8N_TELEGRAM=https://tu-instancia-n8n.com/webhook/telegram-logging
```

## Actividades Rastreadas

### Automáticas (Server-side)
- ✅ **Visitas a páginas**: Todas las páginas se rastrean automáticamente
- ✅ **Registro de usuarios**: Nuevos registros por email o Google
- ✅ **Intentos de pago**: Compras de partidos y suscripciones
- ✅ **Verificación de edad**: Cuando los usuarios confirman ser mayores de edad
- ✅ **Consentimiento de cookies**: Aceptación/rechazo de cookies
- ✅ **Errores del servidor**: Errores en APIs y aplicación
- ✅ **Llamadas a APIs**: Todas las llamadas a endpoints internos

### Automáticas (Client-side)
- ✅ **Clics en botones**: Enlaces, botones de compra, navegación
- ✅ **Envío de formularios**: Formularios de registro, login, etc.
- ✅ **Tiempo en página**: Duración de permanencia al salir de la página

### Manuales (usando `window.trackActivity`)
- ✅ **Eventos personalizados**: Cualquier actividad específica que quieras rastrear

## Estructura de Mensajes

Los mensajes de Telegram incluyen:
- 📅 **Timestamp**: Fecha y hora en zona horaria española
- 👤 **Usuario**: ID del usuario (si está autenticado) o "Anónimo"
- 📄 **Página**: Página o endpoint donde ocurrió la actividad
- 🔗 **URL**: URL completa
- 📱 **Dispositivo**: Tipo de dispositivo (iPhone, Android, Windows, etc.)
- 🌐 **IP**: Dirección IP del usuario
- 📋 **Detalles**: Información específica de la actividad

## Ejemplos de Mensajes

### Visita a Página
```
👁️ **PAGE_VISIT**
⏰ 15/01/2024 14:30:25
👤 Usuario: 123
📄 Página: /partido/real-madrid-vs-barcelona
🔗 URL: https://tu-app.com/partido/real-madrid-vs-barcelona
📱 Dispositivo: iPhone
🌐 IP: 192.168.1.100
```

### Compra de Partido
```
💳 **PAYMENT_ATTEMPT**
⏰ 15/01/2024 14:35:10
👤 Usuario: 123
📄 Página: /api/pay/match
💰 Cantidad: €5.00
📦 Plan: single_match
🎯 Elemento: purchase_button
📱 Dispositivo: iPhone
🌐 IP: 192.168.1.100
```

### Error
```
🚨 **ERROR**
⏰ 15/01/2024 14:40:15
👤 Usuario: 123
📄 Página: /api/pay/match
❌ Error: Stripe API error: Invalid price ID
📱 Dispositivo: iPhone
🌐 IP: 192.168.1.100
```

## Configuración de N8N

Tu flujo de N8N debe:
1. Recibir peticiones POST en el webhook configurado
2. Extraer el campo `message` del body JSON
3. Enviar el mensaje a tu bot de Telegram

### Datos Recibidos por N8N
```json
{
  "message": "👁️ **PAGE_VISIT**\\n⏰ 15/01/2024...",
  "activity_type": "page_visit",
  "timestamp": "2024-01-15T13:30:25.000Z",
  "userId": "123",
  "page": "/partido/real-madrid-vs-barcelona",
  "url": "https://tu-app.com/partido/real-madrid-vs-barcelona",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100"
}
```

## Archivos Principales

- `src/lib/telegram-logger.js`: Servicio principal de logging
- `src/lib/activity-tracker.js`: Utilidades de rastreo y middleware
- `src/pages/api/track-activity.js`: Endpoint para tracking client-side
- `src/layouts/Base.astro`: Rastreo automático de páginas y script client-side

## Actividades por Componente

### Registro y Autenticación
- `src/pages/api/auth/register.js`: Registro de usuarios ✅
- Login/Logout: A través del tracking client-side ✅

### Pagos y Suscripciones
- `src/pages/api/pay/match.js`: Intentos de compra ✅
- `src/components/MatchPurchaseButton.astro`: Clics en botón de compra ✅
- `src/components/SubscriptionButton.astro`: Clics en botón de suscripción ✅

### Compliance
- `src/pages/api/age-verification.js`: Verificación de edad ✅
- `src/pages/api/cookie-consent.js`: Consentimiento de cookies ✅

## Tracking Manual

Para rastrear eventos personalizados desde el frontend:

```javascript
// Rastrear evento personalizado
window.trackActivity('custom_event', {
  element: 'special_button',
  details: 'Usuario interactuó con elemento especial',
  customData: 'valor_adicional'
});
```

## Beneficios

1. **Monitoreo en tiempo real**: Recibes notificaciones inmediatas de la actividad
2. **Detección de problemas**: Errores y problemas se reportan automáticamente
3. **Análisis de comportamiento**: Entender cómo usan los usuarios la app
4. **Seguimiento de conversiones**: Rastrear el embudo de compras completo
5. **Cumplimiento**: Monitorear que las verificaciones funcionen correctamente

## Privacidad y GDPR

- Solo se rastrean datos necesarios para el funcionamiento
- Las IPs se almacenan temporalmente para análisis de seguridad
- Los usuarios autenticados pueden ser identificados por su ID
- Cumple con las políticas de privacidad existentes
