import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

const PendingApprovalScreen = () => {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.contentContainer}>
        <MaterialIcons name="update" size={80} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>Aguardando Aprovação</Text>
        <Text style={styles.subtitle}>
          Sua conta foi criada com sucesso e está em análise. Você receberá um e-mail assim que seu cadastro for aprovado.
        </Text>
        <Text style={styles.subtitle}>
          Lembre-se de confirmar seu e-mail clicando no link que enviamos para você.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: 25,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 28,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
});

export default PendingApprovalScreen;