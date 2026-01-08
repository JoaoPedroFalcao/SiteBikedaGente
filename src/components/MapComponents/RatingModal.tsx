import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { supabase } from '@/api/supabase';
import { Ride } from '@/types';
import { showSuccessToast, showErrorToast } from '@/utils/errorHandler';

interface RatingModalProps {
  ride: Ride | null;
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RatingModal = ({ ride, isVisible, onClose, onSuccess }: RatingModalProps) => {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setRating(0);
      setComment('');
      setSubmitted(false);
      setLoading(false);
    }
  }, [isVisible]);

  const handleSubmit = async () => {
    if (rating === 0) {
      showErrorToast({ message: 'Por favor, selecione uma avaliação de 1 a 5 estrelas.' });
      return;
    }
    if (!ride) {
      showErrorToast({ message: 'ID da corrida não encontrado.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('ride_evaluations')
      .insert({
        ride_id: ride.id,
        user_id: ride.user_id,
        rating: rating,
        comment: comment,
      });
    
    setLoading(false);

    if (error) {
      showErrorToast(error, 'Não foi possível enviar sua avaliação.');
      } else {
        showSuccessToast('Obrigado!', 'Sua avaliação foi enviada com sucesso.');
        setSubmitted(true);

        if (onSuccess) {
          onSuccess(); // Chama a função de sucesso se ela existir
        }
        onClose();
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
          <Text style={styles.modalTitle}>Avalie sua Viagem</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} disabled={submitted}>
                <MaterialIcons
                  name={star <= rating ? 'star' : 'star-border'}
                  size={40}
                  color={submitted ? Colors.border : Colors.accent}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Deixe um comentário (opcional)..."
            value={comment}
            onChangeText={setComment}
            multiline
            editable={!submitted}
          />
          <TouchableOpacity 
            style={[styles.submitButton, (loading || submitted) && styles.disabledButton]} 
            onPress={handleSubmit} 
            disabled={loading || submitted}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>
                {submitted ? 'Avaliação Enviada!' : 'Enviar Avaliação'}
              </Text>
            )}
          </TouchableOpacity>
          {!submitted && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', backgroundColor: Colors.surface, padding: 22, borderRadius: 20, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontFamily: 'Montserrat_700Bold', marginBottom: 20, color: Colors.text },
    starsContainer: { flexDirection: 'row', marginBottom: 20 },
    input: {
        width: '100%',
        height: 100,
        backgroundColor: Colors.background,
        borderRadius: 10,
        padding: 15,
        textAlignVertical: 'top',
        marginBottom: 20,
        fontFamily: 'Montserrat_400Regular',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    submitButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', width: '100%', height: 55, justifyContent: 'center' },
    disabledButton: { backgroundColor: Colors.textSecondary },
    submitButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
    closeButton: { marginTop: 15, padding: 10 },
    closeButtonText: { color: Colors.primary, fontSize: 16, fontFamily: 'Montserrat_600SemiBold' },
});

export default RatingModal;
