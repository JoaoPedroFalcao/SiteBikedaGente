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
import AuthLayout from '@/components/common/AuthLayout';
import AuthTextInput from '@/components/common/AuthTextInput';
import { useAuth } from '@/contexts/AuthContext'; 
import Colors from '@/constants/Colors';

const ResetPasswordScreen = ({ navigation }: RootStackScreenProps<'ResetPassword'>) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { completePasswordRecovery } = useAuth();

  async function handleResetPassword() {
    if (password.length < 6) {
      showErrorToast({ message: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (password !== confirmPassword) {
      showErrorToast({ message: 'As senhas não conferem. Tente novamente.' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      showErrorToast(error, 'Não foi possível redefinir sua senha.');
    } else {
      showSuccessToast('Sucesso!', 'Sua senha foi alterada. Por favor, faça o login.');
      completePasswordRecovery();
      navigation.navigate('Login');
      await supabase.auth.signOut();
    }
  }

  return (
    <AuthLayout
      title="Crie uma Nova Senha"
      subtitle="Insira sua nova senha abaixo"
    >
      <AuthTextInput
        placeholder="Nova Senha"
        value={password}
        onChangeText={setPassword}
        isPassword 
      />
      
      <AuthTextInput
        placeholder="Confirmar Nova Senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        isPassword 
      />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
          <Text style={styles.buttonText}>Salvar Nova Senha</Text>
        </TouchableOpacity>
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
  spinner: {
    marginTop: 20,
  },
});

export default ResetPasswordScreen;