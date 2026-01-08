// src/components/MapComponents/MapControls.tsx

import React from 'react';
// 1. Importar o 'Text'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'; 
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface MapControlsProps {
  onFilterPress: () => void;
  onCenterPress: () => void;
  onProfilePress: () => void;
  onListPress: () => void;
}

const MapControls = ({ onFilterPress, onCenterPress, onProfilePress, onListPress }: MapControlsProps) => {
  return (
    <>
      <View style={styles.fabContainerLeft}>
        {/* 2. Adicionar o <Text> para cada botão */}
        <TouchableOpacity onPress={onFilterPress} style={styles.fab}>
          <MaterialIcons name="filter-list" size={24} color={Colors.surface} />
          <Text style={styles.fabText}>Filtros</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCenterPress} style={styles.fab}>
          <MaterialIcons name="my-location" size={24} color={Colors.surface} />
          <Text style={styles.fabText}>Localizar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onListPress} style={styles.fab}>
          <MaterialIcons name="list" size={24} color={Colors.surface} />
          <Text style={styles.fabText}>Lista</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.fabContainerRight}>
        <TouchableOpacity onPress={onProfilePress} style={styles.fab}>
          <MaterialIcons name="person" size={24} color={Colors.surface} />
          <Text style={styles.fabText}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainerLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    alignItems: 'center',
    gap: 12,
  },
  fabContainerRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 64,  
    height: 72, 
    borderRadius: 16, 
    backgroundColor: Colors.primary, 
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: Colors.surface,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    marginTop: 4,
  }
});

export default MapControls;