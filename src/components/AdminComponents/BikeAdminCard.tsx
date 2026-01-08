import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bike } from '@/types';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface BikeAdminCardProps {
  bike: Bike;
  stationName?: string;
  onEdit: (bike: Bike) => void;
}

const BikeAdminCard = ({ bike, stationName, onEdit }: BikeAdminCardProps) => {
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'available': return Colors.success;
      case 'in_use': return '#2196F3'; // Azul
      case 'maintenance': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'available': return 'Disponível';
      case 'in_use': return 'Em Uso';
      case 'maintenance': return 'Manutenção';
      default: return status;
    }
  };

  // Verifica se a bike está devidamente acoplada (tem estação E trava)
  const isDocked = bike.last_station_id && bike.current_dock_id;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
            <MaterialIcons name="pedal-bike" size={20} color={Colors.text} style={{marginRight: 8}} />
            <Text style={styles.cardTitle}>Bike {bike.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bike.status) }]}>
             <Text style={styles.statusText}>{getStatusLabel(bike.status).toUpperCase()}</Text>
        </View>
      </View>

      {/* --- BOX DE LOCALIZAÇÃO COM DESTAQUE --- */}
      <View style={[
          styles.locationContainer, 
          isDocked ? styles.locationDocked : styles.locationLoose
      ]}>
        <MaterialIcons 
            name={isDocked ? "dock" : "location-off"} 
            size={24} 
            color={isDocked ? '#2E7D32' : '#C62828'} 
            style={{ marginRight: 12 }}
        />
        <View style={{flex: 1}}>
            <Text style={[styles.locationLabel, { color: isDocked ? '#1B5E20' : '#B71C1C' }]}>
                {isDocked ? 'TRAVADA NA ESTAÇÃO' : 'FORA DE TRAVA / SOLTA'}
            </Text>
            <Text style={styles.locationValue}>
                {isDocked 
                    ? `${stationName || `Estação ${bike.last_station_id}`} (Vaga ${bike.current_dock_id})` 
                    : 'A bicicleta não está acoplada.'}
            </Text>
        </View>
      </View>
      {/* -------------------------------------- */}

      {bike.battery_level !== undefined && (
        <View style={styles.infoRow}>
            <Text style={styles.label}>Bateria:</Text>
            <Text style={[styles.value, { color: (bike.battery_level < 20) ? Colors.error : Colors.success }]}>
                {bike.battery_level}%
            </Text>
        </View>
      )}

      <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => onEdit(bike)}>
            <MaterialIcons name="edit" size={16} color={Colors.primary} style={{ marginRight: 5 }}/>
            <Text style={styles.editButtonText}>Editar / Mover</Text>
          </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 10, padding: 15, marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusText: { color: 'white', fontSize: 11, fontFamily: 'Montserrat_700Bold' },
  
  // Novos estilos para destacar a localização
  locationContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1 },
  locationDocked: { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }, // Verde suave
  locationLoose: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }, // Vermelho suave
  locationLabel: { fontSize: 11, fontFamily: 'Montserrat_700Bold', marginBottom: 2 },
  locationValue: { fontSize: 15, fontFamily: 'Montserrat_600SemiBold', color: Colors.text },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: 5 },
  label: { fontFamily: 'Montserrat_600SemiBold', color: Colors.textSecondary, marginRight: 5, fontSize: 14 },
  value: { fontFamily: 'Montserrat_400Regular', color: Colors.text, fontSize: 14, flex: 1 },
  
  actionsRow: { marginTop: 5, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  editButton: { flexDirection: 'row', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff' },
  editButtonText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: Colors.primary },
});

export default BikeAdminCard;