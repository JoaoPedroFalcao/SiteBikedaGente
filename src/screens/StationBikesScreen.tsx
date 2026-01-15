import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { supabase } from '@/api/supabase';
import { Bike, Station } from '@/types';
import { useRide } from '@/contexts/RideContext';

export default function StationBikesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { station } = route.params as { station: Station };
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const { startRemoteRide, isLoading: rideLoading } = useRide();

  const fetchBikes = useCallback(async () => {
    setLoading(true);
    try {
      // Traz apenas bikes disponíveis e ordenadas pela posição da trava
      const { data, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('station_id', station.id)
        .eq('status', 'available')
        .order('current_lock_position', { ascending: true });

      if (error) throw error;
      setBikes(data || []);
    } catch (error) {
      console.error('[StationBikesScreen] Erro ao buscar bikes:', error);
    } finally {
      setLoading(false);
    }
  }, [station.id]);

  useEffect(() => {
    fetchBikes();
  }, [fetchBikes]);

  const handleSelectBike = (bike: Bike) => {
    if (rideLoading) return;

    Alert.alert(
      'Confirmar Retirada',
      `Deseja liberar a Bike ${bike.id} que está na Trava ${bike.current_lock_position}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          style: 'default',
          onPress: async () => {
            // @ts-ignore
            const success = await startRemoteRide(bike, station);
            if (success) {
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  const renderBikeCard = ({ item }: { item: Bike }) => {
    const bikeNumber = item.id.toString().replace(/\D/g, '');

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => handleSelectBike(item)}
        activeOpacity={0.7}
        disabled={rideLoading}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="bike" size={25} color={Colors.primary} style={styles.bikeIconSmall} />
          <Text style={styles.bikeIdText}>Trava #{item.current_lock_position}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.lockLabel}>BIKE</Text>
          <View style={styles.lockNumberContainer}>
            <MaterialCommunityIcons name="lock-outline" size={28} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.lockNumberBig}>{bikeNumber}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.unlockActionText}>LIBERAR</Text>
          <Ionicons name="arrow-forward-circle" size={20} color={Colors.surface} style={{ paddingLeft: 10 }}/>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header da Tela */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close-circle-outline" size={32} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTexts}>
          <Text style={styles.headerSubtitle}>Retirar Bicicleta em</Text>
          <Text style={styles.headerTitle}>{station.name}</Text>
        </View>
      </View>

      <FlatList
        data={bikes}
        renderItem={renderBikeCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchBikes}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <Text style={styles.listHeaderLabel}>
            {bikes.length > 0
              ? `Escolha uma das ${bikes.length} bicicletas disponíveis:`
              : ''}
          </Text>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="bike-fast" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Poxa, nenhuma bicicleta disponível nesta estação agora.</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={fetchBikes}>
                <Text style={styles.refreshButtonText}>Atualizar</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {rideLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Enviando comando de destrava...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    marginRight: 15,
  },
  headerTexts: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Montserrat_400Regular',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listHeaderLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 15,
    marginLeft: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bikeIconSmall: {
    marginRight: 6,
    opacity: 0.8,
  },
  bikeIdText: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.textSecondary,
  },
  cardBody: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockLabel: {
    fontSize: 20,
    textTransform: 'uppercase',
    color: '#999',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  lockNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockNumberBig: {
    fontSize: 42,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.primary,
    includeFontPadding: false,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  unlockActionText: {
    color: Colors.surface,
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  refreshButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontFamily: 'Montserrat_600SemiBold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingBox: {
    backgroundColor: Colors.surface,
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Montserrat_600SemiBold',
  },
});