// Environment Configuration
// Centralized environment detection and configuration

export interface EnvironmentInfo {
  isDevelopment: boolean;
  isProduction: boolean;
  mode: string;
  hostname: string;
  isLocalhost: boolean;
  isProductionDomain: boolean;
  buildInfo: {
    timestamp: number;
    mode: string;
    nodeEnv?: string;
  };
}

// Primary environment flags (Vite provided)
export const IS_DEVELOPMENT = import.meta.env.DEV;
export const IS_PRODUCTION = import.meta.env.PROD;
export const VITE_MODE = import.meta.env.MODE;

// Enhanced environment detection with comprehensive checks
export const detectEnvironment = (): EnvironmentInfo => {
  // Vite environment variables
  const viteMode = import.meta.env.MODE;
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  
  // Browser environment info
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const port = typeof window !== 'undefined' ? window.location.port : '';
  
  // Production domain indicators
  const productionDomains = [
    'mariahavens.com',
    'pos.mariahavens.com',
    'onrender.com'
  ];
  const isProductionDomain = productionDomains.some(domain => hostname.includes(domain));
  
  // Development indicators
  const developmentIndicators = [
    hostname === 'localhost',
    hostname === '127.0.0.1',
    hostname.startsWith('192.168.'), // Local network
    hostname.startsWith('10.'),      // Private network
    hostname.startsWith('172.'),     // Private network
    port === '5173',                 // Vite default dev port
    port === '3000',                 // Alternative dev port
    viteMode === 'development',
    isDev === true
  ];
  const isDevelopmentHost = developmentIndicators.some(indicator => indicator);
  
  // Final environment determination
  const environment: EnvironmentInfo = {
    isDevelopment: isDev && isDevelopmentHost && !isProductionDomain,
    isProduction: isProd || isProductionDomain,
    mode: viteMode,
    hostname,
    isLocalhost: hostname === 'localhost' || hostname === '127.0.0.1',
    isProductionDomain,
    buildInfo: {
      timestamp: Date.now(),
      mode: viteMode,
      nodeEnv: import.meta.env.NODE_ENV
    }
  };
  
  return environment;
};

// Get current environment info
export const ENV = detectEnvironment();

// Environment-specific logging
export const envLog = {
  dev: (...args: any[]) => {
    if (ENV.isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (ENV.isDevelopment) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (ENV.isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    // Info logs always show but with environment context
    console.info(`[${ENV.mode}]`, ...args);
  }
};

// Log environment info in development (only when debugging is enabled)
if (ENV.isDevelopment && import.meta.env.VITE_DEBUG_ENV === 'true') {
  console.group('🌍 Environment Configuration');
  console.log('Environment Info:', ENV);
  console.log('Vite Environment Variables:', {
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    VITE_API_URL: import.meta.env.VITE_API_URL
  });
  console.groupEnd();
}