import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { supabase } from '@/api/supabase';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { Station } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
// 1. Importar o contexto MQTT
import { useMqtt } from '@/contexts/MqttContext';

interface DockStatus {
  id: number;
  status: '0' | '1';
  bike_id: string | null;
}

interface BikeManagementModalProps {
  isVisible: boolean;
  onClose: () => void;
  station: Station;
  dock: DockStatus | null;
}

const BikeManagementModal = ({ isVisible, onClose, station, dock }: BikeManagementModalProps) => {
  const insets = useSafeAreaInsets();
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [availableBikes, setAvailableBikes] = useState<{ id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBikeList, setShowBikeList] = useState(false);

  // 2. Usar o hook MQTT
  const { publish } = useMqtt();

  useEffect(() => {
    if (dock) {
      setSelectedBikeId(dock.bike_id);
    }
    if (isVisible) {
      fetchAvailableBikes();
    }
  }, [dock, isVisible]);

  if (!dock) return null;

  const fetchAvailableBikes = async () => {
    try {
      const { data: freeBikes, error } = await supabase
        .from('bikes')
        .select('id')
        .or('status.eq.available,status.eq.maintenance')
        .is('current_dock_id', null)
        .order('id', { ascending: true });
      
      if (error) throw error;

      let bikesToShow = freeBikes || [];

      if (dock.bike_id) {
        const isCurrentBikeInList = bikesToShow.some(b => b.id === dock.bike_id);
        if (!isCurrentBikeInList) {
          bikesToShow.push({ id: dock.bike_id });
        }
      }

      const getBikeNumber = (id: string) => {
        const match = id.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      };

      bikesToShow.sort((a, b) => {
        const numA = getBikeNumber(a.id);
        const numB = getBikeNumber(b.id);
        return numA - numB;
      });
      
      setAvailableBikes(bikesToShow);

    } catch (err) {
      showErrorToast(err, 'Erro ao buscar bicicletas disponíveis.');
    }
  };

  const handleUpdateBike = async (fieldsToUpdate: { [key: string]: any }, successMessage: string, bikeToUpdate: string | null) => {
    if (!bikeToUpdate) {
      showErrorToast({ message: 'Nenhuma bicicleta selecionada.' });
      return;
    }
    setLoading(true);
    try {
      if (selectedBikeId !== dock.bike_id) {
          await supabase
            .from('bikes')
            .update({ current_dock_id: null, last_station_id: null })
            .eq('id', bikeToUpdate);
      }

      const { error } = await supabase.from('bikes').update(fieldsToUpdate).eq('id', bikeToUpdate);
      if (error) throw error;

      if (dock.bike_id && dock.bike_id !== selectedBikeId) {
          await supabase
            .from('bikes')
            .update({ current_dock_id: null, last_station_id: null, status: 'available' })
            .eq('id', dock.bike_id);
      }

      showSuccessToast('Sucesso!', successMessage);
      onClose();
    } catch (err) {
      showErrorToast(err, 'Falha ao atualizar a bicicleta.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssociate = () => {
    handleUpdateBike(
      { status: 'available', current_dock_id: dock.id, last_station_id: station.id },
      `Bicicleta ${selectedBikeId} associada à vaga ${dock.id}.`,
      selectedBikeId
    );
  };

  const handleSetMaintenance = () => {
    handleUpdateBike(
      { status: 'maintenance', current_dock_id: dock.id, last_station_id: station.id },
      `Bicicleta ${selectedBikeId} marcada como "em manutenção".`,
      selectedBikeId
    );
  };

  const handleDissociate = () => {
    handleUpdateBike(
      { status: 'available', current_dock_id: null, last_station_id: null },
      `Bicicleta ${dock?.bike_id} desassociada da vaga.`,
      dock?.bike_id
    );
  };

  // 3. Nova função para abrir a trava via MQTT
  const handleOpenLock = () => {
    Alert.alert(
      "Abrir Trava Manualmente",
      `Deseja enviar o comando para ABRIR a trava da Vaga ${dock.id} na Estação ${station.id}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar Comando",
          onPress: async () => {
            try {
              // Tópico: estacaoX/selecaobike
              // Mensagem: bikeY (onde Y é o número da trava)
              const topic = `estacao${station.id}/selecaobike`;
              const message = `bike${dock.id}`;
              
              console.log(`[Admin] Enviando comando manual: Tópico=${topic}, Msg=${message}`);
              await publish(topic, message);
              
              showSuccessToast("Comando Enviado", `Sinal de abertura enviado para a Vaga ${dock.id}.`);
            } catch (error) {
              showErrorToast(error, "Falha ao enviar comando MQTT.");
            }
          }
        }
      ]
    );
  };
  
  const renderBikeItem = ({ item }: { item: { id: string } }) => (
    <TouchableOpacity 
      style={styles.bikeItem} 
      onPress={() => {
        setSelectedBikeId(item.id);
        setShowBikeList(false);
      }}
    >
      <Text style={styles.bikeItemText}>{item.id}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { marginBottom: insets.bottom }]}>
          <Text style={styles.modalTitle}>Gerenciar Vaga {dock.id}</Text>
          
          <Text style={styles.label}>Bicicleta</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowBikeList(!showBikeList)}>
            <Text style={styles.selectButtonText}>{selectedBikeId || 'Selecione uma bicicleta'}</Text>
            <MaterialIcons name={showBikeList ? "arrow-drop-up" : "arrow-drop-down"} size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          {showBikeList && (
            <FlatList
              data={availableBikes}
              renderItem={renderBikeItem}
              keyExtractor={(item) => item.id}
              style={styles.bikeList}
              ListEmptyComponent={<Text style={styles.emptyListText}>Nenhuma outra bike livre encontrada.</Text>}
            />
          )}
          
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }}/>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, !selectedBikeId && styles.disabledButton]} 
                onPress={handleAssociate} 
                disabled={!selectedBikeId}>
                <Text style={styles.actionButtonText}>Associar / Marcar Disponível</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, {backgroundColor: Colors.accent}, !selectedBikeId && styles.disabledButton]} 
                onPress={handleSetMaintenance} 
                disabled={!selectedBikeId}>
                <Text style={[styles.actionButtonText, {color: Colors.text}]}>Marcar "Em Manutenção"</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, {backgroundColor: Colors.error}, !dock.bike_id && styles.disabledButton]} 
                onPress={handleDissociate} 
                disabled={!dock.bike_id}>
                <Text style={styles.actionButtonText}>Desassociar Bike Atual ({dock.bike_id || 'N/A'})</Text>
              </TouchableOpacity>

              {/* 4. Novo Botão de Abrir Trava */}
              <View style={styles.divider} />
              <TouchableOpacity 
                style={[styles.actionButton, {backgroundColor: '#2196F3'}]} 
                onPress={handleOpenLock}>
                <MaterialIcons name="lock-open" size={20} color={Colors.surface} style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Abrir Trava</Text>
              </TouchableOpacity>

            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', backgroundColor: Colors.surface, padding: 22, borderRadius: 20, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontFamily: 'Montserrat_700Bold', marginBottom: 20, color: Colors.text },
    label: { fontSize: 16, fontFamily: 'Montserrat_600SemiBold', color: Colors.textSecondary, marginBottom: 10, alignSelf: 'flex-start' },
    selectButton: { width: '100%', height: 50, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    selectButtonText: { fontFamily: 'Montserrat_400Regular', fontSize: 16, color: Colors.text },
    bikeList: { width: '100%', maxHeight: 150, marginTop: 5, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
    bikeItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
    bikeItemText: { fontSize: 16, color: Colors.text },
    emptyListText: { padding: 15, textAlign: 'center', color: Colors.textSecondary, fontStyle: 'italic' },
    buttonContainer: { width: '100%', marginTop: 20 },
    actionButton: { backgroundColor: Colors.success, padding: 15, borderRadius: 10, alignItems: 'center', width: '100%', marginBottom: 10, justifyContent: 'center', height: 55, flexDirection: 'row' },
    actionButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
    disabledButton: {
        backgroundColor: Colors.textSecondary,
        opacity: 0.7,
    },
    closeButton: { marginTop: 5, padding: 10 },
    closeButtonText: { color: Colors.primary, fontSize: 16, fontFamily: 'Montserrat_600SemiBold' },
    divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10, width: '100%' },
});

export default BikeManagementModal;