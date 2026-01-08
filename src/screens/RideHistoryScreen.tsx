import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import { Ride } from '@/types';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { showErrorToast } from '@/utils/errorHandler';
import RideHistoryCard from '@/components/RideHistoryComponents/RideHistoryCard';
import RatingModal from '@/components/MapComponents/RatingModal';
import Colors from '@/constants/Colors';

interface RideWithStationNames extends Ride {
  start_station_name: string | null;
  end_station_name: string | null;
}

const RideHistoryScreen = ({ navigation }: RootStackScreenProps<'RideHistory'>) => {
  const { user } = useAuth();
  const [rides, setRides] = useState<RideWithStationNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          start_station:start_station_id ( name ),
          end_station:end_station_id ( name ),
          ride_evaluations ( rating, comment )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data.map((ride: any) => ({
        ...ride,
        start_station_name: ride.start_station?.name || 'Desconhecida',
        end_station_name: ride.end_station?.name || 'Desconhecida',
      }));
      setRides(formattedData);

    } catch (error: any) {
      showErrorToast(error, 'Erro ao buscar histórico');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [fetchHistory])
  );

  // --- REALTIME PARA ATUALIZAR O HISTÓRICO ---
  useEffect(() => {
    if (!user) return;

    console.log("📡 [RideHistory] Inscrevendo para atualizações em tempo real...");
    
    const historyChannel = supabase.channel('ride-history-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('🔄 [RideHistory] Mudança detectada! Atualizando lista...');
          // Recarrega a lista quando há qualquer mudança (nova corrida ou avaliação)
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(historyChannel);
    };
  }, [user, fetchHistory]);
  // ------------------------------------------

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleRatePress = (ride: Ride) => {
    setSelectedRide(ride);
    setRatingModalVisible(true);
  };

  const handleModalClose = () => {
    setRatingModalVisible(false);
    setSelectedRide(null);
    // A atualização via realtime pode acontecer junto, mas garantir o refresh aqui é boa prática
    onRefresh(); 
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico de Corridas</Text>
          <View style={{width: 50}} />
        </View>

        <FlatList
          data={rides}
          renderItem={({ item }) => <RideHistoryCard ride={item} onRatePress={handleRatePress} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Você ainda não tem nenhuma corrida no seu histórico.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
        />
      </View>
      <RatingModal
        isVisible={isRatingModalVisible}
        onClose={handleModalClose}
        ride={selectedRide}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
  listContent: { padding: 20 },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'Montserrat_400Regular',
  }
});

export default RideHistoryScreen;