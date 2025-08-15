import { stripe } from '../../../lib/stripe.js';
import { query } from '../../../lib/db.js';
import { STRIPE_WEBHOOK_SECRET } from '../../../lib/env.js';

// Función auxiliar para procesar el evento checkout.session.completed
async function handleCheckoutCompleted(session) {
  console.log('🔄 Processing checkout completed:', session.id);
  console.log('📋 Session metadata:', session.metadata);
  
  const { type, userId, matchId } = session.metadata;

  if (type === 'match') {
    console.log('🏈 Processing match payment');
    // Activar pago del partido
    await query(
      'UPDATE payments SET status = ? WHERE stripe_checkout_id = ?',
      ['active', session.id]
    );
    console.log('✅ Match payment activated');
  } else if (type === 'subscription') {
    console.log('📅 Processing subscription payment');
    try {
      // Registrar nueva suscripción
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const endDate = new Date(subscription.current_period_end * 1000);
      
      console.log('💾 Saving subscription to database...');
      console.log('👤 User ID:', userId);
      console.log('🆔 Subscription ID:', subscription.id);
      console.log('📅 End date:', endDate);
      
      await query(
        'INSERT INTO payments (user_id, type, stripe_checkout_id, stripe_subscription_id, status, current_period_end) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'subscription', session.id, subscription.id, 'active', endDate]
      );
      console.log('✅ Subscription payment saved successfully');
    } catch (error) {
      console.error('❌ Error saving subscription:', error);
      throw error;
    }
  } else {
    console.log('⚠️ Unknown payment type:', type);
  }
}

// Función auxiliar para procesar el evento customer.subscription.updated
async function handleSubscriptionUpdated(subscription) {
  const endDate = new Date(subscription.current_period_end * 1000);
  
  // Determinar el estado basado en el estado de Stripe y si está cancelada
  let status = subscription.status;
  
  // Si la suscripción está activa pero marcada para cancelar al final del período
  if (subscription.status === 'active' && subscription.cancel_at_period_end) {
    // Mantener como 'active' hasta que realmente expire
    status = 'active';
  }
  
  await query(
    'UPDATE payments SET status = ?, current_period_end = ? WHERE stripe_subscription_id = ?',
    [status, endDate, subscription.id]
  );
  
  console.log(`✅ Subscription ${subscription.id} updated: ${status}, ends: ${endDate.toISOString()}`);
}

// Función auxiliar para procesar el evento customer.subscription.deleted
async function handleSubscriptionDeleted(subscription) {
  await query(
    'UPDATE payments SET status = "canceled", updated_at = NOW() WHERE stripe_subscription_id = ?',
    [subscription.id]
  );
}

// Función auxiliar para procesar el evento payment_intent.payment_failed
async function handlePaymentFailed(paymentIntent) {
  // Buscar la sesión asociada al payment intent
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent.id,
    limit: 1
  });

  if (sessions.data.length > 0) {
    const session = sessions.data[0];
    
    if (session.metadata.type === 'match') {
      await query(
        'UPDATE payments SET status = "expired" WHERE stripe_checkout_id = ?',
        [session.id]
      );
    }
    // Las suscripciones fallidas son manejadas por customer.subscription.updated
  }
}

export async function POST({ request }) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'missing_signature' }), 
        { status: 400 }
      );
    }

    // Verificar la firma del webhook
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'invalid_signature' }), 
        { status: 400 }
      );
    }

    // Procesar diferentes tipos de eventos
    console.log('🔄 Processing webhook event:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('🛍️ Checkout session completed');
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        console.log('🔄 Subscription updated');
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        console.log('❌ Subscription deleted');
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed');
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log('⚠️ Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }));
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'server_error' }), 
      { status: 500 }
    );
  }
}
