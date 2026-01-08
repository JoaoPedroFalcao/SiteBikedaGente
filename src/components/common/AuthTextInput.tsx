import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, TouchableOpacity } from 'react-native';
import MaskInput, { Mask } from 'react-native-mask-input';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface AuthTextInputProps extends TextInputProps {
  mask?: Mask;
  isPassword?: boolean;
}

const AuthTextInput = ({ mask, isPassword, ...props }: AuthTextInputProps) => {
  const InputComponent = mask ? MaskInput : TextInput;
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (!isPassword) {
    return (
      <InputComponent
        style={styles.input}
        placeholderTextColor="#8A8A8A"
        // @ts-ignore
        mask={mask}
        {...props}
      />
    );
  }

  return (
    <View style={styles.passwordContainer}>
      <TextInput
        style={styles.inputPassword}
        placeholderTextColor="#8A8A8A"
        secureTextEntry={!isPasswordVisible} 
        {...props}
      />
      <TouchableOpacity 
        style={styles.eyeIcon} 
        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
      >
        <MaterialIcons 
          name={isPasswordVisible ? 'visibility' : 'visibility-off'} 
          size={24} 
          color={Colors.textSecondary} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
    color: '#212529',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 55,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  inputPassword: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#212529',
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
  },
});

export default AuthTextInput;