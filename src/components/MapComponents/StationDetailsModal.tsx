import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Station } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import { RootStackScreenProps } from '@/navigation/types';
import { MaterialIcons } from '@expo/vector-icons';

type NavigationProps = RootStackScreenProps<'App'>['navigation'];

interface StationWithStatus extends Station {
  available_bikes: number;
  available_slots: number;
}

interface StationDetailsModalProps {
  station: StationWithStatus | null;
  isVisible: boolean;
  onClose: () => void;
  onRent: () => void;
  isRenting: boolean;
  isParentLoading: boolean;
}

const StationDetailsModal = ({ station, isVisible, onClose, onRent, isRenting, isParentLoading }: StationDetailsModalProps) => {
  const insets = useSafeAreaInsets();
  const { userRole } = useAuth();
  const navigation = useNavigation<NavigationProps>();
  
  // Estado para saber se é "horário comercial" (05h - 23h)
  const [isBusinessHours, setIsBusinessHours] = useState(true);

  // Função auxiliar para pegar a hora de Brasília (UTC-3)
  const getBrasiliaHour = () => {
    const now = new Date();
    let hour = now.getUTCHours() - 3;
    if (hour < 0) hour += 24;
    return hour;
  };

  useEffect(() => {
    if (isVisible) {
      const hour = getBrasiliaHour();
      // Aberto se for >= 5 E < 23
      const isOpen = hour >= 5 && hour < 23;
      setIsBusinessHours(isOpen);
    }
  }, [isVisible]);

  if (!station) return null;

  const handleManageStation = () => {
    onClose();
    navigation.navigate('AdminStationDetail', { station });
  };

  const handleNavigate = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${station.latitude},${station.longitude}`;
    const label = station.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    Linking.openURL(url!);
  };
  
  // --- LÓGICA DOS 3 ESTADOS ---
  const mode = station.operation_mode || 'auto'; // Fallback para auto se nulo
  let isStationOpen = false;
  let statusText = '';
  let statusColor = Colors.textSecondary;
  let buttonText = 'Retirar Bicicleta';
  let buttonIcon: keyof typeof MaterialIcons.glyphMap = 'qr-code-scanner';

  switch (mode) {
    case 'offline':
      isStationOpen = false;
      statusText = 'Offline (Manutenção)';
      statusColor = Colors.error;
      buttonText = 'Estação Offline';
      buttonIcon = 'signal-wifi-off';
      break;

    case 'online':
      isStationOpen = true;
      statusText = 'Online';
      statusColor = Colors.success;
      break;

    case 'auto':
      // No modo auto, depende do horário
      if (isBusinessHours) {
        isStationOpen = true;
        statusText = 'Horário de funcionamento 05h as 23h - Aberto';
        statusColor = Colors.success;
      } else {
        isStationOpen = false;
        statusText = 'Horário de funcionamento 05h as 23h - Fechado';
        statusColor = Colors.accent; // Amarelo/Laranja para alerta de horário
        buttonText = 'Estação Fechada';
        buttonIcon = 'access-time';
      }
      break;
  }

  const noBikesAvailable = station.available_bikes === 0;
  
  // Se estiver aberta, verifica se tem bike. Se fechada, já bloqueia.
  if (isStationOpen && noBikesAvailable) {
      buttonText = 'Nenhuma bike disponível';
      buttonIcon = 'error-outline';
  }

  const isDisabled = 
    noBikesAvailable || 
    isRenting || 
    isParentLoading || 
    !isStationOpen; // Bloqueio principal baseado no status calculado

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { marginBottom: insets.bottom }]}>
          <View style={styles.titleContainer}>
            <Text style={styles.modalTitle}>{station.id} - {station.name}</Text>
          </View>
          
          {/* Exibição do Status Dinâmico */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>

          <View style={styles.infoRow}>
             <Text style={styles.infoLabel}>🚲 Disponíveis:</Text>
             <Text style={styles.infoValue}>{station.available_bikes}</Text>
          </View>
          <View style={styles.infoRow}>
             <Text style={styles.infoLabel}>🅿️ Vagas:</Text>
             <Text style={styles.infoValue}>{station.available_slots}</Text>
          </View>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
            <MaterialIcons name="directions" size={20} color={Colors.surface} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Como Chegar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.rentButton, isDisabled && styles.disabledButton]} 
            onPress={onRent}
            disabled={isDisabled}
          >
            {isRenting ? <ActivityIndicator color={Colors.surface} /> : (
              <>
                <MaterialIcons name={buttonIcon} size={20} color={Colors.surface} style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>{buttonText}</Text>
              </>
            )}
          </TouchableOpacity>

          {userRole === 'admin' && (
            <TouchableOpacity style={[styles.adminButton]} onPress={handleManageStation}>
              <MaterialIcons name="admin-panel-settings" size={20} color={Colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.actionButtonText, { color: Colors.text }]}>Gerenciar Estação</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '90%', backgroundColor: Colors.surface, padding: 20, borderRadius: 20, alignItems: 'center' },
  titleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 5 },
  modalTitle: { flex: 1, fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start', backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8, width: '100%' },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: Colors.text },

  infoRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 5 },
  infoLabel: { fontSize: 16, fontFamily: 'Montserrat_400Regular', color: Colors.textSecondary },
  infoValue: { fontSize: 16, fontFamily: 'Montserrat_700Bold', color: Colors.text },

  actionButton: { flexDirection: 'row', backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, width: '100%', height: 50 },
  rentButton: { flexDirection: 'row', backgroundColor: Colors.success, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, width: '100%', height: 55 },
  adminButton: { flexDirection: 'row', backgroundColor: Colors.accent, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, width: '100%', height: 50 },
  actionButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  disabledButton: { backgroundColor: Colors.textSecondary },
  closeButton: { marginTop: 10, padding: 10 },
  closeButtonText: { color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
});

export default StationDetailsModal;