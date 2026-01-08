import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ride } from '@/types';
import Colors from '@/constants/Colors';
import { showSuccessToast } from '@/utils/errorHandler';
import { MaterialIcons } from '@expo/vector-icons';

interface ActiveRideCardProps {
  ride: Ride;
  onGoToReturnScanner: () => void;
  onConfirmAlreadyReturned: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

// 120 minutos = 2 horas
const RIDE_DURATION_LIMIT = 120 * 60 * 1000; 
const WARNING_TIME = 20 * 60 * 1000;

const SUPPORT_PHONE_NUMBER = '+5521973594295';

const ActiveRideCard = ({ ride, onGoToReturnScanner, onConfirmAlreadyReturned }: ActiveRideCardProps) => {
  const insets = useSafeAreaInsets();
  
  // --- FUNÇÃO AUXILIAR PARA FORMATAR O TEMPO (H:MM:SS) ---
  const formatTime = (ms: number) => {
    const isNegative = ms < 0;
    const absoluteMs = Math.abs(ms);

    const hours = Math.floor(absoluteMs / 3600000);
    const minutes = Math.floor((absoluteMs % 3600000) / 60000);
    const seconds = Math.floor((absoluteMs % 60000) / 1000);

    const sign = isNegative ? '-' : '';
    
    if (hours > 0) {
      return `${sign}${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const [timeLeft, setTimeLeft] = useState(() => {
    const startTime = new Date(ride.started_at).getTime();
    const now = Date.now();
    const elapsedTime = now - startTime;
    const remaining = RIDE_DURATION_LIMIT - elapsedTime;
    return formatTime(remaining);
  });

  const [timeStatus, setTimeStatus] = useState<'normal' | 'warning' | 'overtime'>('normal');
  const notificationShownRef = useRef(false);

  useEffect(() => {
    notificationShownRef.current = false;

    const updateTimer = () => {
      const startTime = new Date(ride.started_at).getTime();
      const now = Date.now();
      const elapsedTime = now - startTime;
      const remainingTime = RIDE_DURATION_LIMIT - elapsedTime;

      if (remainingTime <= WARNING_TIME && remainingTime > 0 && !notificationShownRef.current) {
        showSuccessToast('Atenção!', 'Faltam menos de 20 minutos para o fim da sua corrida.');
        notificationShownRef.current = true;
      }

      if (remainingTime <= 0) {
        setTimeStatus('overtime');
      } else if (remainingTime < WARNING_TIME) {
        setTimeStatus('warning');
      } else {
        setTimeStatus('normal');
      }

      setTimeLeft(formatTime(remainingTime));
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [ride]);

  const handleHelpPress = () => {
    Alert.alert(
      'Precisa de Ajuda?',
      'Selecione uma opção para entrar em contato com nosso suporte.',
      [
        {
          text: 'Ligar para Suporte',
          onPress: () => Linking.openURL(`tel:${SUPPORT_PHONE_NUMBER}`),
        },
        {
          text: 'Enviar WhatsApp',
          onPress: () => Linking.openURL(`whatsapp://send?phone=${SUPPORT_PHONE_NUMBER}`),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const getTimerStyle = () => {
    switch (timeStatus) {
      case 'warning': return styles.warningText;
      case 'overtime': return styles.overtimeText;
      default: return styles.infoText;
    }
  };

  const getTimerLabel = () => {
    return timeStatus === 'overtime' ? 'Tempo excedido:' : 'Tempo restante:';
  }

  const showReturnOptions = () => {
    Alert.alert(
      "Confirmar Devolução",
      "Selecione uma opção:",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Já devolvi na estação",
          onPress: onConfirmAlreadyReturned
        },
        {
          text: "Ainda vou devolver (Escanear Trava)",
          onPress: onGoToReturnScanner
        }
      ]
    );
  };

  return (
    <View style={[styles.card, { bottom: insets.bottom + 10 }]}>
      <Text style={styles.cardTitle}>Corrida em Andamento</Text>
      
      <Text style={styles.securityMessage}>
        Para sua segurança, sua bike está sob acompanhamento contínuo.
      </Text>

      <View style={styles.divider} />
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>🚲</Text>
        <Text style={styles.infoText}>Bicicleta: {ride.bike_id}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>⏱️</Text>
        <Text style={getTimerStyle()}>
          {getTimerLabel()} {timeLeft}
        </Text>
      </View>
      {timeStatus === 'overtime' && <Text style={styles.overtimeAlert}>Devolva a bicicleta o mais rápido possível!</Text>}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.helpButton} onPress={handleHelpPress}>
            <MaterialIcons name="help-outline" size={20} color={Colors.primary} />
            <Text style={styles.helpButtonText}>Ajuda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endRideButton} onPress={showReturnOptions}>
            <Text style={styles.endRideButtonText}>Devolver</Text>
        </TouchableOpacity>
      </View>
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
        // A altura será definida pelo conteúdo
    },
    cardTitle: {
        fontSize: 22,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 5, // Reduzido para ficar perto da mensagem
        color: Colors.text,
        textAlign: 'center',
    },
    // --- NOVO ESTILO ---
    securityMessage: {
        fontSize: 15,
        fontFamily: 'Montserrat_400Regular',
        color: Colors.error,
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    // -------------------
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    infoText: {
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        color: Colors.text,
    },
    warningText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        color: Colors.accent,
    },
    overtimeText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        color: Colors.error,
    },
    overtimeAlert: {
      fontSize: 14,
      fontFamily: 'Montserrat_600SemiBold',
      color: Colors.error,
      textAlign: 'center',
      marginTop: 5,
      marginBottom: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    helpButton: {
        flex: 0.4, // Ajustado para caber melhor o texto "Ajuda"
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    helpButtonText: {
        color: Colors.primary,
        fontSize: 14,
        fontFamily: 'Montserrat_700Bold',
        marginLeft: 5,
    },
    endRideButton: {
        flex: 0.6,
        backgroundColor: Colors.error,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endRideButtonText: {
        color: Colors.surface,
        fontSize: 14,
        fontFamily: 'Montserrat_700Bold',
    },
});

export default ActiveRideCard;