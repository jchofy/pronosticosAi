import { useEffect } from 'react';

/**
 * Hook que sincroniza el consentimiento de cookies cuando un usuario se loguea
 * Se ejecuta automáticamente cuando detecta cambios en el estado de autenticación
 */
export const useSyncCookieConsent = () => {
  useEffect(() => {
    const syncCookieConsent = async () => {
      try {
        // Check if there's a user session
        const response = await fetch('/api/auth/session');
        
        if (response.ok) {
          const session = await response.json();
          
          // If user is authenticated, sync cookie consent
          if (session?.user?.email) {
            await fetch('/api/sync-cookie-consent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
        }
      } catch (error) {
        console.error('Error syncing cookie consent:', error);
      }
    };

    // Sync on component mount
    syncCookieConsent();

    // Listen for auth state changes (login/logout events)
    const handleAuthChange = () => {
      setTimeout(syncCookieConsent, 100); // Small delay to ensure session is updated
    };

    // Listen for storage events (in case of login in another tab)
    window.addEventListener('storage', handleAuthChange);
    
    // Listen for custom auth events if your app dispatches them
    window.addEventListener('auth:login', handleAuthChange);
    window.addEventListener('auth:logout', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth:login', handleAuthChange);
      window.removeEventListener('auth:logout', handleAuthChange);
    };
  }, []);
};

/**
 * Function to manually trigger cookie consent sync
 * Useful to call after login/registration
 */
export const triggerCookieConsentSync = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/sync-cookie-consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.success;
    }
    
    return false;
  } catch (error) {
    console.error('Error triggering cookie consent sync:', error);
    return false;
  }
};
