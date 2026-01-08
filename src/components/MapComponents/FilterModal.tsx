import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectFilter: (filter: 'bikes' | 'slots') => void;
}

const FilterModal = ({ isVisible, onClose, onSelectFilter }: FilterModalProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalContainer}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View style={[styles.filterModalContent, { top: insets.top + 80, left: 20 + 56 + 10 }]}>
          <Text style={styles.filterModalTitle}>Filtrar Por:</Text>
          <TouchableOpacity
            style={styles.filterOptionButton}
            onPress={() => onSelectFilter('bikes')}
          >
            <Text style={styles.filterOptionText}>Bicicletas disponíveis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterOptionButton}
            onPress={() => onSelectFilter('slots')}
          >
            <Text style={styles.filterOptionText}>Vagas livres</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  filterModalContent: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  filterOptionButton: {
    paddingVertical: 10,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#007BFF',
  },
});

export default FilterModal;
