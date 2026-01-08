// src/screens/AddCardScreen.tsx

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
// --- MUDANÇA AQUI ---
import { StripeProvider, CardField, useStripe, CardFieldInput, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { supabase } from '@/api/supabase';
import Colors from '@/constants/Colors';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const AddCardScreen = ({ navigation }: RootStackScreenProps<'AddCard'>) => {
  const insets = useSafeAreaInsets();
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  
  // --- MUDANÇA AQUI ---
  // Trocamos useConfirmPayment por useConfirmSetupIntent
  const { confirmSetupIntent, loading: confirmingSetup } = useConfirmSetupIntent();
  const [finalizingBackend, setFinalizingBackend] = useState(false);
  const { user, refreshUserProfile } = useAuth();
  const cardFieldRef = useRef<CardFieldInput.Methods>(null);

  // --- MUDANÇA AQUI ---
  const loading = confirmingSetup || finalizingBackend;
  const cardComplete = cardDetails?.complete ?? false;

  const handleSaveCard = async () => {
    if (!cardComplete || !user) return;

    setFinalizingBackend(false);

    let paymentMethodIdConfirmed: string | null = null;

    try {
      // 1. Chamar a função de backend (que agora cria um SetupIntent)
      const { data: validationData, error: functionError } = await supabase.functions.invoke('create-validation-intent');

      if (functionError || !validationData?.client_secret) { 
        const errorMsg = validationData?.error || functionError?.message || "Falha ao iniciar validação do cartão.";
        Alert.alert("Erro Função Backend 1", errorMsg);
        throw new Error(errorMsg);
      }

      const clientSecret = validationData.client_secret;

      // --- MUDANÇA AQUI ---
      // Usamos confirmSetupIntent e esperamos um setupIntent
      const { error: confirmError, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (confirmError) {
        const stripeErrorMessage = confirmError.message || confirmError.localizedMessage || JSON.stringify(confirmError);
        Alert.alert("Erro Stripe (confirmSetup)", stripeErrorMessage); // Log de erro atualizado
        showErrorToast({ message: `Falha na validação do cartão: ${stripeErrorMessage}` });
        return;
      }

      // --- MUDANÇA AQUI ---
      // Verificamos o status do setupIntent
      if (setupIntent?.status !== 'Succeeded' || !setupIntent.paymentMethodId) {
        Alert.alert("Erro Confirmação", `A validação não foi bem-sucedida. Status: ${setupIntent?.status}`);
        throw new Error(`Falha na confirmação do Setup Intent. Status: ${setupIntent?.status}`);
      }

      // --- MUDANÇA AQUI ---
      // Pegamos o ID do setupIntent
      paymentMethodIdConfirmed = setupIntent.paymentMethodId;
      setFinalizingBackend(true); 

      // 2. Chamar a função para finalizar e salvar no banco
      const { data: finalizeData, error: finalizeBackendError } = await supabase.functions.invoke('finalize-card-setup', {
        body: {
          paymentMethodId: paymentMethodIdConfirmed
        }
      });
      setFinalizingBackend(false);

      if (finalizeBackendError || finalizeData?.error) {
        const errorMsg = finalizeData?.error || finalizeBackendError?.message || "Falha ao finalizar cadastro do cartão no backend.";
        Alert.alert("Erro Função Backend 2", errorMsg);
         console.error("Erro ao atualizar perfil após confirmação:", errorMsg);
         showErrorToast({ message: "Cartão validado, mas houve um erro ao salvar no perfil." });
         navigation.goBack();
         return;
      }
      
      // 3. Sucesso
      await refreshUserProfile();
      showSuccessToast('Sucesso!', 'Seu cartão foi salvo com segurança.');
      navigation.goBack();

    } catch (err) {
      if (finalizingBackend) setFinalizingBackend(false);

      console.error("ERRO GERAL no handleSaveCard (Fluxo Frontend Confirm):", err);
      if (!(err instanceof Error && err.message.startsWith("Erro")) && !(err instanceof Error && err.message.startsWith("Falha")))
      {
         showErrorToast(err, 'Não foi possível salvar o cartão.');
      } else if (err instanceof Error) {
         showErrorToast(err);
      } else {
        showErrorToast({ message: 'Ocorreu um erro desconhecido.' });
      }
    }
  };

  if (!STRIPE_PUBLISHABLE_KEY) {
      return <View style={styles.container}><Text>Chave do Stripe não configurada.</Text></View>
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
              <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Carteira</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Adicionar Cartão</Text>
            <View style={{ width: 80 }} />
        </View>
        <View style={styles.content}>
            <Text style={styles.label}>Insira os dados do seu cartão</Text>
            <CardField
                ref={cardFieldRef}
                postalCodeEnabled={false}
                style={styles.cardField}
                onCardChange={(details) => setCardDetails(details)}
                cardStyle={{
                    backgroundColor: Colors.surface,
                    textColor: Colors.text,
                }}
            />
            <TouchableOpacity style={[styles.button, (!cardComplete || loading) && styles.disabledButton]} onPress={handleSaveCard} disabled={!cardComplete || loading}>
            {loading ? (
                <ActivityIndicator color={Colors.surface} />
            ) : (
                <Text style={styles.buttonText}>Salvar Cartão com Segurança</Text>
            )}
            </TouchableOpacity>
        </View>
      </View>
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    headerTitle: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
    backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
    content: { flex: 1, padding: 20 },
    label: { fontSize: 16, fontFamily: 'Montserrat_600SemiBold', color: Colors.textSecondary, marginBottom: 15 },
    cardField: { width: '100%', height: 50, marginBottom: 30 },
    button: { backgroundColor: Colors.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: Colors.textSecondary },
    buttonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
});

export default AddCardScreen;