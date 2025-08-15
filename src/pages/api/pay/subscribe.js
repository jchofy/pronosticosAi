import { stripe } from '../../../lib/stripe.js';
import { 
  SITE_URL,
  STRIPE_PRICE_SUB_2DAY,
  STRIPE_PRICE_SUB_5DAY,
  STRIPE_PRICE_SUB_UNLIMITED
} from '../../../lib/env.js';
import { query } from '../../../lib/db.js';
import { getSession } from 'auth-astro/server';

/**
 * POST /api/pay/subscribe
 * Body: { plan: 'month' | 'year' }
 * Returns JSON { url: string }
 */
export async function POST({ request }) {
  try {
    const { plan, priceId: requestPriceId } = await request.json();
    
    let priceId = requestPriceId; // Usar el priceId enviado desde el frontend si está disponible
    
    // Fallback a los precios hardcodeados si no se proporciona priceId
    if (!priceId) {
      switch(plan) {
        case '2day':
          priceId = STRIPE_PRICE_SUB_2DAY;
          break;
        case '5day':
          priceId = STRIPE_PRICE_SUB_5DAY;
          break;
        case 'unlimited':
          priceId = STRIPE_PRICE_SUB_UNLIMITED;
          break;
        default:
          return new Response(JSON.stringify({ error: 'invalid_plan' }), { status: 400 });
      }
    }

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'price_not_configured' }), { status: 500 });
    }

    // Verificar sesión
    const session = await getSession(request);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    // Obtener datos del usuario
    let users = await query('SELECT id, name, email FROM users WHERE email = ? LIMIT 1', [session.user.email]);
    
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
        users = await query('SELECT id, name, email FROM users WHERE id = ? LIMIT 1', [newUserId]);
      } catch (createError) {
        console.error('❌ Failed to create user:', createError);
        return new Response(JSON.stringify({ error: 'user_creation_failed' }), { status: 500 });
      }
    }
    
    const user = users[0];
    const userId = user.id;
    const userEmail = user.email;
    const userName = user.name;

    // Ensure we have a Stripe customer ID
    const rows = await query('SELECT stripe_customer_id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'user_not_found' }), { status: 400 });
    }
    let customerId = rows[0].stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: userEmail || undefined, name: userName || undefined, metadata: { userId } });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, userId]);
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: { userId, plan, type: 'subscription' },
      success_url: `${SITE_URL}/cuenta?checkout=success`,
      cancel_url: `${SITE_URL}/cuenta?checkout=canceled`,
    });

    return new Response(JSON.stringify({ url: checkout.url }), { status: 200 });
  } catch (e) {
    console.error('Subscribe error', e);
    return new Response(JSON.stringify({ error: 'server_error', message: e?.message ?? '' }), { status: 500 });
  }
}
