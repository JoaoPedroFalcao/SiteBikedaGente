import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import MaskInput, { Mask } from 'react-native-mask-input';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface LabeledInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label: string;
  required?: boolean;
  mask?: Mask;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  onIconPress?: () => void;
  onChangeText?: (maskedOrSimpleText: string, unmasked?: string) => void; 
}

const LabeledInput = ({ label, required, mask, iconName, onIconPress, ...props }: LabeledInputProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
      <View style={styles.inputContainer}>
        {mask ? (
          <MaskInput
            {...props}
            mask={mask}
            style={styles.input}
            placeholderTextColor={Colors.textSecondary}
          />
        ) : (
          <TextInput
            {...props}
            style={styles.input}
            placeholderTextColor={Colors.textSecondary}
          />
        )}
        {iconName && (
          <TouchableOpacity onPress={onIconPress} style={styles.icon}>
            <MaterialIcons name={iconName} size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  asterisk: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 55,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.text,
  },
  icon: {
    padding: 10,
  },
});

export default LabeledInput;