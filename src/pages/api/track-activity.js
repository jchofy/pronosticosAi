import { logButtonClick, logPageVisit, ActivityType } from '../../lib/telegram-logger.js';

/**
 * API endpoint for client-side activity tracking
 * Receives tracking data from the browser and logs it to Telegram
 */

// In-memory cache for deduplication (in production, use Redis or similar)
const eventCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

// Clean cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of eventCache.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      eventCache.delete(key);
    }
  }
}, 10000); // Clean every 10 seconds

export async function POST({ request, clientAddress }) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    // Extract request info
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || 
               clientAddress || 
               'unknown';

    // Add request info to data
    const trackingData = {
      ...data,
      userAgent,
      ip: ip.split(',')[0].trim()
    };

    // Create deduplication key
    const timestamp = Math.floor(Date.now() / 1000); // Round to seconds
    const dedupeKey = `${type}-${trackingData.page}-${trackingData.ip}-${timestamp}`;
    
    // For page_visit events, add additional specificity to prevent legitimate navigation from being blocked
    let finalKey = dedupeKey;
    if (type === 'page_visit') {
      finalKey = `${dedupeKey}-${trackingData.title ? trackingData.title.slice(0, 20) : 'notitle'}`;
    }
    
    // Check if we've seen this event recently
    if (eventCache.has(finalKey)) {
      console.log('Duplicate event prevented:', finalKey);
      return new Response(JSON.stringify({ success: true, deduplicated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Record this event
    eventCache.set(finalKey, Date.now());

    // Route to appropriate logging function based on type
    switch (type) {
      case 'button_click':
      case 'form_submission':
        await logButtonClick(trackingData);
        break;
      
      case 'page_visit':
        await logPageVisit({
          ...trackingData,
          details: trackingData.title ? `Título: ${trackingData.title}` : undefined
        });
        break;
      
      case 'page_duration':
        await logPageVisit({
          ...trackingData,
          details: `Página visitada por ${Math.round(trackingData.duration / 1000)}s`
        });
        break;
      
      default:
        // Generic activity logging
        await logPageVisit(trackingData);
        break;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in track-activity API:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
