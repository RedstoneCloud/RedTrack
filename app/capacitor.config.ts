import {CapacitorConfig} from "@capacitor/cli";

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