import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Station } from '@/types';
import { supabase } from '@/api/supabase';
import { RootStackScreenProps } from '@/navigation/types';
import { showErrorToast } from '@/utils/errorHandler';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface StationWithDistance extends Station {
  distance: number | null;
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const StationListScreen = ({ navigation }: RootStackScreenProps<'StationList'>) => {
  const insets = useSafeAreaInsets();
  const [stations, setStations] = useState<StationWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  const fetchStationsAndSort = useCallback(async (location: Location.LocationObject) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('stations').select('*');
      if (error) throw error;

      const stationsWithDistance = data
        .map(station => ({
          ...station,
          distance: getDistance(
            location.coords.latitude,
            location.coords.longitude,
            station.latitude,
            station.longitude
          ),
        }))
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      setStations(stationsWithDistance);
    } catch (err) {
      showErrorToast(err, 'Erro ao buscar estações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showErrorToast({ message: 'Permissão de localização negada.' });
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      fetchStationsAndSort(location);
    };
    getLocation();
  }, [fetchStationsAndSort]);

  const handleNavigate = (station: Station) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${station.latitude},${station.longitude}`;
    const label = station.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    Linking.openURL(url!);
  };

  const renderItem = ({ item }: { item: StationWithDistance }) => (
    <View style={styles.stationCard}>
      <View style={styles.stationInfo}>
        <Text style={styles.stationName}>{item.id} - {item.name}</Text>
        <Text style={styles.stationDistance}>
          {item.distance ? `${item.distance.toFixed(2)} km de distância` : 'Calculando...'}
        </Text>
      </View>
      <TouchableOpacity style={styles.navigateButton} onPress={() => handleNavigate(item)}>
        <MaterialIcons name="directions" size={24} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text>Buscando estações...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Mapa</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estações Próximas</Text>
        <View style={{ width: 50 }} />
      </View>
      <FlatList
        data={stations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma estação encontrada.</Text>}
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
  listContent: { padding: 15 },
  stationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.text,
  },
  stationDistance: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  navigateButton: {
    padding: 10,
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.textSecondary,
  }
});

export default StationListScreen;
