import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import Colors from '@/constants/Colors';
import { AntDesign } from '@expo/vector-icons'; // Biblioteca de ícones padrão do Expo

interface GoogleLoginButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  text?: string;
}

const GoogleLoginButton = ({ onPress, isLoading, text = "Entrar com Google" }: GoogleLoginButtonProps) => {
  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={onPress} 
      disabled={isLoading}
      activeOpacity={0.8}
    >
      <View style={styles.contentWrapper}>
        {/* Usamos AntDesign pois possui o logo do Google */}
        <AntDesign name="google" size={24} color={Colors.text} style={styles.icon} />
        <Text style={styles.text}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.surface, // Fundo branco
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
    // Sombra para dar destaque (padrão Material Design para botão Google)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.text, // Texto escuro
  },
});

export default GoogleLoginButton;