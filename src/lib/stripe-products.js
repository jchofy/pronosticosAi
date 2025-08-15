import { stripe } from './stripe.js';

/**
 * Obtiene todos los productos activos de Stripe con sus precios
 */
export async function getStripeProducts() {
  try {
    // Obtener todos los productos activos
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });

    // Obtener todos los precios activos
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    });

    // Mapear productos con sus precios
    const productsWithPrices = products.data.map(product => {
      const productPrices = prices.data.filter(price => price.product.id === product.id);
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        prices: productPrices.map(price => ({
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval || null,
          intervalCount: price.recurring?.interval_count || null,
          type: price.type, // 'one_time' or 'recurring'
        }))
      };
    });

    // Separar productos de suscripción y productos individuales
    const subscriptionProducts = productsWithPrices.filter(product => 
      product.prices.some(price => price.type === 'recurring')
    );

    const oneTimeProducts = productsWithPrices.filter(product => 
      product.prices.some(price => price.type === 'one_time')
    );

    return {
      subscriptions: subscriptionProducts,
      oneTime: oneTimeProducts,
      all: productsWithPrices
    };

  } catch (error) {
    console.error('Error fetching Stripe products:', error);
    throw new Error('Unable to fetch products');
  }
}

/**
 * Formatea el precio para mostrar
 */
export function formatPrice(amount, currency = 'eur') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(amount / 100); // Stripe maneja centavos
}

/**
 * Obtiene el texto descriptivo del intervalo de suscripción
 */
export function getIntervalText(interval, intervalCount = 1) {
  const intervals = {
    day: intervalCount === 1 ? 'día' : `${intervalCount} días`,
    week: intervalCount === 1 ? 'semana' : `${intervalCount} semanas`,
    month: intervalCount === 1 ? 'mes' : `${intervalCount} meses`,
    year: intervalCount === 1 ? 'año' : `${intervalCount} años`
  };

  return intervals[interval] || interval;
}

/**
 * Determina el plan basado en metadata o nombre del producto
 */
export function getPlanType(product) {
  // Primero intentar por metadata
  if (product.metadata?.plan_type) {
    return product.metadata.plan_type;
  }

  // Luego por nombre del producto
  const name = product.name.toLowerCase();
  
  // Detectar partidos individuales
  if (name.includes('partido individual') || 
      name.includes('partido') && name.includes('individual') ||
      name.includes('match')) return 'match';
      
  // Detectar planes de suscripción
  if (name.includes('2') && name.includes('día')) return '2day';
  if (name.includes('5') && name.includes('día')) return '5day';
  if (name.includes('ilimitado') || name.includes('unlimited')) return 'unlimited';

  return 'unknown';
}

/**
 * Ordena los productos según prioridad de display
 */
export function sortProducts(products) {
  const order = { '2day': 1, '5day': 2, 'unlimited': 3, 'match': 4 };
  
  return products.sort((a, b) => {
    const typeA = getPlanType(a);
    const typeB = getPlanType(b);
    return (order[typeA] || 999) - (order[typeB] || 999);
  });
}
