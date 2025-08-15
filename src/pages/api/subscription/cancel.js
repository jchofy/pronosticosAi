import { stripe } from '../../../lib/stripe.js';
import { query } from '../../../lib/db.js';
import { getSession } from 'auth-astro/server';

/**
 * POST /api/subscription/cancel
 * Body: { subscriptionId: string }
 * Cancela una suscripción al final del período actual
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

    // Cancelar la suscripción en Stripe (al final del período)
    console.log('🔄 Canceling subscription:', subscriptionId);
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    console.log('✅ Subscription canceled successfully');

    // La actualización en la base de datos se hará via webhook
    // cuando Stripe envíe el evento customer.subscription.updated

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Suscripción cancelada. Tendrás acceso hasta el final del período actual.',
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: canceledSubscription.current_period_end
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Cancel subscription error:', error);
    
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
