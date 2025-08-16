import { useState, useEffect } from 'react';

interface AgeVerificationState {
  isVerified: boolean | null;
  showModal: boolean;
  isLoading: boolean;
}

export const useAgeVerification = () => {
  const [state, setState] = useState<AgeVerificationState>({
    isVerified: null,
    showModal: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check if user has already been verified
    const checkAgeVerification = async () => {
      try {
        // First check database
        const response = await fetch('/api/age-verification');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.verified !== null && data.verifiedAt) {
            const verificationTime = new Date(data.verifiedAt);
            const now = new Date();
            const hoursSinceVerification = (now.getTime() - verificationTime.getTime()) / (1000 * 60 * 60);
            
            // Verification expires after 24 hours for subjects, but not for users
            const isUserVerification = data.source === 'user';
            const shouldExpire = !isUserVerification && hoursSinceVerification >= 24;
            
            if (!shouldExpire) {
              setState({
                isVerified: data.verified,
                showModal: false,
                isLoading: false,
              });
              return;
            }
          }
        }
        
        // Fallback to localStorage if API fails
        const ageVerified = localStorage.getItem('ageVerified');
        const verificationDate = localStorage.getItem('ageVerificationDate');
        
        if (ageVerified && verificationDate) {
          const verificationTime = new Date(verificationDate);
          const now = new Date();
          const hoursSinceVerification = (now.getTime() - verificationTime.getTime()) / (1000 * 60 * 60);
          
          // Verification expires after 24 hours
          if (hoursSinceVerification < 24) {
            const isVerified = ageVerified === 'true';
            setState({
              isVerified,
              showModal: false,
              isLoading: false,
            });
            return;
          } else {
            // Verification expired, remove from localStorage
            localStorage.removeItem('ageVerified');
            localStorage.removeItem('ageVerificationDate');
          }
        }
        
        // No valid verification found, show modal
        setState({
          isVerified: null,
          showModal: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error checking age verification:', error);
        
        // Fallback to localStorage on error
        try {
          const ageVerified = localStorage.getItem('ageVerified');
          const verificationDate = localStorage.getItem('ageVerificationDate');
          
          if (ageVerified && verificationDate) {
            const verificationTime = new Date(verificationDate);
            const now = new Date();
            const hoursSinceVerification = (now.getTime() - verificationTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceVerification < 24) {
              const isVerified = ageVerified === 'true';
              setState({
                isVerified,
                showModal: false,
                isLoading: false,
              });
              return;
            }
          }
        } catch {}
        
        setState({
          isVerified: null,
          showModal: true,
          isLoading: false,
        });
      }
    };

    // Small delay to avoid flash of content
    const timer = setTimeout(checkAgeVerification, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleVerification = (isOfAge: boolean) => {
    setState(prev => ({
      ...prev,
      isVerified: isOfAge,
      showModal: false,
    }));
  };

  const resetVerification = () => {
    localStorage.removeItem('ageVerified');
    localStorage.removeItem('ageVerificationDate');
    setState({
      isVerified: null,
      showModal: true,
      isLoading: false,
    });
  };

  return {
    ...state,
    handleVerification,
    resetVerification,
  };
};
