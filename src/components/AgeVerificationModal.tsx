import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AgeVerificationModalProps {
  isOpen: boolean;
  onVerification: (isOfAge: boolean) => void;
}

export const AgeVerificationModal = ({ isOpen, onVerification }: AgeVerificationModalProps) => {
  const handleAgeVerification = async (isOfAge: boolean) => {
    try {
      // Save to database via API
      const response = await fetch('/api/age-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isOfAge }),
      });

      if (response.ok) {
        onVerification(isOfAge);
      } else {
        console.error('Error saving age verification');
        // Fallback to localStorage if API fails
        localStorage.setItem('ageVerified', isOfAge.toString());
        localStorage.setItem('ageVerificationDate', new Date().toISOString());
        onVerification(isOfAge);
      }
    } catch (error) {
      console.error('Error verifying age:', error);
      // Fallback to localStorage if API fails
      localStorage.setItem('ageVerified', isOfAge.toString());
      localStorage.setItem('ageVerificationDate', new Date().toISOString());
      onVerification(isOfAge);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-[425px]" onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-brand-700">
            🔞 Verificación de Edad
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Para acceder a esta aplicación de pronósticos deportivos, debes confirmar que eres mayor de edad.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="text-sm text-gray-700 text-center mb-4">
            <strong>Confirma tu edad:</strong>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={() => handleAgeVerification(true)}
              className="w-full p-4 h-auto bg-brand-600 hover:bg-brand-700 text-white"
            >
              <div className="text-center">
                <div className="text-base font-semibold">✅ Soy mayor de 18 años</div>
                <div className="text-sm opacity-90">Confirmar acceso</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleAgeVerification(false)}
              className="w-full p-4 h-auto border-red-200 text-red-700 hover:bg-red-50"
            >
              <div className="text-center">
                <div className="text-base font-semibold">❌ Soy menor de 18 años</div>
                <div className="text-sm opacity-70">No puedo acceder</div>
              </div>
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-center mt-4">
            Esta información se almacena de forma segura y solo se usa para verificar que cumples con los requisitos legales.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
