/**
 * Telemetry Module Index
 * 
 * Central export for all telemetry functionality
 */

// Client-side telemetry
export {
  initializeAppInsights,
  getAppInsights,
  getReactPlugin,
  trackEvent,
  trackError,
  trackTrace,
  trackMetric,
  trackPageView,
  setAuthenticatedUser,
  clearAuthenticatedUser,
  flushTelemetry,
  TelemetryEvents,
  trackAuthSuccess,
  trackAuthFailure,
  trackApiRequest,
  type TelemetryEvent,
  type TelemetryError,
  type TelemetryTrace,
  type TelemetryMetric,
} from './appInsights';

// Server-side telemetry
export {
  initializeServerTelemetry,
  getServerTelemetryClient,
  trackServerEvent,
  trackServerTrace,
  trackServerException,
  trackServerDependency,
  trackServerMetric,
  flushServerTelemetry,
  trackApiRoute,
  trackDatabaseOperation,
  trackExternalApi,
  trackAuthEvent,
  shutdownServerTelemetry,
  type ServerTelemetryConfig,
  type ServerTelemetryEvent,
  type ServerTelemetryTrace,
  type ServerTelemetryException,
  type ServerTelemetryDependency,
} from './serverTelemetry';
