import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { supabase } from '@/api/supabase';
import { Ride, Station } from '@/types';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import Colors from '@/constants/Colors';
import RideAdminCard from '@/components/AdminComponents/RideAdminCard';
import RideEditModal from '@/components/AdminComponents/RideEditModal';

const AdminRidesDashboardScreen = ({ navigation }: RootStackScreenProps<'AdminRidesDashboard'>) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  
  const insets = useSafeAreaInsets();

  const fetchData = useCallback(async () => {
    try {
      // 1. Busca Estações (para o modal de edição)
      const { data: stationsData, error: stationsError } = await supabase
        .from('stations')
        .select('*');
      
      if (stationsError) throw stationsError;
      if (stationsData) setStations(stationsData);

      // 2. Busca Corridas
      // A política RLS "Admins podem ver todas as corridas" garante que venha tudo
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (ridesError) throw ridesError;
      if (!ridesData || ridesData.length === 0) {
        setRides([]);
        return;
      }

      // 3. Busca Nomes dos Usuários
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
      
      setRides(combinedData as Ride[]);

    } catch (err) {
      showErrorToast(err, 'Erro ao buscar dados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // --- AÇÕES DE ADMINISTRAÇÃO ---

  const handleApplyFee = (ride: Ride) => {
    Alert.alert( "Aplicar Taxa Punitiva", `Selecione o motivo da taxa para a corrida #${ride.id}.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Danos à Bicicleta (R$ 500)", onPress: () => processFee(ride.id, 500, 'Danos à bicicleta') },
        { text: "Não Devolução (+72h) (R$ 1500)", style: "destructive", onPress: () => processFee(ride.id, 1500, 'Não devolução da bicicleta em 72 horas') },
      ]
    );
  };

  const processFee = async (rideId: number, amount: number, reason: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('charge-stripe-penalty-fee', {
        body: { ride_id: rideId, amount: amount, reason: reason },
      });
      if (error) throw error;
      showSuccessToast("Sucesso!", "A cobrança foi processada.");
      onRefresh();
    } catch (err) {
      showErrorToast(err, "Falha ao processar cobrança.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ride: Ride) => {
      setSelectedRide(ride);
      setEditModalVisible(true);
  };

  const handleSuspendUser = (ride: Ride) => {
    Alert.alert(
      "Suspender Usuário",
      `Selecione o tempo de suspensão para o usuário ${ride.profiles?.full_name || ''}. Durante este período, ele não poderá alugar bicicletas.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "24 Horas", onPress: () => applySuspension(ride.user_id, 1) },
        { text: "3 Dias", onPress: () => applySuspension(ride.user_id, 3) },
        { text: "7 Dias", onPress: () => applySuspension(ride.user_id, 7) },
        { text: "30 Dias", style: 'destructive', onPress: () => applySuspension(ride.user_id, 30) },
      ]
    );
  };

  const applySuspension = async (userId: string, days: number) => {
    setLoading(true);
    try {
      const suspendUntil = new Date();
      suspendUntil.setDate(suspendUntil.getDate() + days);

      const { error } = await supabase
        .from('profiles')
        .update({ suspended_until: suspendUntil.toISOString() })
        .eq('id', userId);

      if (error) throw error;

      showSuccessToast("Usuário Suspenso", `Suspensão aplicada até ${suspendUntil.toLocaleDateString('pt-BR')}.`);
    } catch (err) {
      showErrorToast(err, "Erro ao suspender usuário.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Painel de Corridas</Text>
        <View style={{width: 50}} />
      </View>
      
      <FlatList
        data={rides}
        renderItem={({ item }) => (
            <RideAdminCard 
                ride={item} 
                onApplyFee={handleApplyFee} 
                onEdit={handleEdit} 
                onSuspend={handleSuspendUser}
            />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma corrida encontrada.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      />

      <RideEditModal
        isVisible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onUpdate={onRefresh}
        ride={selectedRide}
        stations={stations}
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

export default AdminRidesDashboardScreen;