import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import LabeledInput from '@/components/common/LabeledInput';
import Colors from '@/constants/Colors';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '@/navigation/types';
import { Mask } from 'react-native-mask-input';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FunctionsHttpError } from '@supabase/supabase-js'; 

type IdentityVerificationRouteProp = RouteProp<RootStackParamList, 'IdentityVerification'>;

const isCpfValid = (cpf: string) => {
  const cpfClean = cpf.replace(/\D/g, '');
  if (cpfClean.length !== 11 || /^(\d)\1{10}$/.test(cpfClean)) return false;
  let sum = 0; let remainder;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpfClean.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpfClean.substring(10, 11))) return false;
  return true;
};
const CPF_MASK: Mask = [/\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '-', /\d/, /\d/];
const BIRTH_DATE_MASK: Mask = [/\d/, /\d/, '/', /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/];
const CEP_MASK: Mask = [/\d/, /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/];


export default function IdentityVerificationScreen() {
  const { user, refreshUserProfile, signOut } = useAuth(); 
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const route = useRoute<IdentityVerificationRouteProp>();
  const readOnly = route.params?.readOnly ?? false;

  const [loading, setLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  const fetchProfileData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setFullName(data.full_name ?? '');
        setCpf(data.cpf ?? '');
        setBirthDate(data.birth_date ? data.birth_date.split('-').reverse().join('/') : '');
        setCep(data.cep ?? '');
        setStreet(data.street ?? '');
        setNumber(data.number ?? '');
        setComplement(data.complement ?? '');
        setNeighborhood(data.neighborhood ?? '');
        setCity(data.city ?? '');
        setState(data.state ?? '');
      }
    } catch (error) { showErrorToast(error, "Erro ao carregar dados do perfil.");
    } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchProfileData(); }, [fetchProfileData]));

  const fetchAddressFromCep = async (cepValue: string) => {
    const cleanedCep = cepValue.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;
    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      if (data.erro) { showErrorToast({ message: 'CEP não encontrado.' });
      } else { setStreet(data.logradouro); setNeighborhood(data.bairro); setCity(data.localidade); setState(data.uf); }
    } catch (error) { showErrorToast(error, 'Erro ao buscar o CEP.'); }
  };

  const handleSubmit = async () => {
    if (!fullName) { Alert.alert('Campo Obrigatório', 'Por favor, preencha seu nome completo.'); return; }
    if (!isCpfValid(cpf)) { Alert.alert('CPF Inválido', 'Por favor, insira um número de CPF válido.'); return; }
    if (!birthDate || birthDate.length < 10) { Alert.alert('Campo Obrigatório', 'Por favor, preencha sua data de nascimento completa (DD/MM/AAAA).'); return; }
    if (!cep || !street || !number || !neighborhood) { Alert.alert('Endereço Incompleto', 'Por favor, preencha todos os campos obrigatórios de endereço (CEP, Rua, Número, Bairro).'); return; }
    
    setFormSubmitting(true);
    
    try {
      if (!user) throw new Error('Usuário não autenticado.');

      const profileData = {
        full_name: fullName,
        cpf: cpf,
        birth_date: birthDate.split('/').reverse().join('-'), 
        cep: cep,
        street, number, complement, neighborhood, city, state,
      };

      const { data: functionData, error: functionError } = await supabase.functions.invoke('verify-identity', {
        body: profileData,
      });

      if (functionError) {
        if (functionError instanceof FunctionsHttpError && functionError.context?.error) {
          throw new Error(functionError.context.error);
        }
        throw functionError;
      }
  
      showSuccessToast('Dados Salvos!', 'Seus dados foram atualizados com sucesso.');
  
      await refreshUserProfile();
      navigation.navigate('App');
      
    } catch (error: any) {
      let errorMessage = 'Falha na validação. Tente novamente.'; 

      if (error instanceof FunctionsHttpError) {
        console.log("[IdentityVerificationScreen] Capturado FunctionsHttpError.");
        try {
            const errorBody = await error.context.json(); 
            if (errorBody && errorBody.error) {
                errorMessage = errorBody.error;
            } else {
                errorMessage = error.message; 
            }
        } catch (jsonError) {
            console.error("[IdentityVerificationScreen] Falha ao parsear JSON do erro:", jsonError);
            errorMessage = error.message;
        }
      } else if (error instanceof Error) {
          errorMessage = error.message;
      }
      
      showErrorToast(new Error(errorMessage), 'Falha na validação');

    } finally {
      setFormSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBackButton}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {readOnly ? 'Meus Dados' : 'Verificação'}
        </Text>
        <View style={styles.headerRightSpacer} /> 
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.description}>
            {readOnly ? 'Estes são os seus dados cadastrais.' : 'Para sua segurança e para ativar o serviço, complete seu cadastro. A validação é automática.'}
          </Text>

          <LabeledInput label="Nome Completo (como no CPF)" required value={fullName} onChangeText={setFullName} editable={!readOnly} />
          <LabeledInput label="CPF" required mask={CPF_MASK} value={cpf} onChangeText={setCpf} keyboardType="numeric" editable={!readOnly} />
          <LabeledInput label="Data de Nascimento" required placeholder="DD/MM/AAAA" mask={BIRTH_DATE_MASK} value={birthDate} onChangeText={setBirthDate} keyboardType="numeric" editable={!readOnly} />
          
          <Text style={styles.sectionTitle}>Endereço de Residência</Text>
          <LabeledInput label="CEP" required mask={CEP_MASK} value={cep} onChangeText={setCep} keyboardType="numeric" onEndEditing={(e) => fetchAddressFromCep(e.nativeEvent.text)} editable={!readOnly} />
          <LabeledInput label="Rua / Logradouro" required value={street} onChangeText={setStreet} editable={!readOnly} />
          <View style={styles.row}>
            <View style={{flex: 1}}><LabeledInput label="Número" required value={number} onChangeText={setNumber} keyboardType="numeric" editable={!readOnly} /></View>
            <View style={{flex: 2, marginLeft: 10}}><LabeledInput label="Complemento" value={complement} onChangeText={setComplement} editable={!readOnly} /></View>
          </View>
          <LabeledInput label="Bairro" required value={neighborhood} onChangeText={setNeighborhood} editable={!readOnly} />
          <LabeledInput label="Cidade" value={city} onChangeText={setCity} editable={false} />
          <LabeledInput label="Estado" value={state} onChangeText={setState} editable={false} />
          
          {readOnly ? (
            <View style={styles.readOnlyButtonsContainer}>
              <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('IdentityVerification', { readOnly: false })}>
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={formSubmitting}>{formSubmitting ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.buttonText}>Verificar e Salvar Dados</Text>}</TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.surface },
    header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: 15, 
      backgroundColor: Colors.surface, 
      borderBottomWidth: 1, 
      borderBottomColor: Colors.border 
    },
    headerTitle: { 
      fontSize: 20, 
      fontFamily: 'Montserrat_700Bold', 
      color: Colors.text 
    },
    headerBackButton: { 
      fontSize: 16, 
      color: Colors.primary, 
      fontFamily: 'Montserrat_600SemiBold',
      width: 50,
    },
    headerRightSpacer: {
      width: 50,
    },

    container: { 
      flex: 1,
      backgroundColor: Colors.background,
    },
    contentContainer: { 
      padding: 20,
      paddingTop: 10,
    },
    description: { fontSize: 14, fontFamily: 'Montserrat_400Regular', color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: Colors.text, marginTop: 20, marginBottom: 10, width: '100%' },
    row: { flexDirection: 'row', width: '100%', alignItems: 'flex-end' },
    label: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: Colors.textSecondary, marginBottom: 6, alignSelf: 'flex-start', },
    asterisk: { color: Colors.error, },
    uploadButton: { flexDirection: 'row', width: '100%', height: 55, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, marginBottom: 15 },
    disabledUpload: { backgroundColor: '#f0f0f0', borderColor: '#ccc' },
    uploadButtonText: { color: Colors.primary, fontSize: 16, fontFamily: 'Montserrat_600SemiBold', marginLeft: 10 },
    proofImage: { width: 100, height: 75, borderRadius: 10, marginBottom: 20, resizeMode: 'cover' },
    button: { flex: 1, height: 55, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    buttonText: { color: Colors.surface, fontSize: 18, fontFamily: 'Montserrat_700Bold' },
    // --- MUDANÇA: ESTILO DO BOTÃO INFERIOR REMOVIDO ---
    // backButton: { marginTop: 20, color: Colors.textSecondary, fontFamily: 'Montserrat_600SemiBold', fontSize: 16, textAlign: 'center' },
    readOnlyButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    secondaryButton: {
      flex: 1,
      height: 55,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.border,
      marginRight: 10,
    },
    secondaryButtonText: {
      color: Colors.text,
      fontSize: 18,
      fontFamily: 'Montserrat_700Bold'
    }
});