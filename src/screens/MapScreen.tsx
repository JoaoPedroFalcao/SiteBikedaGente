// src/screens/MapScreen.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '@/api/supabase';
import { Station } from '@/types';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRide } from '@/contexts/RideContext';
import { useMqtt } from '@/contexts/MqttContext';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { showErrorToast } from '@/utils/errorHandler';
import SupportButton from '@/components/common/SupportButton';

import CustomMarker from '@/components/MapComponents/CustomMarker';
import StationsCarousel, { CARD_WIDTH, SPACING } from '@/components/MapComponents/StationsCarousel';
import StationDetailsModal from '@/components/MapComponents/StationDetailsModal';
import FilterModal from '@/components/MapComponents/FilterModal';
import MapControls from '@/components/MapComponents/MapControls';
import ActiveRideCard from '@/components/MapComponents/ActiveRideCard';
import PostRideCard from '@/components/MapComponents/PostRideCard';
import RatingModal from '@/components/MapComponents/RatingModal';
import ReportProblemModal from '@/components/MapComponents/ReportProblemModal';

interface StationWithStatus extends Station {
  available_bikes: number;
  available_slots: number;
}

// --- NOVAS CONSTANTES DE ALTURA ESTIMADA ---
// Ajuste esses valores se os cards ficarem muito diferentes no seu dispositivo
const CAROUSEL_HEIGHT = 220;
const ACTIVE_CARD_HEIGHT = 280; // Um pouco mais alto por causa da nova mensagem
const POST_RIDE_CARD_HEIGHT = 240;
// -------------------------------------------

