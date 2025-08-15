# 🔐 Flujo de Acceso a Pronósticos

## 📋 **Nueva Lógica de Acceso**

### **Orden de Prioridad:**

1. **⭐ Suscripción** (USUARIOS LOGUEADOS CON PLAN)
   - Si tienes suscripción, la usas directamente
   - Respeta límites: 2/día, 5/día, ilimitado
   - NO usa el gratuito diario

2. **🎁 Pronóstico Gratuito Diario** (SIN SUSCRIPCIÓN)
   - Solo para usuarios sin suscripción activa
   - 1 por día (anónimos o logueados sin plan)
   - Controlado por `daily_free_uses` y `daily_ipua_uses`

3. **💳 Compra Individual**
   - Para partidos específicos
   - Sin límites una vez comprado
   - Acceso permanente al partido

4. **❌ Sin Acceso**
   - Invitación a suscribirse o comprar

## 🎯 **Componente Principal: PredictionAccessButton**

### **Estados Posibles:**

#### **✅ Acceso Garantizado:**
- Ya compró el partido individual
- Muestra directamente el pronóstico

#### **🔓 Opciones de Desbloqueo:**
- **Botón Verde**: "Usar Pronóstico Gratuito Diario"
- **Botón Azul**: "Usar Suscripción (X restantes hoy)"
- **Botón Morado**: "Comprar este partido (€2.59)"
- **Botón Naranja**: "Ver Planes de Suscripción"

#### **⚠️ Límites Alcanzados:**
- Gratuito ya usado
- Suscripción al límite diario
- Solo opción: compra individual

## 🔧 **Implementación Técnica**

### **API `/api/predictions/access`:**
```javascript
// Flujo actualizado:
1. Verificar daily_free PRIMERO
2. Si no disponible, verificar suscripción
3. Si no disponible, verificar compra individual
4. Si nada, devolver payment_required
```

### **API `/api/predictions/[matchId]`:**
```javascript
// Solo devuelve predicción SI:
1. Ya se desbloqueó via /access
2. O tiene compra individual del partido
3. O es Googlebot
```

### **Base de Datos:**
- `daily_free_uses` - Control de gratuito diario
- `daily_usage` - Control de límites de suscripción
- `payments` - Suscripciones y compras individuales

## 🎨 **Experiencia de Usuario**

### **Usuario CON Suscripción:**
1. Usuario ve partido bloqueado
2. Botón azul: "Usar Suscripción (4 restantes hoy)"
3. Click → desbloquea y muestra pronóstico
4. Mensaje: "Usando suscripción Plan 5 al día"

### **Usuario SIN Suscripción (primera visita):**
1. Usuario ve partido bloqueado
2. Botón verde: "Pronóstico Gratuito Diario"
3. Click → desbloquea y muestra pronóstico
4. Mensaje: "Acceso gratuito diario usado"

### **Límite de Suscripción Alcanzado:**
1. Usuario ve partido bloqueado
2. Solo botón morado: "Comprar este partido"
3. O botón naranja: "Upgrade de suscripción"

### **Sin Suscripción:**
1. Después del gratuito → botones de compra y suscripción
2. Clara diferenciación de opciones

## 🧪 **Casos de Prueba**

### **Test 1: Usuario Nuevo**
1. Visita partido → ve botón gratuito ✅
2. Usa gratuito → ve pronóstico ✅
3. Visita otro partido → ve opciones de pago ✅

### **Test 2: Suscripción 2 al día**
1. Usa gratuito en partido 1 ✅
2. Usa suscripción en partido 2 (1/2) ✅
3. Usa suscripción en partido 3 (2/2) ✅
4. Partido 4 → solo compra individual ✅

### **Test 3: Suscripción Ilimitada**
1. Usa gratuito en partido 1 ✅
2. Acceso ilimitado en resto ✅

## 📱 **Integración en Páginas**

### **Página de Partido (`/partido/[slug]`):**
```astro
<PredictionAccessButton matchId={match.id} />
```

### **Reemplaza a:**
- Mostrar pronóstico directamente
- MatchPurchaseButton básico
- Lógica manual de acceso

## 🎯 **Beneficios del Nuevo Sistema**

1. **✅ Respeta flujo gratuito** existente
2. **✅ Clara diferenciación** de tipos de acceso
3. **✅ Control granular** de límites
4. **✅ Mejor UX** con mensajes específicos
5. **✅ Menos confusión** sobre qué se está usando

¡El sistema ahora funciona exactamente como debe! 🎉
