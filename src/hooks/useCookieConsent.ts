import { useState, useEffect } from 'react';

interface CookieConsentState {
  accepted: boolean | null;
  showBanner: boolean;
  isLoading: boolean;
}

export const useCookieConsent = () => {
  const [state, setState] = useState<CookieConsentState>({
    accepted: null,
    showBanner: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check if user has already made a cookie consent decision
    const checkCookieConsent = async () => {
      try {
        // console.log('🍪 Checking cookie consent...');
        // First check database
        const response = await fetch('/api/cookie-consent');
        
        if (response.ok) {
          const data = await response.json();
          // console.log('🍪 Database response:', data);
          
          if (data.accepted !== null && data.acceptedAt) {
            const acceptedTime = new Date(data.acceptedAt);
            const now = new Date();
            const daysSinceAcceptance = (now.getTime() - acceptedTime.getTime()) / (1000 * 60 * 60 * 24);
            
            // Cookie consent expires after 365 days for subjects, but not for users
            const isUserConsent = data.source === 'user';
            const shouldExpire = !isUserConsent && daysSinceAcceptance >= 365;
            
            if (!shouldExpire) {
              setState({
                accepted: data.accepted,
                showBanner: false,
                isLoading: false,
              });
              return;
            }
          }
        }
        
        // Fallback to localStorage if API fails
        const cookiesAccepted = localStorage.getItem('cookiesAccepted');
        const acceptedDate = localStorage.getItem('cookiesAcceptedDate');
        
        if (cookiesAccepted && acceptedDate) {
          const acceptedTime = new Date(acceptedDate);
          const now = new Date();
          const daysSinceAcceptance = (now.getTime() - acceptedTime.getTime()) / (1000 * 60 * 60 * 24);
          
          // Consent expires after 365 days
          if (daysSinceAcceptance < 365) {
            const accepted = cookiesAccepted === 'true';
            setState({
              accepted,
              showBanner: false,
              isLoading: false,
            });
            return;
          } else {
            // Consent expired, remove from localStorage
            localStorage.removeItem('cookiesAccepted');
            localStorage.removeItem('cookiesAcceptedDate');
          }
        }
        
        // No valid consent found, show banner
        // console.log('🍪 No valid consent found, showing banner');
        setState({
          accepted: null,
          showBanner: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('🍪 Error checking cookie consent:', error);
        
        // Fallback to localStorage on error
        try {
          const cookiesAccepted = localStorage.getItem('cookiesAccepted');
          const acceptedDate = localStorage.getItem('cookiesAcceptedDate');
          console.log('🍪 localStorage fallback:', { cookiesAccepted, acceptedDate });
          
          if (cookiesAccepted && acceptedDate) {
            const acceptedTime = new Date(acceptedDate);
            const now = new Date();
            const daysSinceAcceptance = (now.getTime() - acceptedTime.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceAcceptance < 365) {
              const accepted = cookiesAccepted === 'true';
              console.log('🍪 Using localStorage consent:', accepted);
              setState({
                accepted,
                showBanner: false,
                isLoading: false,
              });
              return;
            }
          }
        } catch {}
        
        console.log('🍪 Fallback: showing banner');
        setState({
          accepted: null,
          showBanner: true,
          isLoading: false,
        });
      }
    };

    // Small delay to avoid flash of content
    const timer = setTimeout(checkCookieConsent, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleConsent = (accepted: boolean) => {
    setState(prev => ({
      ...prev,
      accepted,
      showBanner: false,
    }));
  };

  const resetConsent = () => {
    localStorage.removeItem('cookiesAccepted');
    localStorage.removeItem('cookiesAcceptedDate');
    setState({
      accepted: null,
      showBanner: true,
      isLoading: false,
    });
  };

  return {
    ...state,
    handleConsent,
    resetConsent,
  };
};
