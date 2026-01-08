import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import { Ride, Profile } from '@/types';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import Colors from '@/constants/Colors';
import ReviewCard from '@/components/AdminComponents/ReviewCard';

interface RideForReview extends Ride {
  profiles: Pick<Profile, 'full_name'> | null;
}

const AdminReviewScreen = ({ navigation }: RootStackScreenProps<'AdminReview'>) => {
  const [rides, setRides] = useState<RideForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchPendingReviews = useCallback(async () => {
    try {
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('payment_status', 'pending_review')
        .order('created_at', { ascending: true });

      if (ridesError) throw ridesError;
      if (!ridesData || ridesData.length === 0) {
        setRides([]);
        return;
      }

      const userIds = ridesData.map(ride => ride.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      const combinedData = ridesData.map(ride => ({
        ...ride,
        profiles: profilesMap.get(ride.user_id) || { full_name: 'Usuário não encontrado' }
      }));

      setRides(combinedData as RideForReview[]);
    } catch (err) {
      showErrorToast(err, 'Erro ao buscar revisões pendentes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPendingReviews();
    }, [fetchPendingReviews])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingReviews();
  };

  const handleApprove = (rideId: number, amount: number, reason: string) => {
    Alert.alert(
      "Confirmar Cobrança",
      `Tem certeza que deseja aplicar uma taxa de R$ ${amount.toFixed(2)} à corrida #${rideId}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('charge-stripe-penalty-fee', {
                body: { ride_id: rideId, amount: amount, reason: reason },
              });
              if (error) throw error;
              showSuccessToast("Sucesso!", "A cobrança foi processada.");
              onRefresh();
            } catch (err) {
              showErrorToast(err, "Falha ao processar cobrança.");
            }
          },
        },
      ]
    );
  };

  const handleReject = (rideId: number) => {
    Alert.alert(
      "Confirmar Rejeição",
      `Tem certeza que deseja rejeitar a taxa para a corrida #${rideId}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('rides')
                .update({ payment_status: 'penalty_rejected' })
                .eq('id', rideId);
              if (error) throw error;
              showSuccessToast("Sucesso!", "A taxa foi rejeitada.");
              onRefresh();
            } catch (err) {
              showErrorToast(err, "Falha ao rejeitar a taxa.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revisões Pendentes</Text>
        <View style={{width: 50}} />
      </View>
      <FlatList
        data={rides}
        renderItem={({ item }) => <ReviewCard ride={item} onApprove={handleApprove} onReject={handleReject} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma revisão pendente no momento.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
  listContent: { padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.textSecondary },
});


export default AdminReviewScreen;