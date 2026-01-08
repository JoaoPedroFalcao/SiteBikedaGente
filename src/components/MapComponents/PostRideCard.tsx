import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface PostRideCardProps {
  onReportProblem: () => void;
  onRateRide: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

const PostRideCard = ({ onReportProblem, onRateRide }: PostRideCardProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.card, { bottom: insets.bottom + 10 }]}>
      <Text style={styles.cardTitle}>Corrida Finalizada!</Text>
      <Text style={styles.cardSubtitle}>Como foi sua viagem? Seu feedback é importante.</Text>
      
      <TouchableOpacity style={styles.button} onPress={onRateRide}>
        <MaterialIcons name="star" size={20} color={Colors.surface} style={styles.icon} />
        <Text style={styles.buttonText}>Avaliar Viagem</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, { backgroundColor: Colors.error }]} onPress={onReportProblem}>
        <MaterialIcons name="report-problem" size={20} color={Colors.surface} style={styles.icon} />
        <Text style={styles.buttonText}>Reportar Problema</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    position: 'absolute',
    left: (width - CARD_WIDTH) / 2,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    marginTop: 10,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  icon: {
    marginRight: 10,
  },
});

export default PostRideCard;
