import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';

export interface AppConfig {
  /**
   * Primary API endpoint URL (v1 API root).
   * Development: 'https://localhost:7022/api/v1'
   * Production (behind Nginx): '/api/v1'
   */
  apiUrl: string;

  /**
   * SignalR hub URL for real-time notifications.
   * Development: 'https://localhost:7022/hubs/notifications'
   * Production (behind Nginx): '/hubs/notifications'
   */
  hubUrl: string;

  /**
   * GraphQL endpoint URL.
   * Development: 'https://localhost:7022/graphql'
   * Production (behind Nginx): '/graphql'
   */
  graphqlUrl: string;

  /**
   * Stripe publishable key for card payment processing.
   */
  stripePublishableKey?: string;

  /**
   * Base origin URL without path prefixes.
   * Development: 'https://localhost:7022'
   * Production (behind Nginx): ''
   */
  apiBaseUrl: string;

  /**
   * Secondary API endpoint URL (v2 API root).
   * Development: 'https://localhost:7022/api/v2'
   * Production (behind Nginx): '/api/v2'
   */
  apiUrlV2: string;
}

export type AppConfigInput = Partial<AppConfig> & {
  apiUrl: string;
  hubUrl: string;
  graphqlUrl: string;
};

const DEFAULT_STRIPE_PUBLISHABLE_KEY =
  'pk_test_51Tkz731Ib3k691E77uYykLRchBuXqRO3LgZVLPGDzHSVVxh5iNy2rxCDcbpwLjhn53S5sqZRzXK41UDhxNL4LrZr005oiwDqIQ';

export const defaultAppConfigValues: AppConfig = {
  apiBaseUrl: 'https://localhost:7022',
  apiUrl: 'https://localhost:7022/api/v1',
  apiUrlV2: 'https://localhost:7022/api/v2',
  hubUrl: 'https://localhost:7022/hubs/notifications',
  graphqlUrl: 'https://localhost:7022/graphql',
  stripePublishableKey: DEFAULT_STRIPE_PUBLISHABLE_KEY,
};

function hasVersionOrApiSegment(url: string): boolean {
  return /\/api(?:\/|$)/i.test(url) || /\/v\d+(?:\/|$)/i.test(url);
}

export function resolveAppConfig(input?: Partial<AppConfig> | null): AppConfig {
  if (!input) {
    return { ...defaultAppConfigValues };
  }

  // Extract base origin
  let base = '';
  if (input.apiBaseUrl !== undefined) {
    base = input.apiBaseUrl.trim().replace(/\/+$/, '');
  } else if (input.apiUrl !== undefined) {
    const rawApi = input.apiUrl.trim();
    if (hasVersionOrApiSegment(rawApi)) {
      base = rawApi.replace(/\/(?:api|v\d+)(?:\/.*)?$/i, '').replace(/\/+$/, '');
    } else {
      base = rawApi.replace(/\/+$/, '');
    }
  }

  // Derive v1 and v2 API roots
  let apiUrl = '';
  if (input.apiUrl && hasVersionOrApiSegment(input.apiUrl)) {
    apiUrl = input.apiUrl.trim().replace(/\/+$/, '');
  } else {
    apiUrl = base ? `${base}/api/v1` : '/api/v1';
  }

  let apiUrlV2 = '';
  if (input.apiUrlV2) {
    apiUrlV2 = input.apiUrlV2.trim().replace(/\/+$/, '');
  } else {
    apiUrlV2 = base ? `${base}/api/v2` : '/api/v2';
  }

  // Hub URL
  let hubUrl = '';
  if (input.hubUrl !== undefined) {
    hubUrl = input.hubUrl.trim();
  } else {
    hubUrl = base ? `${base}/hubs/notifications` : '/hubs/notifications';
  }

  // GraphQL URL
  let graphqlUrl = '';
  if (input.graphqlUrl !== undefined) {
    graphqlUrl = input.graphqlUrl.trim();
  } else {
    graphqlUrl = base ? `${base}/graphql` : '/graphql';
  }

  const stripePublishableKey =
    input.stripePublishableKey !== undefined
      ? input.stripePublishableKey
      : DEFAULT_STRIPE_PUBLISHABLE_KEY;

  return {
    apiBaseUrl: base,
    apiUrl,
    apiUrlV2,
    hubUrl,
    graphqlUrl,
    stripePublishableKey,
  };
}

let activeConfig: AppConfig = resolveAppConfig(defaultAppConfigValues);

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => activeConfig,
});

export function provideAppConfig(
  config: AppConfigInput | (() => AppConfigInput),
): EnvironmentProviders {
  const resolved = resolveAppConfig(typeof config === 'function' ? config() : config);
  activeConfig = resolved;
  return makeEnvironmentProviders([
    {
      provide: APP_CONFIG,
      useValue: resolved,
    },
  ]);
}

/**
 * Convenience getter proxy / exported config for legacy or non-DI contexts
 * (such as utility functions). Always reflects the active environment configuration.
 */
export const appConfig: AppConfig = {
  get apiBaseUrl() {
    return activeConfig.apiBaseUrl;
  },
  get apiUrl() {
    return activeConfig.apiUrl;
  },
  get apiUrlV2() {
    return activeConfig.apiUrlV2;
  },
  get hubUrl() {
    return activeConfig.hubUrl;
  },
  get graphqlUrl() {
    return activeConfig.graphqlUrl;
  },
  get stripePublishableKey() {
    return activeConfig.stripePublishableKey;
  },
};
