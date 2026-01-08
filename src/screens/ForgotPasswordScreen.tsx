import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/api/supabase';
import { RootStackScreenProps } from '@/navigation/types';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import * as Linking from 'expo-linking';
import AuthLayout from '@/components/common/AuthLayout';
import AuthTextInput from '@/components/common/AuthTextInput';
import Colors from '@/constants/Colors';

const ForgotPasswordScreen = ({ navigation }: RootStackScreenProps<'ForgotPassword'>) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePasswordReset() {
    if (!email) {
      showErrorToast({ message: 'Por favor, insira seu e-mail.' });
      return;
    }
    setLoading(true);
    const redirectTo = Linking.createURL('/');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    setLoading(false);

    if (error) {
      showErrorToast(error, 'Não foi possível enviar o e-mail de recuperação.');
    } else {
      showSuccessToast(
        'Verifique seu e-mail',
        'Se uma conta com este e-mail existir, um link para redefinir sua senha foi enviado.'
      );
      navigation.goBack();
    }
  }

  return (
    <AuthLayout
      title="Recuperar Senha"
      subtitle="Insira seu e-mail para receber um link de redefinição"
    >
      <AuthTextInput
        placeholder="Seu e-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handlePasswordReset}>
            <Text style={styles.buttonText}>Enviar Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Voltar para o Login</Text>
          </TouchableOpacity>
        </>
      )}
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
  backButton: {
      marginTop: 25,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
  },
  spinner: {
    marginTop: 20,
  }
});

export default ForgotPasswordScreen;