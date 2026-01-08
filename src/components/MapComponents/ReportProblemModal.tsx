import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { supabase } from '@/api/supabase';
import { Ride } from '@/types';
import { showSuccessToast, showErrorToast } from '@/utils/errorHandler';

interface ReportProblemModalProps {
  ride: Ride | null;
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ReportType = 'bike' | 'station';

const ReportProblemModal = ({ ride, isVisible, onClose, onSuccess }: ReportProblemModalProps) => {
  const insets = useSafeAreaInsets();
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reportType) {
      showErrorToast({ message: 'Por favor, selecione o tipo de problema.' });
      return;
    }
    if (!description) {
      showErrorToast({ message: 'Por favor, descreva o problema.' });
      return;
    }
    if (!ride) {
      showErrorToast({ message: 'ID da corrida não encontrado.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('problem_reports')
      .insert({
        ride_id: ride.id,
        user_id: ride.user_id,
        type: reportType,
        description: description,
        bike_id: ride.bike_id,
        station_id: ride.end_station_id
      });

    setLoading(false);

    if (error) {
      showErrorToast(error, 'Não foi possível enviar seu reporte.');
    } else {
      showSuccessToast('Obrigado!', 'Seu reporte foi enviado e será analisado.');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { marginBottom: insets.bottom }]}>
          <Text style={styles.modalTitle}>Reportar um Problema</Text>
          <Text style={styles.label}>Qual o tipo de problema?</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.typeButton, reportType === 'bike' && styles.typeButtonSelected]}
              onPress={() => setReportType('bike')}
            >
              <Text style={[styles.typeButtonText, reportType === 'bike' && styles.typeButtonTextSelected]}>Bicicleta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, reportType === 'station' && styles.typeButtonSelected]}
              onPress={() => setReportType('station')}
            >
              <Text style={[styles.typeButtonText, reportType === 'station' && styles.typeButtonTextSelected]}>Vaga / Estação</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Descreva o problema em detalhes..."
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitButtonText}>{loading ? 'Enviando...' : 'Enviar Reporte'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', backgroundColor: Colors.surface, padding: 22, borderRadius: 20, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontFamily: 'Montserrat_700Bold', marginBottom: 20, color: Colors.text },
    label: { fontSize: 16, fontFamily: 'Montserrat_600SemiBold', color: Colors.textSecondary, marginBottom: 10, alignSelf: 'flex-start' },
    buttonGroup: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 20 },
    typeButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', marginHorizontal: 5 },
    typeButtonSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeButtonText: { color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
    typeButtonTextSelected: { color: Colors.surface },
    input: { width: '100%', height: 120, backgroundColor: Colors.background, borderRadius: 10, padding: 15, textAlignVertical: 'top', marginBottom: 20, fontFamily: 'Montserrat_400Regular' },
    submitButton: { backgroundColor: Colors.error, padding: 15, borderRadius: 10, alignItems: 'center', width: '100%' },
    submitButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
    closeButton: { marginTop: 15, padding: 10 },
    closeButtonText: { color: Colors.primary, fontSize: 16, fontFamily: 'Montserrat_600SemiBold' },
});

export default ReportProblemModal;
