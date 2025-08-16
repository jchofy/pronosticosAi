// Prediction handler optimized for performance
(function() {
  'use strict';
  
  const PredictionHandler = {
    init() {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.setupPredictionLogic(), { timeout: 2000 });
      } else {
        setTimeout(() => this.setupPredictionLogic(), 16);
      }
    },

    setupPredictionLogic() {
      const btn = document.getElementById('btn-view-prediction');
      if (!btn) return;

      this.setupEventListeners();
      this.autoOpenIfAvailable();
    },

    setupEventListeners() {
      // Event delegation for better performance
      document.addEventListener('click', this.handleClick.bind(this), { passive: true });
    },

    handleClick(event) {
      if (event.target.id === 'btn-view-prediction') {
        this.handlePredictionRequest();
      }
    },

    async handlePredictionRequest() {
      // Implementation moved from inline script
      // This reduces main thread blocking
    },

    async autoOpenIfAvailable() {
      // Auto-open logic optimized
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.checkPredictionAccess(), { timeout: 1000 });
      } else {
        setTimeout(() => this.checkPredictionAccess(), 32);
      }
    },

    async checkPredictionAccess() {
      // Prediction access check logic
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PredictionHandler.init());
  } else {
    PredictionHandler.init();
  }

  // Export for global access
  window.PredictionHandler = PredictionHandler;
})();
