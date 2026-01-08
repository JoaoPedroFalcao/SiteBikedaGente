import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Colors from '@/constants/Colors';
import { supabase } from '@/api/supabase';
import { Bike, Station } from '@/types';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { MaterialIcons } from '@expo/vector-icons';

interface BikeEditModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  bike: Bike | null;
  stations: Station[];
}

const BikeEditModal = ({ isVisible, onClose, onUpdate, bike, stations }: BikeEditModalProps) => {
  const [status, setStatus] = useState<Bike['status']>('available');
  const [stationId, setStationId] = useState<string>('');
  const [dockId, setDockId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showStationList, setShowStationList] = useState(false);

  useEffect(() => {
    if (bike) {
      setStatus(bike.status);
      setStationId(bike.last_station_id ? String(bike.last_station_id) : '');
      setDockId(bike.current_dock_id ? String(bike.current_dock_id) : '');
    }
  }, [bike]);

  const handleSave = async () => {
    if (!bike) return;

    setLoading(true);
    try {
      const updates = {
        status: status,
        last_station_id: stationId ? parseInt(stationId) : null,
        current_dock_id: dockId ? parseInt(dockId) : null,
      };

      const { error } = await supabase
        .from('bikes')
        .update(updates)
        .eq('id', bike.id);

      if (error) throw error;

      showSuccessToast('Sucesso', `Bicicleta ${bike.id} atualizada.`);
      onUpdate();
      onClose();

    } catch (error: any) {
      showErrorToast(error, 'Erro ao atualizar bicicleta.');
    } finally {
      setLoading(false);
    }
  };

  const getStationName = (id: string) => {
    const s = stations.find(st => st.id === parseInt(id));
    return s ? `${s.id} - ${s.name}` : 'Sem estação (Solta)';
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Bike {bike?.id}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form}>
            
            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusRow}>
              {/* REMOVIDO: 'low_battery' */}
              {(['available', 'in_use', 'maintenance'] as const).map((s) => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.statusButton, status === s && styles.statusButtonActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusText, status === s && styles.statusTextActive]}>
                    {s === 'available' ? 'Disp.' : s === 'in_use' ? 'Em Uso' : 'Manut.'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Estação Atual:</Text>
            <TouchableOpacity 
              style={styles.selectButton} 
              onPress={() => setShowStationList(!showStationList)}
            >
              <Text style={styles.selectButtonText}>{stationId ? getStationName(stationId) : 'Nenhuma (Solta/Em Uso)'}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color={Colors.text} />
            </TouchableOpacity>

            {showStationList && (
              <View style={styles.stationList}>
                <TouchableOpacity 
                    style={styles.stationItem} 
                    onPress={() => { setStationId(''); setDockId(''); setShowStationList(false); }}
                >
                    <Text style={[styles.stationItemText, {color: Colors.error}]}>Remover da Estação</Text>
                </TouchableOpacity>
                {stations.map(s => (
                  <TouchableOpacity 
                    key={s.id} 
                    style={styles.stationItem} 
                    onPress={() => { setStationId(String(s.id)); setShowStationList(false); }}
                  >
                    <Text style={styles.stationItemText}>{s.id} - {s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Número da Trava (Dock ID):</Text>
            <TextInput 
              style={styles.input} 
              value={dockId} 
              onChangeText={setDockId} 
              keyboardType="numeric"
              placeholder="Ex: 1, 2... (Deixe vazio se não estiver travada)"
            />

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    <Text style={{fontWeight: 'bold'}}>Nota:</Text> Se a bicicleta estiver "Em Uso" (alugada), remova a estação e a trava.
                </Text>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Salvar Alterações</Text>}
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 15, maxHeight: '90%', elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  form: { padding: 20 },
  label: { fontSize: 14, fontFamily: 'Montserrat_600SemiBold', color: Colors.textSecondary, marginTop: 15, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: Colors.text, fontFamily: 'Montserrat_400Regular' },
  
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 5 },
  statusButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusText: { color: Colors.textSecondary, fontFamily: 'Montserrat_600SemiBold', fontSize: 14 },
  statusTextActive: { color: Colors.surface },

  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12 },
  selectButtonText: { fontSize: 14, color: Colors.text, fontFamily: 'Montserrat_400Regular' },
  
  stationList: { maxHeight: 200, borderWidth: 1, borderColor: Colors.border, marginTop: 5, borderRadius: 8, backgroundColor: '#f9f9f9' },
  stationItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  stationItemText: { fontSize: 14, color: Colors.text },

  saveButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  
  infoBox: { backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, marginTop: 20 },
  infoText: { color: '#0D47A1', fontSize: 12, fontFamily: 'Montserrat_400Regular' }
});

export default BikeEditModal;