const MapScreen = ({ navigation }: RootStackScreenProps<'App'>) => {
  const { activeRide, lastCompletedRide, isLoading: isRideLoading, cooldownEndTime, showPostRideCard, dismissPostRideCard} = useRide();
  const { has_payment_method, isIdentityVerified } = useAuth();

  const [stations, setStations] = useState<StationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStationIndex, setSelectedStationIndex] = useState<number | null>(null);
  const [isDetailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [initialZoomDone, setInitialZoomDone] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState('');
  const [markerDisplay, setMarkerDisplay] = useState<'bikes' | 'slots'>('bikes');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [isRenting, setIsRenting] = useState(false);

  const { status: mqttStatus, messages, subscribe, unsubscribe } = useMqtt();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const stationsRef = useRef(stations);

  // --- LÓGICA DINÂMICA PARA A POSIÇÃO DO BOTÃO DE SUPORTE ---
  let bottomContentHeight = CAROUSEL_HEIGHT; // Altura padrão (Carrossel)
  if (activeRide) {
    bottomContentHeight = ACTIVE_CARD_HEIGHT;
  } else if (showPostRideCard) {
    bottomContentHeight = POST_RIDE_CARD_HEIGHT;
  }
  
  // Posição final = Safe Area de baixo + Altura do conteúdo + um espaçamento extra (20)
  const supportButtonBottom = (insets.bottom || 20) + bottomContentHeight + 20;
  // ---------------------------------------------------------

  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);

  // --- Bloco useFocusEffect para buscar estações e se inscrever no MQTT ---
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const fetchAndSubscribe = async () => {
        setLoading(true);
        try {
          // --- ALTERAÇÃO AQUI: Adicionado display_order e .order() ---
          const { data: stationData, error } = await supabase
            .from('stations')
            .select('id, name, latitude, longitude, mqtt_topic, is_online, operation_mode, display_order')
            .order('display_order', { ascending: true }); // Ordena pelo novo campo
            
          if (error) throw error;

          if (isMounted && stationData) {
            const initialStations = stationData.map((s: any) => ({ 
              ...s, 
              ...parseStationStatus("000000000000") 
            }));
            setStations(initialStations);
            stationData.forEach((station: any) => {
              if (station.mqtt_topic) subscribe(station.mqtt_topic);
            });
          }
        } catch (e: any) {
          showErrorToast(e, 'Erro ao buscar estações');
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      fetchAndSubscribe();
      return () => {
        isMounted = false;
        stationsRef.current.forEach(station => {
          if (station.mqtt_topic) unsubscribe(station.mqtt_topic);
        });
      };
    }, [subscribe, unsubscribe])
  );

  // --- Bloco useEffect para permissão e obtenção da localização ---
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showErrorToast({ message: 'Permissão de localização negada.' });
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  // --- Bloco useEffect para gerenciar o timer de cooldown ---
  useEffect(() => {
    if (!cooldownEndTime) {
      setCooldownTimeLeft('');
      return;
    };
    const updateCooldownTimer = () => {
      const diff = cooldownEndTime.getTime() - Date.now();
      if (diff <= 0) { setCooldownTimeLeft(''); return; }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCooldownTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    updateCooldownTimer();
    const interval = setInterval(updateCooldownTimer, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndTime]);

  const parseStationStatus = (binaryStatus: string) => {
    if (typeof binaryStatus !== 'string' || binaryStatus.length !== 12) {
      return { available_bikes: 0, available_slots: 0 };
    }
    const available_bikes = (binaryStatus.match(/1/g) || []).length;
    const available_slots = (binaryStatus.match(/0/g) || []).length;
    return { available_bikes, available_slots };
  };

  // --- Bloco useEffect para atualizar o estado das estações com mensagens MQTT ---
  useEffect(() => {
    messages.forEach((status, topic) => {
      setStations(currentStations =>
        currentStations.map(s => s.mqtt_topic === topic ? { ...s, ...parseStationStatus(status) } : s)
      );
    });
  }, [messages]);

  // --- Bloco useEffect para realizar o zoom inicial no mapa ---
  useEffect(() => {
    if (!initialZoomDone && stations.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        stations.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
        { edgePadding: { top: 100, right: 50, bottom: 250, left: 50 }, animated: true }
      );
      setInitialZoomDone(true);
    }
  }, [stations, initialZoomDone]);

  const focusOnStation = (index: number) => {
    const station = stations[index];
    if (!station || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: station.latitude,
      longitude: station.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.005,
    }, 350);
  };

  const onMarkerPress = (index: number) => {
    if (isDetailsModalVisible) return;

    if (activeRide) {
        setSelectedStationIndex(index);
        focusOnStation(index);
        return;
    }

    if (selectedStationIndex === index) return;
    setSelectedStationIndex(index);
    focusOnStation(index);
    scrollRef.current?.scrollTo({ x: index * (CARD_WIDTH + SPACING), animated: true });
  };

  const onScroll = (event: any) => {
    if (activeRide) return;
    if (stations.length === 0) return;

    const scrollX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollX / (CARD_WIDTH + SPACING));
    if (newIndex !== selectedStationIndex && newIndex < stations.length) {
      setSelectedStationIndex(newIndex);
      focusOnStation(newIndex);
    }
  };

  const centerMapOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.005,
      });
    } else {
      showErrorToast({ message: "Localização não encontrada" });
    }
  };

 const handleRentAttempt = () => {
    const station = stations[selectedStationIndex ?? -1];
    if (!station) return;

    if (!isIdentityVerified) {
      Alert.alert("Cadastro Incompleto", "Para retirar uma bicicleta, complete sua verificação de identidade.",
        [{ text: "Cancelar", style: "cancel" }, { text: "Completar", onPress: () => { setDetailsModalVisible(false); navigation.navigate('IdentityVerification', { readOnly: false }); }}]
      );
      return;
    }
    if (!has_payment_method) {
      Alert.alert("Cartão Necessário", "É necessário ter um cartão válido como garantia.",
        [{ text: "Cancelar", style: "cancel" }, { text: "Adicionar", onPress: () => { setDetailsModalVisible(false); navigation.navigate('Wallet'); }}]
      );
      return;
    }
    setDetailsModalVisible(false);
    navigation.navigate('QRScanner', { action: 'rent' });
  };

  const handleSubmissionSuccess = () => {
    setRatingModalVisible(false);
    setReportModalVisible(false);
    dismissPostRideCard();
  };

  const handleGoToReturnScanner = () => {
    navigation.navigate('QRScanner', { action: 'return', returnMethod: 'scan_and_wait' });
  };

  const handleConfirmAlreadyReturned = () => {
    navigation.navigate('QRScanner', { action: 'return', returnMethod: 'already_returned' });
  };

  const handleArrowPress = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < stations.length) {
      setSelectedStationIndex(newIndex);
      focusOnStation(newIndex);
      const targetX = newIndex * (CARD_WIDTH + SPACING);
      scrollRef.current?.scrollTo({ x: targetX, animated: true });
    }
  }, [stations]);

  const selectedStation = stations[selectedStationIndex ?? -1];

  if (isRideLoading || loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ width: 50 }}><View style={[styles.statusIndicator, { backgroundColor: mqttStatus === 'connected' ? Colors.success : Colors.error }]} /></View>
        <Text style={styles.headerText}>{activeRide ? 'Sua Corrida' : 'Estações'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: -22.543324664738805,
            longitude: -42.89404925767255,
            latitudeDelta: 0.01,
            longitudeDelta: 0.005,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {stations.map((station, index) => (
            <Marker
              key={station.id}
              coordinate={{ latitude: station.latitude, longitude: station.longitude }}
              onPress={() => onMarkerPress(index)}
            >
              <CustomMarker
                count={markerDisplay === 'bikes' ? station.available_bikes : station.available_slots}
                isSelected={selectedStationIndex === index}
              />
            </Marker>
          ))}
        </MapView>

        {/* --- MENSAGEM DE SEGURANÇA REMOVIDA DAQUI --- */}

        <MapControls
          onFilterPress={() => setFilterModalVisible(true)}
          onCenterPress={centerMapOnUser}
          onProfilePress={() => navigation.navigate('Profile')}
          onListPress={() => navigation.navigate('StationList')}
        />

        {activeRide ? (
          <ActiveRideCard
            ride={activeRide}
            onGoToReturnScanner={handleGoToReturnScanner}
            onConfirmAlreadyReturned={handleConfirmAlreadyReturned}
          />
        ) : showPostRideCard ? (
          <PostRideCard
            onRateRide={() => setRatingModalVisible(true)}
            onReportProblem={() => setReportModalVisible(true)}
          />
        ) : (
          <StationsCarousel
            ref={scrollRef}
            stations={stations}
            cooldownTimeLeft={cooldownTimeLeft}
            onScroll={onScroll}
            onCardPress={(index) => {
              setSelectedStationIndex(index);
              focusOnStation(index);
              setDetailsModalVisible(true);
            }}
            selectedIndex={selectedStationIndex}
            totalStations={stations.length}
            onArrowPress={handleArrowPress}
          />
        )}

        {/* --- BOTÃO DE SUPORTE COM POSIÇÃO DINÂMICA --- */}
        <SupportButton style={{ bottom: supportButtonBottom }} />
        {/* -------------------------------------------- */}

      </View>

      <StationDetailsModal
        station={selectedStation}
        isVisible={isDetailsModalVisible}
        onClose={() => setDetailsModalVisible(false)}
        onRent={handleRentAttempt}
        isRenting={isRenting}
        isParentLoading={loading || isRideLoading}
      />
      <FilterModal
        isVisible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onSelectFilter={(filter) => {
          setMarkerDisplay(filter);
          setFilterModalVisible(false);
        }}
      />
      <RatingModal
        isVisible={isRatingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        ride={lastCompletedRide}
        onSuccess={handleSubmissionSuccess}
      />
      <ReportProblemModal
        isVisible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        ride={lastCompletedRide}
        onSuccess={handleSubmissionSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerText: { fontSize: 22, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  statusIndicator: { width: 12, height: 12, borderRadius: 6 },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Estilos instructionContainer e instructionText REMOVIDOS pois não são mais usados aqui
});

export default MapScreen;