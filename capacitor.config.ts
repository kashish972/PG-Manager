import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kashish.pgmanager',
  appName: 'pg-manager',
  webDir: 'out',
  server: {
    url: 'https://pg-manager-git-test-test-cases-githooks-kashish-aroras-projects.vercel.app',
    cleartext: false,
  },
};

export default config;