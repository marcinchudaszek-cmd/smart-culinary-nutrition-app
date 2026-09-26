import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beagleappsstudio.kulinapp',
  appName: 'KulinApp',
  webDir: 'dist',
  // Tło WebView przed wczytaniem strony (gray-50 jak tło aplikacji)
  backgroundColor: '#f9fafb',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f97316',
      showSpinner: false,
    },
  },
};

export default config;
