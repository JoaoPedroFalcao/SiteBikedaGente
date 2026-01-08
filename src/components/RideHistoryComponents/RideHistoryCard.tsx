import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ride } from '@/types';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface RideWithStationNames extends Ride {
  start_station_name: string | null;
  end_station_name: string | null;
}

interface RideHistoryCardProps {
  ride: RideWithStationNames;
  onRatePress: (ride: Ride) => void;
}

const calculateDuration = (start: string, end: string | null | undefined) => {
  if (!end) return 'N/A';
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const RideHistoryCard = ({ ride, onRatePress }: RideHistoryCardProps) => {
  const evaluation = ride.ride_evaluations && ride.ride_evaluations[0];

  return (
    <View style={styles.rideCard}>
      <Text style={styles.rideDate}>
        {new Date(ride.started_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}
      </Text>
      <View style={styles.rideInfo}>
        <Text style={styles.rideDetail}>🚲 Bicicleta: {ride.bike_id}</Text>
        <Text style={styles.rideDetail}>⏱️ Duração: {calculateDuration(ride.started_at, ride.ended_at)}</Text>
      </View>
      <View style={styles.stationInfo}>
        <Text style={styles.stationText}>De: {ride.start_station_name}</Text>
        <Text style={styles.stationText}>Para: {ride.end_station_name}</Text>
      </View>
      <View style={styles.evaluationSection}>
        {evaluation ? (
          <View style={styles.evaluationContainer}>
            <View style={styles.starsContainer}>
              <Text style={styles.evaluationLabel}>Sua Avaliação:</Text>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons
                  key={star}
                  name={star <= evaluation.rating ? 'star' : 'star-border'}
                  size={22}
                  color={Colors.accent}
                />
              ))}
            </View>
            {evaluation.comment && (
              <Text style={styles.commentText}>"{evaluation.comment}"</Text>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.rateButton} onPress={() => onRatePress(ride)}>
            <Text style={styles.rateButtonText}>Avaliar Viagem</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rideCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideDate: { fontSize: 16, fontFamily: 'Montserrat_600SemiBold', marginBottom: 10, color: Colors.textSecondary },
  rideInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rideDetail: { fontSize: 16, fontFamily: 'Montserrat_400Regular' },
  stationInfo: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  stationText: { fontSize: 15, color: Colors.text, fontFamily: 'Montserrat_400Regular' },
  evaluationSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  evaluationContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  evaluationLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.textSecondary,
    marginRight: 8,
  },
  commentText: {
    fontFamily: 'Montserrat_400Regular',
    color: Colors.text,
    fontStyle: 'italic',
    marginTop: 8,
    marginLeft: 5,
  },
  rateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
  },
  rateButtonText: {
    color: Colors.surface,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
});

export default RideHistoryCard;
