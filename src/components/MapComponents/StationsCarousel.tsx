// src/components/MapComponents/StationsCarousel.tsx

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native'; // Removido Alert
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Station } from '@/types';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

interface StationWithStatus extends Station {
  available_bikes: number;
  available_slots: number;
}

interface StationsCarouselProps {
  stations: StationWithStatus[];
  cooldownTimeLeft: string;
  onScroll: (event: any) => void;
  onCardPress: (index: number) => void;
  selectedIndex: number | null;
  totalStations: number;
  onArrowPress: (newIndex: number) => void;
}

const { width } = Dimensions.get('window');
export const CARD_WIDTH = width * 0.9;
export const SPACING = 10;

const StationsCarousel = forwardRef<ScrollView, StationsCarouselProps>(
  ({ stations, cooldownTimeLeft, onScroll, onCardPress, selectedIndex, totalStations, onArrowPress }, ref) => {
    const insets = useSafeAreaInsets();

    const handlePrev = () => {
      const currentIdx = selectedIndex ?? 0; // Assume 0 se nada selecionado
      if (currentIdx > 0) {
        onArrowPress(currentIdx - 1);
      }
    };

    const handleNext = () => {
      const currentIdx = selectedIndex ?? 0; // Assume 0 se nada selecionado
      if (currentIdx < totalStations - 1) {
        onArrowPress(currentIdx + 1);
      }
    };

    // Lógica de desabilitar baseada no índice selecionado (ou 0 se null)
    const isPrevDisabled = (selectedIndex ?? 0) === 0;
    const isNextDisabled = (selectedIndex ?? 0) === totalStations - 1;

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.carouselContainer, { bottom: insets.bottom + 10 }]}
        contentContainerStyle={styles.carouselContentContainer}
        snapToInterval={CARD_WIDTH + SPACING}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {stations.map((station, index) => {
          const noBikes = station.available_bikes === 0;
          const isDisabled = !!cooldownTimeLeft || noBikes;

          let buttonText = 'Ver detalhes e Retirar Bike';
          if (cooldownTimeLeft) {
            buttonText = `Aguarde ${cooldownTimeLeft}`;
          } else if (noBikes) {
            buttonText = 'Nenhuma bicicleta disponível';
          }

          return (
            // Container relativo para cada card e suas setas
            <View style={styles.cardContainer} key={station.id}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{station.name}</Text>
                <View style={styles.divider} />
                {/* View para aplicar padding às infoRows */}
                <View style={styles.infoContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🚲</Text>
                    <Text style={styles.infoText}>Bicicletas disponíveis: {station.available_bikes}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🅿️</Text>
                    <Text style={styles.infoText}>Vagas livres: {station.available_slots}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.detailsButton, isDisabled && styles.disabledButton]}
                  onPress={() => onCardPress(index)}
                  disabled={isDisabled}
                >
                  <Text style={styles.detailsButtonText}>{buttonText}</Text>
                </TouchableOpacity>
              </View>

              {/* Setas posicionadas absolutamente DENTRO do cardContainer */}
              {/* --- REMOVIDA A CONDIÇÃO selectedIndex === index --- */}
              {/* Só mostra as setas se houver mais de uma estação */}
              {totalStations > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.arrowLeft, isPrevDisabled && styles.arrowDisabled]}
                    onPress={handlePrev}
                    disabled={isPrevDisabled}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {/* Renderiza a seta esquerda sempre, mas desabilita visualmente se necessário */}
                    <MaterialIcons name="chevron-left" size={36} color={isPrevDisabled ? Colors.textSecondary : Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.arrowRight, isNextDisabled && styles.arrowDisabled]}
                    onPress={handleNext}
                    disabled={isNextDisabled}
                     hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                     {/* Renderiza a seta direita sempre, mas desabilita visualmente se necessário */}
                    <MaterialIcons name="chevron-right" size={36} color={isNextDisabled ? Colors.textSecondary : Colors.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  carouselContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  carouselContentContainer: {
     paddingHorizontal: (width - CARD_WIDTH) / 2, // Centraliza os cards
     paddingBottom: 10, // Espaço inferior
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: SPACING / 2,
    position: 'relative', // Para posicionar as setas dentro
  },
  card: {
    backgroundColor: Colors.surface,
    paddingVertical: 20,
    paddingHorizontal: 15, // Padding horizontal do card
    borderRadius: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
    // Adiciona padding para não colar nas setas se o título for longo
    paddingHorizontal: 30, // Espaço para as setas laterais
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  infoContent: {
    paddingHorizontal: 25, // <<< Aumentado o padding para afastar mais o texto das setas
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoIcon: { fontSize: 18, marginRight: 8 },
  infoText: { fontSize: 15, fontFamily: 'Montserrat_400Regular', color: Colors.text },
  detailsButton: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  disabledButton: { backgroundColor: Colors.textSecondary },
  detailsButtonText: { color: Colors.surface, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  // Estilos das setas ajustados para posicionamento DENTRO do cardContainer
  arrowButton: {
    position: 'absolute',
    top: '50%', // Aproximadamente no meio vertical
    marginTop: -25, // Metade da altura da área de toque da seta (ajuste fino)
    zIndex: 10, // Garante que fiquem sobre o conteúdo
    padding: 5, // Área de toque
    // --- ESTILOS VISUAIS OPCIONAIS PARA AS SETAS ---
    // backgroundColor: Colors.surface + 'B3', // Fundo semi-transparente
    // borderRadius: 18, // Para deixar redondo se tiver fundo
  },
  arrowLeft: {
    left: 5, // Posição da seta esquerda (próxima à borda INTERNA)
  },
  arrowRight: {
    right: 5, // Posição da seta direita (próxima à borda INTERNA)
  },
  arrowDisabled: {
    opacity: 0.2, // Mais transparente quando desativada
  },
});

export default StationsCarousel;