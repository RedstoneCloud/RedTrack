import type { CapacitorConfig } from '@capacitor/cli';
import { CapacitorHttp, HttpResponse } from "@capacitor/core";

const config: CapacitorConfig = {
  appId: 'de.redstonecloud.redtrack',
  appName: 'RedTrack',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
