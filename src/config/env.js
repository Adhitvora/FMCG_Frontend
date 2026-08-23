const requiredEnv = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
};

const missing = Object.entries(requiredEnv)
  .filter(([, value]) => !String(value || '').trim())
  .map(([key]) => key);

if (missing.length) {
  throw new Error(`Missing required frontend environment variable(s): ${missing.join(', ')}`);
}

export const env = {
  apiUrl: requiredEnv.VITE_API_URL.replace(/\/+$/, ''),
  mode: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
