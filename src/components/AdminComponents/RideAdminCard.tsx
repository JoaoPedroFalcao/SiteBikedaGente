import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ride } from '@/types';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface RideAdminCardProps {
  ride: Ride;
  onApplyFee: (ride: Ride) => void;
  onEdit: (ride: Ride) => void;
  onSuspend: (ride: Ride) => void; // <--- NOVA PROP
}

const RideAdminCard = ({ ride, onApplyFee, onEdit, onSuspend }: RideAdminCardProps) => {
  // ... (funções calculateDuration e formatDate permanecem iguais) ...
  const calculateDuration = (start: string, end: string | null | undefined) => {
    if (!end) {
      const diff = Date.now() - new Date(start).getTime();
      const hours = Math.floor(diff / 3600000);
      return `Em andamento por ${hours}h`;
    }
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };
  // ...

  const isFlagged = ride.payment_status === 'pending_review';

  return (
    <View style={[styles.card, isFlagged && styles.flaggedCard]}>
      {/* ... (Cabeçalho e Infos da corrida permanecem iguais) ... */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Corrida #{ride.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: ride.status === 'active' ? Colors.success : (ride.status === 'completed' ? Colors.textSecondary : Colors.error) }]}>
             <Text style={styles.statusText}>{ride.status === 'active' ? 'ATIVA' : (ride.status === 'completed' ? 'CONCLUÍDA' : 'CANCELADA')}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Data:</Text>
        <Text style={styles.value}>{formatDate(ride.started_at)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Usuário:</Text>
        <Text style={styles.value}>{ride.profiles?.full_name || 'N/A'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Bicicleta:</Text>
        <Text style={styles.value}>{ride.bike_id}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Duração:</Text>
        <Text style={styles.value}>{calculateDuration(ride.started_at, ride.ended_at)}</Text>
      </View>
      
      {ride.penalty_reason && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>{isFlagged ? 'Motivo da Sinalização:' : 'Taxa Aplicada:'}</Text>
          <Text style={styles.reasonText}>{ride.penalty_reason}</Text>
        </View>
      )}

      <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(ride)}>
            <MaterialIcons name="edit" size={16} color={Colors.primary} style={{ marginRight: 5 }}/>
            <Text style={[styles.actionButtonText, {color: Colors.primary}]}>Editar</Text>
          </TouchableOpacity>

          {/* --- NOVO BOTÃO SUSPENDER --- */}
          <TouchableOpacity style={[styles.actionButton, styles.suspendButton]} onPress={() => onSuspend(ride)}>
            <MaterialIcons name="block" size={16} color={Colors.surface} style={{ marginRight: 5 }}/>
            <Text style={[styles.actionButtonText, {color: Colors.surface}]}>Banir</Text>
          </TouchableOpacity>
          {/* ---------------------------- */}

          {ride.payment_status !== 'succeeded' && (
            <TouchableOpacity style={[styles.actionButton, styles.feeButton]} onPress={() => onApplyFee(ride)}>
              <MaterialIcons name="attach-money" size={16} color={Colors.surface} style={{ marginRight: 5 }}/>
              <Text style={[styles.actionButtonText, {color: Colors.surface}]}>Multar</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (estilos anteriores) ...
  card: { backgroundColor: Colors.surface, borderRadius: 8, padding: 15, marginBottom: 10, elevation: 2 },
  flaggedCard: { borderColor: Colors.error, borderWidth: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: 'white', fontSize: 10, fontFamily: 'Montserrat_700Bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  label: { fontFamily: 'Montserrat_600SemiBold', color: Colors.textSecondary, marginRight: 5, fontSize: 14 },
  value: { fontFamily: 'Montserrat_400Regular', color: Colors.text, fontSize: 14 },
  reasonBox: { backgroundColor: '#FFF3CD', borderRadius: 4, padding: 8, marginTop: 8 },
  reasonLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: '#856404' },
  reasonText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#856404' },

  actionsRow: { flexDirection: 'row', marginTop: 15, gap: 8 }, // gap ajustado
  actionButton: { flex: 1, flexDirection: 'row', padding: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  editButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  feeButton: { backgroundColor: Colors.accent }, // Mudei para amarelo/accent para diferenciar
  suspendButton: { backgroundColor: Colors.error }, // Botão de banir vermelho
  actionButtonText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12 }, // Fonte um pouco menor para caber
});

export default RideAdminCard;