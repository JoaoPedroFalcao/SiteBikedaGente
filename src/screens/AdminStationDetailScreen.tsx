import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMqtt } from '@/contexts/MqttContext';
import { supabase } from '@/api/supabase';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import Colors from '@/constants/Colors';
import BikeManagementModal from '@/components/AdminComponents/BikeManagementModal';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

type DockStatus = {
  id: number;
  status: '0' | '1';
  bike_id: string | null;
};

// Tipo local para o modo, já que o tipo Station global pode demorar a propagar no TS
type OperationMode = 'online' | 'offline' | 'auto';

const AdminStationDetailScreen = ({ navigation, route }: RootStackScreenProps<'AdminStationDetail'>) => {
  const { station } = route.params;
  const insets = useSafeAreaInsets();
  const { messages, subscribe, unsubscribe } = useMqtt();
  
  const [docks, setDocks] = useState<DockStatus[]>(() => 
    Array.from({ length: 12 }, (_, i) => ({ id: i + 1, status: '0', bike_id: null }))
  );
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedDock, setSelectedDock] = useState<DockStatus | null>(null);
  
  // Estado local para o modo de operação
  const [operationMode, setOperationMode] = useState<OperationMode>((station.operation_mode as OperationMode) || 'auto');
  const [updatingMode, setUpdatingMode] = useState(false);

  const statusTopic = `estacao${station.id}/travas`;
  const docksRef = useRef(docks);
  
  useEffect(() => { docksRef.current = docks; }, [docks]);

  const fetchBikeAssociations = useCallback(async () => {
    setLoading(true);
    try {
      // Busca bikes (lógica existente)
      const { data: bikesInStation, error } = await supabase
        .from('bikes')
        .select('id, current_dock_id')
        .eq('last_station_id', station.id)
        .not('current_dock_id', 'is', null);

      if (error) throw error;
      
      const bikeMap = new Map<number, string>();
      bikesInStation.forEach(b => { if (b.current_dock_id) bikeMap.set(b.current_dock_id, b.id); });

      setDocks(currentDocks => currentDocks.map(dock => ({ ...dock, bike_id: bikeMap.get(dock.id) || null })));
      
      // --- NOVO: Atualiza também o modo de operação para garantir sincronia ---
      const { data: currentStation } = await supabase
        .from('stations')
        .select('operation_mode')
        .eq('id', station.id)
        .single();
        
      if (currentStation) {
        setOperationMode(currentStation.operation_mode as OperationMode);
      }

    } catch (error) {
      showErrorToast(error, 'Erro ao buscar dados da estação.');
    } finally {
      setLoading(false);
    }
  }, [station.id]);

  useFocusEffect(
    useCallback(() => {
      subscribe(statusTopic);
      fetchBikeAssociations();
      return () => unsubscribe(statusTopic);
    }, [station.id, subscribe, unsubscribe, fetchBikeAssociations])
  );
  
  // ... (useEffect do MQTT existente permanece igual) ...
  useEffect(() => {
    const dockStatusString = messages.get(statusTopic);
    if (dockStatusString && dockStatusString.length === 12) {
      const currentDocks = docksRef.current;
      const currentStatusString = currentDocks.map(d => d.status).join('');
      if (dockStatusString === currentStatusString) return;

      setDocks(currentDocks.map((dock, index) => {
          const newStatus = dockStatusString[index] as '0' | '1';
          return { ...dock, status: newStatus, bike_id: newStatus === '0' ? null : dock.bike_id };
        })
      );
    }
  }, [messages, statusTopic]);

  const handleManagePress = (dock: DockStatus) => {
    setSelectedDock(dock);
    setModalVisible(true);
  };
  
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedDock(null);
    fetchBikeAssociations();
  };

  // --- NOVA FUNÇÃO: MUDAR MODO DE OPERAÇÃO ---
  const handleChangeMode = async (newMode: OperationMode) => {
    if (newMode === operationMode) return;
    
    setUpdatingMode(true);
    try {
        const { error } = await supabase
            .from('stations')
            .update({ 
                operation_mode: newMode,
                is_online: newMode !== 'offline' // Mantém is_online sincronizado para compatibilidade
            })
            .eq('id', station.id);

        if (error) throw error;

        setOperationMode(newMode);
        showSuccessToast('Sucesso', `Modo alterado para: ${newMode.toUpperCase()}`);
    } catch (error) {
        showErrorToast(error, 'Falha ao alterar modo de operação.');
    } finally {
        setUpdatingMode(false);
    }
  };

  const renderDockItem = ({ item }: { item: DockStatus }) => (
    <View style={styles.dockRow}>
      <View style={[styles.statusIndicator, { backgroundColor: item.status === '1' ? Colors.error : Colors.success }]} />
      <Text style={styles.dockText}>
        Vaga {item.id}: <Text style={{ fontFamily: 'Montserrat_700Bold' }}>{item.status === '1' ? 'Ocupada' : 'Livre'}</Text>
      </Text>
      {item.bike_id && <Text style={styles.bikeIdText}>ID: {item.bike_id}</Text>}
      <TouchableOpacity style={styles.actionButton} onPress={() => handleManagePress(item)}>
        <Text style={styles.actionButtonText}>Gerenciar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{station.name}</Text>
          <View style={{ width: 50 }} />
        </View>
        
        {/* --- NOVO: CONTROLE DE MODO DE OPERAÇÃO --- */}
        <View style={styles.modeControlContainer}>
            <Text style={styles.sectionTitle}>Modo de Operação</Text>
            <View style={styles.modeButtonsWrapper}>
                <TouchableOpacity 
                    style={[styles.modeButton, operationMode === 'online' && styles.modeButtonActive, { borderColor: Colors.success }]}
                    onPress={() => handleChangeMode('online')}
                    disabled={updatingMode}
                >
                    <MaterialIcons name="check-circle" size={20} color={operationMode === 'online' ? 'white' : Colors.success} />
                    <Text style={[styles.modeButtonText, operationMode === 'online' && styles.modeButtonTextActive]}>Online</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.modeButton, operationMode === 'auto' && styles.modeButtonActive, { borderColor: Colors.accent }]}
                    onPress={() => handleChangeMode('auto')}
                    disabled={updatingMode}
                >
                    <MaterialIcons name="access-time" size={20} color={operationMode === 'auto' ? 'white' : Colors.accent} />
                    <Text style={[styles.modeButtonText, operationMode === 'auto' && styles.modeButtonTextActive]}>Auto</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.modeButton, operationMode === 'offline' && styles.modeButtonActive, { borderColor: Colors.error }]}
                    onPress={() => handleChangeMode('offline')}
                    disabled={updatingMode}
                >
                    <MaterialIcons name="block" size={20} color={operationMode === 'offline' ? 'white' : Colors.error} />
                    <Text style={[styles.modeButtonText, operationMode === 'offline' && styles.modeButtonTextActive]}>Offline</Text>
                </TouchableOpacity>
            </View>
            {updatingMode && <ActivityIndicator size="small" color={Colors.primary} style={{marginTop: 5}}/>}
        </View>
        {/* ------------------------------------------ */}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }}/>
        ) : (
          <FlatList
            data={docks}
            renderItem={renderDockItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={<Text style={styles.listHeader}>Status das Vagas</Text>}
            extraData={messages}
          />
        )}
      </View>
      <BikeManagementModal 
        isVisible={isModalVisible}
        onClose={handleModalClose}
        station={station}
        dock={selectedDock}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: Colors.text, flex: 1, textAlign: 'center' },
  backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold', width: 50 },
  listContent: { padding: 20 },
  listHeader: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: Colors.text, marginBottom: 15, marginTop: 10 },
  dockRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  dockText: { flex: 1, fontSize: 16, fontFamily: 'Montserrat_400Regular', color: Colors.text },
  bikeIdText: { fontSize: 14, fontFamily: 'Montserrat_400Regular', color: Colors.textSecondary, marginRight: 10 },
  actionButton: { backgroundColor: Colors.accent, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  actionButtonText: { color: Colors.text, fontFamily: 'Montserrat_600SemiBold' },
  
  // Estilos para o controle de modo
  modeControlContainer: { backgroundColor: Colors.surface, padding: 15, marginBottom: 10, elevation: 2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: { fontSize: 16, fontFamily: 'Montserrat_700Bold', color: Colors.textSecondary, marginBottom: 10, textAlign: 'center' },
  modeButtonsWrapper: { flexDirection: 'row', justifyContent: 'space-between' },
  modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1, borderRadius: 8, marginHorizontal: 5 },
  modeButtonActive: { backgroundColor: Colors.textSecondary }, // Cor base, sobrescrita pela lógica inline se necessário, ou melhor:
  modeButtonText: { marginLeft: 5, fontFamily: 'Montserrat_600SemiBold', color: Colors.text },
  modeButtonTextActive: { color: 'white' },
});

// Pequeno ajuste para garantir cores corretas no active
// No componente acima, usei inline styles para backgroundColor dos botões ativos baseado na cor do status
// Online = Green bg, Auto = Yellow bg, Offline = Red bg

export default AdminStationDetailScreen;