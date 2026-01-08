import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator, View } from 'react-native';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/contexts/AuthContext'; // <--- IMPORTANTE
import { RootStackScreenProps } from '@/navigation/types';
import { showErrorToast } from '@/utils/errorHandler';
import AuthLayout from '@/components/common/AuthLayout';
import LabeledInput from '@/components/common/LabeledInput'; 
import GoogleLoginButton from '@/components/common/GoogleLoginButton'; // <--- IMPORTANTE
import Colors from '@/constants/Colors';
import SupportButton from '@/components/common/SupportButton';

const LoginScreen = ({ navigation }: RootStackScreenProps<'Login'>) => {
  const { signInWithGoogle } = useAuth(); // <--- USANDO O HOOK
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordSecure, setIsPasswordSecure] = useState(true);

  async function handleSignIn() {
    if (!email || !password) {
      showErrorToast({ message: 'Por favor, preencha e-mail e senha.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showErrorToast(error, 'Erro ao fazer login.');
    }
    setLoading(false);
  }

  // <--- LÓGICA DO LOGIN GOOGLE --->
  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      showErrorToast(error, 'Erro ao entrar com Google.');
    }
  }

  return (
    <View style={{ flex: 1 }}>
    <AuthLayout
      title="Bem-vindo!"
      subtitle="Faça login para pedalar em Guapimirim"
    >
      <LabeledInput
        label="E-mail"
        placeholder="exemplo@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <LabeledInput
        label="Senha"
        placeholder="*****"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={isPasswordSecure}
        iconName={isPasswordSecure ? 'visibility-off' : 'visibility'}
        onIconPress={() => setIsPasswordSecure(!isPasswordSecure)}
      />
      
      <TouchableOpacity 
        style={styles.forgotPasswordButton} 
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handleSignIn}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>

          {/* --- INÍCIO DA MUDANÇA: BOTÃO GOOGLE --- */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleLoginButton onPress={handleGoogleSignIn} />
          {/* --- FIM DA MUDANÇA --- */}

          <TouchableOpacity style={styles.signUpButton} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpButtonText}>Não tenho conta. <Text style={styles.boldText}>Cadastrar</Text></Text>
          </TouchableOpacity>
        </>
      )}
    </AuthLayout>
    <SupportButton />
    </View>
  );
};

const styles = StyleSheet.create({
  forgotPasswordButton: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 15,
    marginTop: -10,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
  signUpButton: {
      marginTop: 25,
  },
  signUpButtonText: {
    color: Colors.textSecondary,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
  },
  boldText: {
    fontFamily: 'Montserrat_700Bold',
    color: Colors.text,
  },
  spinner: {
    marginTop: 20,
  },
  // Estilos do Divisor (replicados aqui para o LoginScreen também)
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: Colors.textSecondary,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
});

export default LoginScreen;