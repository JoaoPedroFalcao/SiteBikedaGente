import Colors from '@/constants/Colors';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CustomMarkerProps {
  count: number;
  isSelected: boolean;
}

const CustomMarker = ({ count, isSelected }: CustomMarkerProps) => {
  const markerColor = isSelected ? Colors.primary : '#8A8A8A'; 
  const containerStyle = isSelected ? styles.selectedContainer : null;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.bubble, { backgroundColor: markerColor }]}>
        <Text style={styles.text}>{count}</Text>
      </View>
      <View style={[styles.arrow, { borderTopColor: markerColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 42,
  },
  selectedContainer: {
    transform: [{ scale: 1.15 }],
  },
  bubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8A8A8A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowRadius: 3,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  arrow: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderTopWidth: 10,
    borderRightWidth: 6,
    borderLeftWidth: 6,
    alignSelf: 'center',
    marginTop: -3,
  },
});
export default CustomMarker;