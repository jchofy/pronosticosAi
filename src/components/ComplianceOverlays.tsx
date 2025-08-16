import { useAgeVerification } from '@/hooks/useAgeVerification';
import { useSyncAgeVerification } from '@/hooks/useSyncAgeVerification';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useSyncCookieConsent } from '@/hooks/useSyncCookieConsent';
import { AgeVerificationModal } from './AgeVerificationModal';
import { CookieBanner } from './CookieBanner';

/**
 * Componente que solo maneja modales y banners de cumplimiento legal
 * NO envuelve el contenido principal para evitar interferencias con JavaScript nativo
 */
export const ComplianceOverlays = () => {
  const { 
    isVerified, 
    showModal: showAgeModal, 
    isLoading: isLoadingAge, 
    handleVerification 
  } = useAgeVerification();
  
  const { 
    accepted: cookiesAccepted, 
    showBanner: showCookieBanner, 
    isLoading: isLoadingCookies, 
    handleConsent 
  } = useCookieConsent();
  
  // Automatically sync both age verification and cookies when user logs in/out
  useSyncAgeVerification();
  useSyncCookieConsent();

  // Determine if we should show cookie banner (only after age is verified and user is of age)
  const shouldShowCookieBanner = (isVerified === true || isVerified === 1) && showCookieBanner && !showAgeModal;

  // Show loading overlay while checking verification status
  if (isLoadingAge || isLoadingCookies) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show restriction overlay if user is not of age
  if (isVerified === false || isVerified === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Acceso Restringido
          </h1>
          <p className="text-gray-600 mb-6">
            Lo sentimos, pero debes ser mayor de 18 años para acceder a esta aplicación de pronósticos deportivos.
          </p>
          <p className="text-sm text-gray-500">
            Esta restricción es por motivos legales y de responsabilidad.
          </p>
        </div>
      </div>
    );
  }

  // Only render overlays, not content
  return (
    <>
      <AgeVerificationModal 
        isOpen={showAgeModal} 
        onVerification={handleVerification} 
      />
      <CookieBanner 
        isVisible={shouldShowCookieBanner} 
        onAccept={handleConsent} 
      />
    </>
  );
};
