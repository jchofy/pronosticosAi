import { query } from './db.js';

/**
 * Obtiene el ID del usuario por email
 */
export async function getUserIdFromEmail(email) {
  if (!email) return null;
  const users = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  return users.length > 0 ? users[0].id : null;
}

/**
 * Obtiene la información del plan de suscripción del usuario
 */
export async function getUserSubscriptionPlan(userId) {
  if (!userId) return null;

  // Get user subscription plan

  // Check for active subscriptions

  // Primero obtenemos la suscripción activa del usuario
  const results = await query(`
    SELECT 
      id as payment_id,
      stripe_subscription_id,
      status,
      current_period_end
    FROM payments
    WHERE user_id = ? 
      AND type = 'subscription'
      AND status = 'active'
      AND current_period_end > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId]);

  // Check if user has active subscription

  if (results.length === 0) {
    // Si no hay suscripción activa, verificar si hay una sin current_period_end
    const subscriptionWithoutDate = await query(`
      SELECT 
        id as payment_id,
        stripe_subscription_id,
        status,
        current_period_end
      FROM payments
      WHERE user_id = ? 
        AND type = 'subscription'
        AND status = 'active'
        AND current_period_end IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);
    
    console.log('🔍 Subscription without date:', subscriptionWithoutDate);
    
    if (subscriptionWithoutDate.length > 0) {
      const sub = subscriptionWithoutDate[0];
      try {
        // Obtener datos actualizados de Stripe
        const { stripe } = await import('./stripe.js');
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        const endDate = new Date(stripeSubscription.current_period_end * 1000);
        
        console.log('🔄 Updating subscription with correct end date:', endDate);
        
        // Actualizar la fecha en la base de datos
        await query(
          'UPDATE payments SET current_period_end = ? WHERE id = ?',
          [endDate, sub.payment_id]
        );
        
        // Verificar si la suscripción sigue siendo válida
        if (endDate > new Date()) {
          // Crear un resultado para devolver
          const updatedSubscription = {
            payment_id: sub.payment_id,
            stripe_subscription_id: sub.stripe_subscription_id,
            status: sub.status,
            current_period_end: endDate
          };
          
          console.log('✅ Subscription updated and valid:', updatedSubscription);
          
          // Continuar con el procesamiento usando esta suscripción
          const subscription = updatedSubscription;
          
          // Obtener el plan basado en el stripe_subscription_id desde Stripe
          try {
            const priceId = stripeSubscription.items.data[0]?.price?.id;
            
            if (priceId) {
              const plan = await getPlanByStripePrice(priceId);
              if (plan) {
                return {
                  ...subscription,
                  plan_id: plan.id,
                  plan_name: plan.name,
                  daily_limit: plan.daily_limit,
                  stripe_price_id: plan.stripe_price_id
                };
              }
            }
          } catch (error) {
            console.error('Error fetching Stripe subscription:', error);
          }

          // Fallback: inferir plan basado en price IDs conocidos del .env
          return await inferPlanFromEnv(subscription);
        }
      } catch (error) {
        console.error('Error updating subscription date:', error);
      }
    }
    
    return null;
  }

  const subscription = results[0];

  // Obtener el plan basado en el stripe_subscription_id
  // Necesitamos obtener el price_id desde Stripe y luego buscar en nuestra tabla
  try {
    const { stripe } = await import('./stripe.js');
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    
    if (priceId) {
      const plan = await getPlanByStripePrice(priceId);
      if (plan) {
        return {
          ...subscription,
          plan_id: plan.id,
          plan_name: plan.name,
          daily_limit: plan.daily_limit,
          stripe_price_id: plan.stripe_price_id
        };
      }
    }
  } catch (error) {
    console.error('Error fetching Stripe subscription:', error);
  }

  // Fallback: inferir plan basado en price IDs conocidos del .env
  return await inferPlanFromEnv(subscription);
}

/**
 * Obtiene el plan basado en el stripe_price_id
 */
export async function getPlanByStripePrice(stripePriceId) {
  const results = await query(`
    SELECT id, name, daily_limit, stripe_price_id
    FROM subscription_plans 
    WHERE stripe_price_id = ? AND is_active = TRUE
    LIMIT 1
  `, [stripePriceId]);

  return results.length > 0 ? results[0] : null;
}

