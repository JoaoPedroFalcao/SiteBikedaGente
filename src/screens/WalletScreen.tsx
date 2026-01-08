import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/api/supabase';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Card } from '@/types';

const WalletScreen = ({ navigation, route }: RootStackScreenProps<'Wallet'>) => {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<Card[]>([]);
  const [defaultCardId, setDefaultCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, refreshUserProfile } = useAuth();
  
  const newCard = route.params?.newCard;

  useEffect(() => {
    if (newCard) {
      setCards(prevCards => {
        const cardExists = prevCards.some(card => card.id === newCard.id);
        if (cardExists) return prevCards;
        return [newCard, ...prevCards];
      });
      setDefaultCardId(newCard.id);
      navigation.setParams({ newCard: undefined });
    }
  }, [newCard, navigation]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cardsResponse, profileResponse] = await Promise.all([
        supabase.functions.invoke('list-payment-methods'),
        supabase.from('profiles').select('default_card_id').eq('id', user.id).single()
      ]);

      if (cardsResponse.error) throw cardsResponse.error;
      if (profileResponse.error) throw profileResponse.error;

      setCards(cardsResponse.data || []);
      setDefaultCardId(profileResponse.data?.default_card_id || null);
    } catch (err) {
      showErrorToast(err, 'Erro ao buscar dados da carteira.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!newCard) {
        fetchData();
      }
    }, [fetchData, newCard])
  );

  const handleSetDefault = async (cardId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('set-default-payment-method', {
        body: { payment_method_id: cardId }
      });
      if (error) throw error;
      
      showSuccessToast("Sucesso!", "Cartão principal definido.");
      await fetchData();
      await refreshUserProfile();
    } catch(err) {
      showErrorToast(err, 'Não foi possível definir o cartão principal.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCard = (cardId: string) => {
    Alert.alert(
      "Remover Cartão", "Tem certeza que deseja remover este cartão?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.functions.invoke('remove-payment-method', { body: { payment_method_id: cardId } });
              if (error) throw error;
              showSuccessToast("Sucesso", "Cartão removido.");
              await fetchData();
              await refreshUserProfile();
            } catch (err) { 
              if (err instanceof FunctionsHttpError) {
                    const errorMessage = err.context.error?.message || 'Não foi possível remover o cartão.';
                    showErrorToast({ message: errorMessage });
                } else {
                    showErrorToast(err, 'Ocorreu um erro inesperado.');
                }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  const renderCard = ({ item }: { item: Card }) => {
    const isDefault = item.id === defaultCardId;
    return (
      <View style={[styles.cardItem, isDefault && styles.defaultCard]}>
        {isDefault && <MaterialIcons name="star" size={20} color={Colors.accent} style={styles.starIcon} />}
        <MaterialIcons name="credit-card" size={24} color={Colors.primary} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardBrand}>
            {item.brand ? item.brand.charAt(0).toUpperCase() + item.brand.slice(1) : 'Cartão'} 
            {isDefault && <Text style={styles.defaultTextLabel}> (Principal)</Text>}
          </Text>
          <Text style={styles.cardLast4}>**** **** **** {item.last4}</Text>
        </View>
        {!isDefault && cards.length > 1 && (
          <TouchableOpacity style={styles.setDefaultButton} onPress={() => handleSetDefault(item.id)}>
            <Text style={styles.setDefaultText}>Definir Principal</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleRemoveCard(item.id)} style={{ marginLeft: 15 }}>
          <MaterialIcons name="delete" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Perfil</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Carteira</Text>
        <View style={{ width: 50 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={cards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum cartão cadastrado.</Text>}
        />
      )}
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddCard')}>
        <Text style={styles.addButtonText}>Adicionar Novo Cartão de Crédito</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    headerTitle: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
    backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
    listContent: { padding: 20 },
    cardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 2, borderColor: 'transparent' },
    defaultCard: {
        borderColor: Colors.primary,
    },
    starIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    cardInfo: { flex: 1, marginLeft: 15 },
    cardBrand: { fontSize: 16, fontFamily: 'Montserrat_600SemiBold', color: Colors.text },
    defaultTextLabel: {
      fontFamily: 'Montserrat_400Regular',
      color: Colors.textSecondary,
    },
    cardLast4: { fontSize: 14, fontFamily: 'Montserrat_400Regular', color: Colors.textSecondary },
    setDefaultButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    setDefaultText: {
        color: Colors.primary,
        fontSize: 12,
        fontFamily: 'Montserrat_700Bold',
    },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.textSecondary },
    addButton: { backgroundColor: Colors.primary, padding: 18, margin: 20, borderRadius: 12, alignItems: 'center' },
    addButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
});

export default WalletScreen;