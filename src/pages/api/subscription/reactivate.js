import { stripe } from '../../../lib/stripe.js';
import { query } from '../../../lib/db.js';
import { getSession } from 'auth-astro/server';

/**
 * POST /api/subscription/reactivate
 * Body: { subscriptionId: string }
 * Reactiva una suscripción que está marcada para cancelar
 */
export async function POST({ request }) {
  try {
    // Verificar autenticación
    const session = await getSession(request);
    if (!session?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }), 
        { status: 401 }
      );
    }

    // Obtener datos del request
    const { subscriptionId } = await request.json();
    
    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'subscription_id_required' }), 
        { status: 400 }
      );
    }

    // Verificar que el usuario sea dueño de la suscripción
    const users = await query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [session.user.email]
    );

    if (!users.length) {
      return new Response(
        JSON.stringify({ error: 'user_not_found' }), 
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Verificar que la suscripción pertenece al usuario
    const subscriptions = await query(
      'SELECT id FROM payments WHERE user_id = ? AND stripe_subscription_id = ? AND type = "subscription" LIMIT 1',
      [userId, subscriptionId]
    );

    if (!subscriptions.length) {
      return new Response(
        JSON.stringify({ error: 'subscription_not_found' }), 
        { status: 404 }
      );
    }

    // Reactivar la suscripción en Stripe
    console.log('🔄 Reactivating subscription:', subscriptionId);
    const reactivatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    console.log('✅ Subscription reactivated successfully');

    // La actualización en la base de datos se hará via webhook
    // cuando Stripe envíe el evento customer.subscription.updated

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Suscripción reactivada. Continuará renovándose automáticamente.',
        cancel_at_period_end: reactivatedSubscription.cancel_at_period_end,
        current_period_end: reactivatedSubscription.current_period_end
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Reactivate subscription error:', error);
    
    // Manejar errores específicos de Stripe
    if (error.type === 'StripeCardError') {
      return new Response(
        JSON.stringify({ error: 'payment_error', message: error.message }), 
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'server_error', 
        message: error.message || 'Error interno del servidor' 
      }), 
      { status: 500 }
    );
  }
}
