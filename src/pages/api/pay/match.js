import { getSession } from 'auth-astro/server';
import { stripe } from '../../../lib/stripe.js';
import { query } from '../../../lib/db.js';
import { STRIPE_PRICE_MATCH, SITE_URL } from '../../../lib/env.js';

export async function POST({ request }) {
  try {
    console.log('🏈 Match purchase request started');
    
    // Verificar sesión
    const session = await getSession(request);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return new Response(
        JSON.stringify({ error: 'authentication_required' }), 
        { status: 401 }
      );
    }
    console.log('✅ User authenticated:', session.user.email);

    // Obtener datos del request
    const { matchId } = await request.json();
    console.log('📝 Request data:', { matchId });
    
    if (!matchId) {
      console.log('❌ No matchId provided');
      return new Response(
        JSON.stringify({ error: 'match_id_required' }), 
        { status: 400 }
      );
    }

    // Verificar que el partido existe y está disponible
    console.log('🔍 Checking match exists:', matchId);
    const matches = await query(
      'SELECT id, slug FROM matches WHERE id = ? AND prediccion = "1" AND date > NOW() LIMIT 1',
      [matchId]
    );
    console.log('📊 Match query result:', matches);
    
    if (!matches.length) {
      console.log('❌ Match not found or not available');
      return new Response(
        JSON.stringify({ error: 'match_not_found' }), 
        { status: 404 }
      );
    }
    const match = matches[0];
    console.log('✅ Match found:', match);

    // Obtener datos del usuario
    console.log('👤 Getting user data for:', session.user.email);
    let users = await query(
      'SELECT id, stripe_customer_id FROM users WHERE email = ? LIMIT 1',
      [session.user.email]
    );
    
    // Si el usuario no existe en la BD pero tiene sesión válida, créalo
    if (!users.length) {
      console.log('🆕 User not found in database, creating...');
      try {
        const result = await query(
          'INSERT INTO users (email, name, image) VALUES (?, ?, ?)',
          [session.user.email, session.user.name || '', session.user.image || null]
        );
        const newUserId = result.insertId;
        console.log('✅ User created with ID:', newUserId);
        
        // Refetch the user
        users = await query(
          'SELECT id, stripe_customer_id FROM users WHERE id = ? LIMIT 1',
          [newUserId]
        );
      } catch (createError) {
        console.error('❌ Failed to create user:', createError);
        return new Response(
          JSON.stringify({ error: 'user_creation_failed' }), 
          { status: 500 }
        );
      }
    }
    
    const user = users[0];
    console.log('✅ User found/created:', user.id);

    // Verificar si el usuario ya compró este partido
    console.log('🔍 Checking existing purchase...');
    const existingPurchase = await query(
      'SELECT id FROM payments WHERE user_id = ? AND match_id = ? AND status = "active" LIMIT 1',
      [user.id, matchId]
    );
    console.log('📊 Existing purchase check:', existingPurchase);

    if (existingPurchase.length) {
      console.log('❌ User already purchased this match');
      return new Response(
        JSON.stringify({ error: 'already_purchased' }), 
        { status: 409 }
      );
    }
    
    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          userId: user.id
        }
      });
      stripeCustomerId = customer.id;
      await query(
        'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
        [stripeCustomerId, user.id]
      );
    }

    // Verificar que el precio esté configurado
    if (!STRIPE_PRICE_MATCH) {
      console.log('❌ STRIPE_PRICE_MATCH not configured');
      return new Response(
        JSON.stringify({ error: 'price_not_configured' }), 
        { status: 500 }
      );
    }
    console.log('💰 Using price ID:', STRIPE_PRICE_MATCH);

    // Crear Stripe Checkout Session
    console.log('🛒 Creating Stripe checkout session...');
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price: STRIPE_PRICE_MATCH,
          quantity: 1
        }],
        success_url: `${SITE_URL}/partido/${encodeURIComponent(match.slug)}?payment=success&matchId=${matchId}`,
        cancel_url: `${SITE_URL}/partido/${encodeURIComponent(match.slug)}?payment=cancelled&matchId=${matchId}`,
        metadata: {
          matchId: matchId,
          userId: user.id,
          type: 'match'
        }
      });
    } catch (stripeError) {
      console.error('❌ Stripe checkout creation failed:', stripeError);
      throw stripeError;
    }

    console.log('✅ Checkout session created:', checkoutSession.id);

    // Registrar intento de pago
    console.log('💾 Saving payment record...');
    try {
      await query(
        'INSERT INTO payments (user_id, type, stripe_checkout_id, match_id, status) VALUES (?, ?, ?, ?, ?)',
        [user.id, 'match', checkoutSession.id, matchId, 'incomplete']
      );
      console.log('✅ Payment record saved');
    } catch (dbError) {
      console.error('❌ Database insert failed:', dbError);
      throw dbError;
    }

    console.log('🎯 Returning checkout URL:', checkoutSession.url);
    return new Response(
      JSON.stringify({ 
        checkoutUrl: checkoutSession.url 
      })
    );

  } catch (error) {
    console.error('🚨 Payment error details:');
    console.error('- Error message:', error.message);
    console.error('- Error stack:', error.stack);
    console.error('- Error code:', error.code);
    console.error('- Full error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'server_error',
        details: error.message // Solo en desarrollo
      }), 
      { status: 500 }
    );
  }
}
