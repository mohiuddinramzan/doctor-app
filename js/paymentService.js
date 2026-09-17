/**
 * paymentService.js
 * ------------------------------------------------------------------
 * Abstraction over payment providers. Today this is a MOCK / DEMO
 * implementation only — no real transaction ever happens.
 *
 * To connect a real provider (bKash, Nagad, Stripe, SSLCommerz, etc):
 *   1. Replace the body of initializePayment() with a call to your
 *      backend, which in turn calls the provider's server-side API.
 *      NEVER put a secret/API key in this frontend file.
 *   2. Replace verifyPayment() with a call to your backend's
 *      verification endpoint (which itself calls the provider).
 *   3. Keep the same function signatures so the rest of the app
 *      (booking.js) does not need to change.
 * ------------------------------------------------------------------
 */

const PaymentService = (() => {
  const DEMO_LATENCY_MS = 900;

  function initializePayment({ method, amount, appointmentRef }) {
    // PRODUCTION: POST to your backend -> backend calls provider API
    // and returns a redirect URL or client token.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          transactionId: genId("TXN"),
          method,
          amount,
          appointmentRef,
          status: "initialized",
          demo: true
        });
      }, DEMO_LATENCY_MS);
    });
  }

  function verifyPayment(transactionId) {
    // PRODUCTION: ask your backend to verify with the provider using
    // a server-side secret, then return the authoritative status.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ transactionId, status: "success", verifiedAt: new Date().toISOString(), demo: true });
      }, DEMO_LATENCY_MS);
    });
  }

  function getPaymentStatus(transactionId) {
    // PRODUCTION: read-only status check against your backend.
    return Promise.resolve({ transactionId, status: "success", demo: true });
  }

  return { initializePayment, verifyPayment, getPaymentStatus };
})();
