import React from 'react';
import { TouchableOpacity, StyleSheet, Alert, Linking, StyleProp, ViewStyle, Image } from 'react-native';
import Colors from '@/constants/Colors';

const SUPPORT_PHONE_NUMBER = '+5521973594295';

interface SupportButtonProps {
  style?: StyleProp<ViewStyle>;
}

const SupportButton = ({ style }: SupportButtonProps) => {
  const handleSupportPress = () => {
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
          onPress: () => Linking.openURL(`whatsapp://send?phone=${SUPPORT_PHONE_NUMBER}`).catch(() => {
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp. Verifique se ele está instalado.');
          }),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity style={[styles.fab, style]} onPress={handleSupportPress} activeOpacity={0.7}>
      <Image
        source={require('../../../assets/images/central-de-atendimento.png')}
        style={styles.icon}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  icon: {
    width: 42,
    height: 42,
  },
});

export default SupportButton;