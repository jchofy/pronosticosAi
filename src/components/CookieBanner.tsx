import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CookieBannerProps {
  isVisible: boolean;
  onAccept: (accepted: boolean) => void;
}

export const CookieBanner = ({ isVisible, onAccept }: CookieBannerProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCookieDecision = async (accepted: boolean) => {
    setIsLoading(true);
    
    try {
      // Save to database via API
      const response = await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accepted }),
      });

      if (response.ok) {
        onAccept(accepted);
      } else {
        console.error('Error saving cookie consent');
        // Fallback to localStorage if API fails
        localStorage.setItem('cookiesAccepted', accepted.toString());
        localStorage.setItem('cookiesAcceptedDate', new Date().toISOString());
        onAccept(accepted);
      }
    } catch (error) {
      console.error('Error handling cookie consent:', error);
      // Fallback to localStorage if API fails
      localStorage.setItem('cookiesAccepted', accepted.toString());
      localStorage.setItem('cookiesAcceptedDate', new Date().toISOString());
      onAccept(accepted);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <span className="text-2xl">🍪</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Uso de Cookies
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar el contenido. 
                  Al aceptar, nos ayudas a ofrecerte un mejor servicio.
                  <a 
                    href="/politica-cookies" 
                    className="text-brand-600 hover:text-brand-700 underline ml-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Más información
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => handleCookieDecision(false)}
              disabled={isLoading}
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {isLoading ? 'Guardando...' : 'Rechazar'}
            </Button>
            
            <Button
              onClick={() => handleCookieDecision(true)}
              disabled={isLoading}
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white"
            >
              {isLoading ? 'Guardando...' : 'Aceptar Cookies'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
