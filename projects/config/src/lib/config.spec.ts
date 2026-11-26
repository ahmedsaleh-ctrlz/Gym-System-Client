import { TestBed } from '@angular/core/testing';
import {
  APP_CONFIG,
  AppConfig,
  appConfig,
  defaultAppConfigValues,
  provideAppConfig,
  resolveAppConfig,
} from './config';

describe('Config Library', () => {
  it('should have default configuration values', () => {
    expect(defaultAppConfigValues.apiBaseUrl).toBe('https://localhost:7022');
    expect(defaultAppConfigValues.apiUrl).toBe('https://localhost:7022/api/v1');
    expect(defaultAppConfigValues.apiUrlV2).toBe('https://localhost:7022/api/v2');
    expect(defaultAppConfigValues.hubUrl).toBe('https://localhost:7022/hubs/notifications');
    expect(defaultAppConfigValues.graphqlUrl).toBe('https://localhost:7022/graphql');
    expect(defaultAppConfigValues.stripePublishableKey).toBeTruthy();
  });

  describe('resolveAppConfig', () => {
    it('should correctly configure development environment', () => {
      const devEnv = {
        apiUrl: 'https://localhost:7022',
        hubUrl: 'https://localhost:7022/hubs/notifications',
        graphqlUrl: 'https://localhost:7022/graphql',
      };

      const resolved = resolveAppConfig(devEnv);

      expect(resolved.apiBaseUrl).toBe('https://localhost:7022');
      expect(resolved.apiUrl).toBe('https://localhost:7022/api/v1');
      expect(resolved.apiUrlV2).toBe('https://localhost:7022/api/v2');
      expect(resolved.hubUrl).toBe('https://localhost:7022/hubs/notifications');
      expect(resolved.graphqlUrl).toBe('https://localhost:7022/graphql');
    });

    it('should correctly configure production environment behind Nginx reverse proxy', () => {
      const prodEnv = {
        apiUrl: '',
        hubUrl: '/hubs/notifications',
        graphqlUrl: '/graphql',
      };

      const resolved = resolveAppConfig(prodEnv);

      expect(resolved.apiBaseUrl).toBe('');
      expect(resolved.apiUrl).toBe('/api/v1');
      expect(resolved.apiUrlV2).toBe('/api/v2');
      expect(resolved.hubUrl).toBe('/hubs/notifications');
      expect(resolved.graphqlUrl).toBe('/graphql');
    });

    it('should preserve explicit api endpoints if already specified', () => {
      const customEnv = {
        apiUrl: '/custom-api/v1',
        apiUrlV2: '/custom-api/v2',
        hubUrl: '/custom-hub',
        graphqlUrl: '/custom-gql',
      };

      const resolved = resolveAppConfig(customEnv);

      expect(resolved.apiUrl).toBe('/custom-api/v1');
      expect(resolved.apiUrlV2).toBe('/custom-api/v2');
      expect(resolved.hubUrl).toBe('/custom-hub');
      expect(resolved.graphqlUrl).toBe('/custom-gql');
    });
  });

  describe('Dependency Injection with provideAppConfig', () => {
    it('should inject APP_CONFIG with provided production configuration', () => {
      const prodEnv = {
        apiUrl: '',
        hubUrl: '/hubs/notifications',
        graphqlUrl: '/graphql',
        stripePublishableKey: 'pk_test_prod_key',
      };

      TestBed.configureTestingModule({
        providers: [provideAppConfig(prodEnv)],
      });

      const injected = TestBed.inject(APP_CONFIG);

      expect(injected.apiBaseUrl).toBe('');
      expect(injected.apiUrl).toBe('/api/v1');
      expect(injected.apiUrlV2).toBe('/api/v2');
      expect(injected.hubUrl).toBe('/hubs/notifications');
      expect(injected.graphqlUrl).toBe('/graphql');
      expect(injected.stripePublishableKey).toBe('pk_test_prod_key');

      // Legacy appConfig export should also reflect active config
      expect(appConfig.apiBaseUrl).toBe('');
      expect(appConfig.apiUrl).toBe('/api/v1');
      expect(appConfig.hubUrl).toBe('/hubs/notifications');
    });
  });
});