/**
 * Obtiene el uso diario actual del usuario
 */
export async function getDailyUsage(userId, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const results = await query(`
    SELECT predictions_used 
    FROM daily_usage 
    WHERE user_id = ? AND date_used = ?
    LIMIT 1
  `, [userId, targetDate]);

  return results.length > 0 ? results[0].predictions_used : 0;
}

/**
 * Incrementa el uso diario del usuario
 */
export async function incrementDailyUsage(userId, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  await query(`
    INSERT INTO daily_usage (user_id, date_used, predictions_used) 
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE 
      predictions_used = predictions_used + 1,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, targetDate]);
}

/**
 * Verifica si el usuario puede acceder a un pronóstico
 */
export async function canUserAccessPrediction(userId) {
  if (!userId) return { allowed: false, reason: 'not_logged_in' };

  // 1. Verificar si tiene una suscripción activa
  const subscription = await getUserSubscriptionPlan(userId);
  
  if (!subscription) {
    return { 
      allowed: false, 
      reason: 'no_subscription',
      message: 'No tiene suscripción activa'
    };
  }

  // 2. Si es ilimitado, permitir siempre
  if (subscription.daily_limit === null) {
    return { 
      allowed: true, 
      reason: 'unlimited',
      plan_name: subscription.plan_name 
    };
  }

  // 3. Verificar uso diario
  const today = new Date().toISOString().split('T')[0];
  const dailyUsage = await getDailyUsage(userId, today);

  if (dailyUsage >= subscription.daily_limit) {
    return { 
      allowed: false, 
      reason: 'daily_limit_exceeded',
      used: dailyUsage,
      limit: subscription.daily_limit,
      plan_name: subscription.plan_name
    };
  }

  return { 
    allowed: true, 
    reason: 'within_limit',
    used: dailyUsage,
    limit: subscription.daily_limit,
    plan_name: subscription.plan_name
  };
}

/**
 * Registra el acceso a un pronóstico y actualiza el contador
 */
export async function recordPredictionAccess(userId) {
  if (!userId) return false;

  // Verificar que puede acceder
  const access = await canUserAccessPrediction(userId);
  
  if (!access.allowed) {
    return false;
  }

  // Si es ilimitado, no necesitamos contar
  if (access.reason === 'unlimited') {
    return true;
  }

  // Incrementar contador
  await incrementDailyUsage(userId);
  return true;
}

/**
 * Función auxiliar para inferir el plan basado en variables de entorno
 */
async function inferPlanFromEnv(subscription) {
  const { 
    STRIPE_PRICE_SUB_2DAY, 
    STRIPE_PRICE_SUB_5DAY, 
    STRIPE_PRICE_SUB_UNLIMITED 
  } = await import('./env.js');

  try {
    const { stripe } = await import('./stripe.js');
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    
    let planInfo = { plan_name: 'Desconocido', daily_limit: null };
    
    if (priceId === STRIPE_PRICE_SUB_2DAY) {
      planInfo = { plan_name: '2 al día', daily_limit: 2 };
    } else if (priceId === STRIPE_PRICE_SUB_5DAY) {
      planInfo = { plan_name: '5 al día', daily_limit: 5 };
    } else if (priceId === STRIPE_PRICE_SUB_UNLIMITED) {
      planInfo = { plan_name: 'Ilimitado', daily_limit: null };
    }
    
    return {
      ...subscription,
      ...planInfo,
      stripe_price_id: priceId
    };
  } catch (error) {
    console.error('Error inferring plan:', error);
    return {
      ...subscription,
      plan_name: 'Desconocido',
      daily_limit: null
    };
  }
}

/**
 * Obtiene estadísticas de uso para mostrar al usuario
 */
export async function getUserUsageStats(userId) {
  if (!userId) return null;

  const subscription = await getUserSubscriptionPlan(userId);
  if (!subscription) return null;

  const today = new Date().toISOString().split('T')[0];
  const dailyUsage = await getDailyUsage(userId, today);

  return {
    plan_name: subscription.plan_name,
    daily_limit: subscription.daily_limit,
    used_today: dailyUsage,
    remaining: subscription.daily_limit ? Math.max(0, subscription.daily_limit - dailyUsage) : null,
    is_unlimited: subscription.daily_limit === null
  };
}
