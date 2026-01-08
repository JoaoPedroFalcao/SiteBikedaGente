import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants'; // <--- IMPORTANTE
import { MaterialIcons } from '@expo/vector-icons';

// Ajuste os caminhos conforme sua estrutura
import { supabase } from '../../api/supabase'; 
import Colors from '../../constants/Colors';

const isVersionLower = (current: string | null, minimum: string) => {
  if (!current) return false;
  
  // Remove sufixos de build se houver (ex: "2.5.4(123)" vira "2.5.4")
  const cleanCurrent = current.split('(')[0].trim();
  const cleanMin = minimum.split('(')[0].trim();

  const v1 = cleanCurrent.split('.').map(Number);
  const v2 = cleanMin.split('.').map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 < num2) return true;
    if (num1 > num2) return false;
  }
  return false;
};

const ForceUpdateModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
        
        const { data, error } = await supabase
          .from('app_config')
          .select('min_version, store_url')
          .eq('platform', currentPlatform)
          .single();

        if (error || !data) return;

        // --- AQUI ESTÁ A CORREÇÃO ---
        // Tenta pegar a versão do app.config.js/app.json primeiro.
        // Se não existir (em release builds às vezes), pega a nativa.
        const currentVersion = Constants.expoConfig?.version || Application.nativeApplicationVersion || '1.0.0';
        
        console.log(`[ForceUpdate] Versão App: ${currentVersion} | Mínima: ${data.min_version}`);

        if (isVersionLower(currentVersion, data.min_version)) {
          setStoreUrl(data.store_url);
          setIsVisible(true);
        }
      } catch (e) {
        console.error("Erro ao verificar versão:", e);
      }
    };

    checkVersion();
  }, []);

  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade">
      <View style={styles.container}>
        <View style={styles.card}>
          <MaterialIcons name="system-update" size={60} color={Colors.primary} style={styles.icon} />
          <Text style={styles.title}>Atualização Necessária</Text>
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              Uma nova versão do Bike da Gente está disponível! Para continuar pedalando com segurança e novas funcionalidades, por favor, atualize o aplicativo.
            </Text>
          </View>
          
          <TouchableOpacity style={styles.button} onPress={handleUpdate}>
            <Text style={styles.buttonText}>Atualizar Agora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: Colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 30,
  },
  message: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.surface,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
});

export default ForceUpdateModal;