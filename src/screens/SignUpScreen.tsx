import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
  ScrollView,
} from 'react-native';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/contexts/AuthContext'; // <--- IMPORTANTE
import { RootStackScreenProps } from '@/navigation/types';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import AuthLayout from '@/components/common/AuthLayout';
import LabeledInput from '@/components/common/LabeledInput';
import GoogleLoginButton from '@/components/common/GoogleLoginButton'; // <--- IMPORTANTE
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

const TERMS_OF_USE_URL = 'https://nhsztiujgvdvukyrdvzs.supabase.co/storage/v1/object/public/public-assets/Termo%20de%20Uso%20-%20UnoBike.pdf';

const SignUpScreen = ({ navigation }: RootStackScreenProps<'SignUp'>) => {
  const { signInWithGoogle } = useAuth(); // <--- USANDO O HOOK
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordSecure, setIsPasswordSecure] = useState(true);
  const [acceptedTermsAndAge, setAcceptedTermsAndAge] = useState(false);

  const openTermsPdf = async () => {
    await WebBrowser.openBrowserAsync(TERMS_OF_USE_URL);
  };

  // <--- LÓGICA DO LOGIN GOOGLE --->
  async function handleGoogleSignUp() {
    if (!acceptedTermsAndAge) {
      showErrorToast({ message: 'Você precisa aceitar os Termos de Uso e confirmar sua idade.' });
      return;
    }
    
    try {
      await signInWithGoogle();
      // O redirecionamento é automático pelo AuthContext
    } catch (error: any) {
      showErrorToast(error, 'Erro ao iniciar cadastro com Google.');
    }
  }

  async function handleSignUp() {
    if (!fullName || !email || !password) {
      showErrorToast({ message: 'Por favor, preencha nome, e-mail e senha.' });
      return;
    }
    
    // ... (restante das validações iguais) ...
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      showErrorToast({ message: 'Por favor, insira um endereço de e-mail válido.' });
      return;
    }

     if (password.length < 6) {
        showErrorToast({ message: 'A senha deve ter no mínimo 6 caracteres.' });
        return;
    }
    if (!acceptedTermsAndAge) {
      showErrorToast({ message: 'Você precisa aceitar os Termos de Uso e confirmar sua idade.' });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (authError || !authData.user) {
        throw authError || new Error("Não foi possível criar o usuário.");
      }
      
      const user = authData.user;
      // Nota: Para Google Auth, isso será tratado automaticamente na primeira adição de cartão
      const { error: stripeError } = await supabase.functions.invoke('create-stripe-customer', {
          body: {
              user_id: user.id,
              full_name: fullName,
              email: user.email,
          }
      });

      if (stripeError) {
          throw new Error(`Erro ao configurar a conta de pagamento: ${stripeError.message}`);
      }
    
      showSuccessToast('Cadastro realizado!', 'Confirme seu e-mail para ativar sua conta.');
      navigation.navigate('Login');

    } catch (error: any) {
        showErrorToast(error, 'Erro ao realizar o cadastro.');
    } finally {
        setLoading(false);
    }
  }
   
  return (
    <AuthLayout
      title="Crie sua Conta"
      subtitle="Preencha seus dados para começar a pedalar"
    >
      <ScrollView style={{width: '100%'}} contentContainerStyle={{alignItems: 'center', paddingBottom: 20}} showsVerticalScrollIndicator={false}>
        
        <LabeledInput label="Nome Completo" required value={fullName} onChangeText={setFullName} />
        <LabeledInput label="E-mail" required value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <LabeledInput 
          label="Senha" 
          required 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry={isPasswordSecure} 
          iconName={isPasswordSecure ? 'visibility-off' : 'visibility'}
          onIconPress={() => setIsPasswordSecure(!isPasswordSecure)}
        />
        <Text style={styles.passwordHint}>
          A senha deve ter no mínimo 6 caracteres.
        </Text>
        
        <View style={styles.termsContainer}>
            <TouchableOpacity onPress={() => setAcceptedTermsAndAge(!acceptedTermsAndAge)} style={styles.checkbox}>
                {acceptedTermsAndAge && <MaterialIcons name="check" size={18} color={Colors.primary} />}
            </TouchableOpacity>
            <Text style={styles.termsText}>
                Eu confirmo que tenho 18 anos ou mais e aceito os{' '}
                <Text style={styles.termsLink} onPress={openTermsPdf}>
                    Termos de Uso
                </Text>
                <Text style={styles.asterisk}> *</Text>
                .
            </Text>
        </View>

        {/* --- INÍCIO DA MUDANÇA: BOTÃO GOOGLE --- */}
        <GoogleLoginButton 
          onPress={handleGoogleSignUp} 
          isLoading={loading}
          text="Cadastrar com Google"
        />

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.dividerLine} />
        </View>
        {/* --- FIM DA MUDANÇA --- */}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
        ) : (
          <TouchableOpacity 
            style={[styles.button, !acceptedTermsAndAge && styles.disabledButton]} 
            onPress={handleSignUp}
            disabled={!acceptedTermsAndAge}
          >
            <Text style={styles.buttonText}>Criar Conta com E-mail</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Já tenho uma conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
    asterisk: { color: Colors.error, },
    button: { width: '100%', height: 55, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginTop: 10 },
    buttonText: { color: Colors.surface, fontSize: 18, fontFamily: 'Montserrat_700Bold' },
    backButton: { marginTop: 25, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold', fontSize: 16, paddingBottom: 20 },
    spinner: { marginTop: 20 },
    termsContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 20, marginBottom: 10, paddingHorizontal: 5 },
    checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: Colors.primary, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    termsText: { flex: 1, fontFamily: 'Montserrat_400Regular', fontSize: 14, color: Colors.textSecondary },
    termsLink: { color: Colors.primary, textDecorationLine: 'underline', fontFamily: 'Montserrat_600SemiBold' },
    disabledButton: { backgroundColor: Colors.textSecondary, opacity: 0.7 },
    passwordHint: {
      width: '100%',
      textAlign: 'left',
      fontFamily: 'Montserrat_400Regular',
      fontSize: 12,
      color: Colors.textSecondary,
      marginTop: -10,
      marginBottom: 15,
    },
    // Estilos do Divisor
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginVertical: 15,
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

export default SignUpScreen;