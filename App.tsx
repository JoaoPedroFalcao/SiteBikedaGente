// App.tsx
import React, { useCallback } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { RideProvider } from '@/contexts/RideContext';
import RootNavigator from '@/navigation';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import * as SplashScreen from 'expo-splash-screen';
import { MqttProvider } from '@/contexts/MqttContext';
import Colors from '@/constants/Colors';
import ForceUpdateModal from '@/components/common/ForceUpdateModal';
import SuspendedAccountModal from '@/components/common/SuspendedAccountModal';

// NOTA: Removidos imports de Linking e Supabase que causavam conflito

SplashScreen.preventAutoHideAsync();

const toastConfig = {
  error: (props: React.ComponentProps<typeof ErrorToast>) => (
    <ErrorToast
      {...props}
      text2NumberOfLines={3} 
      style={{ borderLeftColor: Colors.error, height: 'auto', minHeight: 60, paddingVertical: 10, width: '90%' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontFamily: 'Montserrat_700Bold', color: Colors.text }}
      text2Style={{ fontSize: 14, fontFamily: 'Montserrat_400Regular', color: Colors.textSecondary }}
    />
  ),
  success: (props: React.ComponentProps<typeof BaseToast>) => (
    <BaseToast
      {...props}
      text2NumberOfLines={2} 
      style={{ borderLeftColor: Colors.success, height: 'auto', minHeight: 60, paddingVertical: 10, width: '90%' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontFamily: 'Montserrat_700Bold', color: Colors.text }}
      text2Style={{ fontSize: 14, fontFamily: 'Montserrat_400Regular', color: Colors.textSecondary }}
    />
  ),
};

export default function App() {
  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={Colors.surface} />
      </View>
    );
  }

  return (
<View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <MqttProvider>
          <RideProvider>
            <RootNavigator />
            <ForceUpdateModal />
            <SuspendedAccountModal />
          </RideProvider>
        </MqttProvider>
      </AuthProvider>
      <Toast config={toastConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background || '#3a6049',
    justifyContent: 'center',
    alignItems: 'center',
  },
});