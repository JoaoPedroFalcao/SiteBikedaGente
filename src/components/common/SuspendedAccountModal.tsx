import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

const SUPPORT_PHONE = '5521973594295'; // Seu número de suporte

const SuspendedAccountModal = () => {
  const { suspendedUntil, signOut } = useAuth();

  const suspensionDetails = useMemo(() => {
    if (!suspendedUntil) return null;
    
    const endDate = new Date(suspendedUntil);
    const now = new Date();

    // Se a data de suspensão já passou, não mostra o modal
    if (endDate <= now) return null;

    return {
        date: endDate.toLocaleDateString('pt-BR'),
        time: endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  }, [suspendedUntil]);

  if (!suspensionDetails) return null;

  const handleContactSupport = () => {
    Linking.openURL(`whatsapp://send?phone=${SUPPORT_PHONE}&text=Ola, minha conta foi suspensa e gostaria de entender o motivo.`);
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
             <MaterialIcons name="block" size={50} color={Colors.surface} />
          </View>
          
          <Text style={styles.title}>Conta Suspensa</Text>
          
          <Text style={styles.message}>
            Identificamos irregularidades no uso do serviço. Para garantir a segurança da comunidade, sua conta está temporariamente bloqueada.
          </Text>

          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Liberada em:</Text>
            <Text style={styles.dateValue}>{suspensionDetails.date} às {suspensionDetails.time}</Text>
          </View>
          
          <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
            <MaterialIcons name="support-agent" size={20} color={Colors.primary} style={{marginRight: 8}} />
            <Text style={styles.supportButtonText}>Falar com Suporte</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)', // Fundo bem escuro
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: '100%',
    elevation: 10,
  },
  iconContainer: {
    backgroundColor: Colors.error,
    padding: 15,
    borderRadius: 50,
    marginBottom: 20,
    marginTop: -50, // Efeito de ícone saindo do card
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    color: Colors.error,
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  dateBox: {
    backgroundColor: '#FFEBEE', // Fundo vermelho claro
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  dateLabel: {
    fontSize: 14,
    color: Colors.error,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 20,
    color: Colors.error,
    fontFamily: 'Montserrat_700Bold',
  },
  supportButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  supportButtonText: {
    color: Colors.primary,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: Colors.textSecondary,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.surface,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
});

export default SuspendedAccountModal;