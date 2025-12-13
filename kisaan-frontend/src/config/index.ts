// Environment configuration
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Check for invalid/placeholder values
  if (!envUrl || 
      envUrl.includes('<') || 
      envUrl.includes('>') || 
      envUrl === 'null' || 
      envUrl === 'undefined' ||
      /^\s*$/.test(envUrl)) {
    
    // In production, use the known Azure backend URL
    if (import.meta.env.PROD) {
      return 'https://kisaancenter-backend.whiteisland-e1233153.northeurope.azurecontainerapps.io/api';
    }
    
    // In development, use localhost
    return 'http://localhost:8000/api';
  }
  
  return envUrl;
};

export const config = {
  apiBaseUrl: getApiBaseUrl(),
  environment: import.meta.env.VITE_ENVIRONMENT || 'production',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Safe getter for owner dashboard API so callers can get a sanitized URL at runtime
export const getOwnerDashboardApi = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || config.apiBaseUrl || '';
  if (typeof base === 'string' && (base.includes('<') || base.includes('>') || /^\s*$/.test(base))) {
    // Fallback to relative path
    return '/owner-dashboard/dashboard';
  }
  return `${base.replace(/\/$/, '')}/owner-dashboard/dashboard`;
};

export default config;