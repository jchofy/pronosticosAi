# 📊 Guía del Sistema de Límites de Suscripción

## ✅ **Componentes Agregados**

### **📍 Páginas con UsageLimits:**
- **`/`** (Página principal) - Muestra estado completo
- **`/cuenta`** - Panel de control de límites  
- **`/proximos`** - Vista de pronósticos con límites

### **📱 Navegación Móvil:**
- **`QuickUsageStatus`** - Estado rápido en menú móvil
- **Visible siempre** cuando hay suscripción activa

## 🎯 **Funcionalidades del Sistema**

### **Verificación Automática:**
- ✅ **Antes de mostrar pronósticos** - Verifica límites
- ✅ **Contador automático** - Incrementa uso al acceder
- ✅ **Reset diario** - Límites se reinician cada día
- ✅ **Mensajes específicos** - Diferencia entre tipos de bloqueo

### **Tipos de Planes:**
```javascript
// Plan 2 al día
daily_limit: 2

// Plan 5 al día  
daily_limit: 5

// Plan Ilimitado
daily_limit: null
```

### **Estados de Usuario:**
- 🟢 **Dentro del límite** - Puede acceder
- 🟡 **Cerca del límite** - Advertencia visual
- 🔴 **Límite excedido** - Acceso bloqueado
- ♾️ **Ilimitado** - Sin restricciones

## 🔧 **Configuración Necesaria**

### **1. Ejecutar SQL:**
```bash
# Copiar contenido de create_subscription_plans.sql
# Ejecutar en MySQL
```

### **2. Verificar Variables de Entorno:**
```bash
STRIPE_PRICE_SUB_2DAY=price_1RwLyk8WAF6l0p4eaF60CxC4
STRIPE_PRICE_SUB_5DAY=price_1RwM048WAF6l0p4edGLdFN52  
STRIPE_PRICE_SUB_UNLIMITED=price_1RwM1f8WAF6l0p4eFaJduOzi
```

## 🧪 **Cómo Probar**

### **Test de Límite "2 al día":**
1. Suscribirse al plan de 2 al día
2. Acceder a 2 pronósticos diferentes → ✅ Permitido
3. Intentar acceder al 3er pronóstico → ❌ Bloqueado
4. Verificar mensaje: "Has alcanzado tu límite diario"

### **Test de Plan Ilimitado:**
1. Suscribirse al plan ilimitado
2. Acceder a múltiples pronósticos → ✅ Siempre permitido
3. Verificar que no hay contador de límites

### **Test de Reset Diario:**
1. Con límite excedido hoy
2. Esperar hasta mañana (o cambiar fecha del sistema)
3. Verificar que el contador se resetea → ✅

## 📱 **Experiencia de Usuario**

### **Usuarios con Suscripción:**
- **Barra de progreso** visual del uso diario
- **Contador en tiempo real** de pronósticos restantes  
- **Advertencias** cuando se acerca al límite
- **Estado en navegación móvil** siempre visible

### **Usuarios sin Suscripción:**
- **Mensaje de upgrade** a suscripción
- **Enlace directo** a página de precios
- **Información clara** sobre beneficios

## 🎨 **Personalización**

### **Cambiar Límites:**
```sql
-- Modificar límites en la tabla
UPDATE subscription_plans 
SET daily_limit = 3 
WHERE name = '2 al día';
```

### **Agregar Nuevo Plan:**
```sql
INSERT INTO subscription_plans 
(name, stripe_price_id, daily_limit, price_cents, description)
VALUES 
('10 al día', 'price_new_plan', 10, 1999, '10 pronósticos diarios');
```

## 🚀 **Estado del Sistema**

✅ **Base de datos** - Tablas creadas  
✅ **Lógica de límites** - Implementada  
✅ **APIs actualizadas** - Con verificación  
✅ **UI components** - Agregados a páginas principales  
✅ **Navegación móvil** - Estado rápido integrado  

¡El sistema está listo para usar! 🎉
