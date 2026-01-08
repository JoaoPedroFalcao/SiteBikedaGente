require('dotenv').config();

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = ({ config }) => {

  let baseConfig = {
    ...config,
    name: "Bike da Gente",
    slug: "bike-da-gente",
    scheme: "bikedagente",
    version: "2.6.1",
    orientation: "portrait",
    icon: "./assets/images/AppLogo_novo.png",
    userInterfaceStyle: "light",
    locales: {
      pt: "./assets/locales/pt.json" 
    },
    splash: {
      image: "./assets/images/AppLogo_novo.png",
      resizeMode: "contain",
      backgroundColor: "#3a6049"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.fielsolucoes.bikedagente",
      infoPlist: {
        CFBundleLocalizations: ["pt", "pt-BR"],
        CFBundleDevelopmentRegion: "pt-BR",
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Precisamos da sua localização para mostrar as estações de bicicleta mais próximas de você no mapa.",
        NSPhotoLibraryUsageDescription: "O Bike da Gente precisa de acesso à sua galeria para que você possa selecionar um comprovante de residência e uma foto de perfil."
      },
      NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
      },
      config: {
        googleMapsApiKey: process.env.Maps_API_KEY
      }
    },
    android: {
      versionCode: 15,
      adaptiveIcon: {
        foregroundImage: "./assets/images/AppLogo_novo.png",
        backgroundColor: "#3a6049"
      },
      package: "com.unobike.bikedagenteguapi",
      permissions: [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.Maps_API_KEY
        }
      },
    },
    plugins: [
      "expo-font",
      "expo-splash-screen",
      [
        "expo-camera",
        { "cameraPermission": "Permitir que o Bike da Gente aceda à sua câmara para ler os QR Codes." }
      ],
      [
        "expo-location",
        { "locationAlwaysAndWhenInUsePermission": "Permitir que o Bike da Gente use a sua localização." }
      ],
    ],
    extra: {
      eas: {
        projectId: "8da2d9f7-aa8f-46ba-93a2-9da0c45513a6"
      }
    }
  };

  return withAndroidManifest(baseConfig, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];
    
    if (!application.$) {
      application.$ = {};
    }

    application.$['android:usesCleartextTraffic'] = 'true';
    
    return config;
  });
};