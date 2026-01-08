import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ride, Profile } from '@/types';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface RideForReview extends Ride {
  profiles: Pick<Profile, 'full_name'> | null;
}

interface ReviewCardProps {
  ride: RideForReview;
  onApprove: (rideId: number, amount: number, reason: string) => void;
  onReject: (rideId: number) => void;
}

const ReviewCard = ({ ride, onApprove, onReject }: ReviewCardProps) => {
  const penaltyAmount = ride.penalty_reason?.includes('72 horas') ? 1500 : 500;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Revisão Pendente</Text>
      <View style={styles.infoRow}>
        <MaterialIcons name="person" size={16} color={Colors.textSecondary} />
        <Text style={styles.label}>Usuário:</Text>
        <Text style={styles.value}>{ride.profiles?.full_name || 'Desconhecido'}</Text>
      </View>
      <View style={styles.infoRow}>
        <MaterialIcons name="event" size={16} color={Colors.textSecondary} />
        <Text style={styles.label}>Data da Corrida:</Text>
        <Text style={styles.value}>{new Date(ride.started_at).toLocaleDateString('pt-BR')}</Text>
      </View>
      <View style={styles.infoRow}>
        <MaterialIcons name="pedal-bike" size={16} color={Colors.textSecondary} />
        <Text style={styles.label}>Bicicleta:</Text>
        <Text style={styles.value}>{ride.bike_id}</Text>
      </View>
      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>Motivo da Punição Sugerida:</Text>
        <Text style={styles.reasonText}>{ride.penalty_reason}</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.rejectButton]} 
          onPress={() => onReject(ride.id)}
        >
          <Text style={[styles.buttonText, { color: Colors.error }]}>Rejeitar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.approveButton]} 
          onPress={() => onApprove(ride.id, penaltyAmount, ride.penalty_reason || 'Taxa aprovada pelo administrador')}
        >
          <Text style={[styles.buttonText, { color: Colors.surface }]}>Aprovar Cobrança (R$ {penaltyAmount})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.text,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.textSecondary,
    marginLeft: 8,
    marginRight: 5,
  },
  value: {
    fontFamily: 'Montserrat_400Regular',
    color: Colors.text,
  },
  reasonBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  reasonLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.textSecondary,
    fontSize: 12,
  },
  reasonText: {
    fontFamily: 'Montserrat_400Regular',
    color: Colors.text,
    fontSize: 14,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  buttonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
});

export default ReviewCard;