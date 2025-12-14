// Provider factory for QRIS implementations
const providerName = (process.env.QRIS_PROVIDER || 'mock').toLowerCase();
let provider;
try {
  provider = require(`./providers/${providerName}`);
} catch (e) {
  // fallback to mock if provider module not found
  provider = require('./providers/mock');
}

// Expose a consistent interface: createPayment, confirmPayment, handleCallback (optional)
module.exports = {
  createPayment: async (...args) => provider.createPayment(...args),
  confirmPayment: async (...args) => provider.confirmPayment(...args),
  handleCallback: provider.handleCallback || null,
};
