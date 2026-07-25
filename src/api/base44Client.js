import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: '6a646cc98e94135cf3b88536',
  ...(import.meta.env.VITE_BASE44_APP_BASE_URL
    ? { serverUrl: import.meta.env.VITE_BASE44_APP_BASE_URL }
    : {}),
});
