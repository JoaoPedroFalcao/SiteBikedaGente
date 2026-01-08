import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '@/api/supabase';
import { Bike, Station } from '@/types';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { showErrorToast } from '@/utils/errorHandler';
import Colors from '@/constants/Colors';
import BikeAdminCard from '@/components/AdminComponents/BikeAdminCard';
import BikeEditModal from '@/components/AdminComponents/BikeEditModal';
import { MaterialIcons } from '@expo/vector-icons';

const AdminBikesDashboardScreen = ({ navigation }: RootStackScreenProps<'AdminBikesDashboard'>) => {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  
  const insets = useSafeAreaInsets();

  const fetchData = useCallback(async () => {
    try {
      // 1. Busca Estações (para mapear nomes)
      const { data: stationsData, error: stationsError } = await supabase.from('stations').select('*');
      if (stationsError) throw stationsError;
      if (stationsData) setStations(stationsData);

      // 2. Busca Bikes
      const { data: bikesData, error: bikesError } = await supabase
        .from('bikes')
        .select('*')
        .order('id', { ascending: true }); // Ordena por ID da bike (bike1, bike2...)

      if (bikesError) throw bikesError;
      
      // Ordenação numérica se os IDs forem "bike1", "bike2"
      const sortedBikes = (bikesData || []).sort((a, b) => {
         const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
         const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
         return numA - numB;
      });

      setBikes(sortedBikes);

    } catch (err) {
      showErrorToast(err, 'Erro ao buscar dados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleEdit = (bike: Bike) => {
      setSelectedBike(bike);
      setEditModalVisible(true);
  };

  const getStationName = (id: number | null) => {
      if (!id) return undefined;
      return stations.find(s => s.id === id)?.name;
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Gestão de Frota</Text>
        <View style={{width: 50}} />
      </View>
      
      <FlatList
        data={bikes}
        renderItem={({ item }) => (
            <BikeAdminCard 
                bike={item} 
                stationName={getStationName(item.last_station_id)}
                onEdit={handleEdit}
            />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma bicicleta encontrada.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      />

      <BikeEditModal
        isVisible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onUpdate={onRefresh}
        bike={selectedBike}
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

export default AdminBikesDashboardScreen;