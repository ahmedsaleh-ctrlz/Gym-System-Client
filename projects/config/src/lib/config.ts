const apiBaseUrl = 'https://localhost:7022';

export const appConfig = {
  apiBaseUrl,
  apiUrl: `${apiBaseUrl}/api/v1`,
  apiUrlV2: `${apiBaseUrl}/api/v2`,
  // Set this to the Stripe publishable key for the environment.
  stripePublishableKey:
    'pk_test_51Tkz731Ib3k691E77uYykLRchBuXqRO3LgZVLPGDzHSVVxh5iNy2rxCDcbpwLjhn53S5sqZRzXK41UDhxNL4LrZr005oiwDqIQ',
};
