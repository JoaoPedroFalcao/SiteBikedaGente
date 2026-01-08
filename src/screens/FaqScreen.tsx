import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { supabase } from '@/api/supabase';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { showErrorToast } from '@/utils/errorHandler';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const FaqListItem = ({ item }: { item: FaqItem }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.itemContainer}>
      <TouchableOpacity style={styles.questionContainer} onPress={toggleOpen}>
        <Text style={styles.questionText}>{item.question}</Text>
        <MaterialIcons name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={Colors.primary} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
};

const FaqScreen = ({ navigation }: RootStackScreenProps<'Faq'>) => {
  const insets = useSafeAreaInsets();
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaq = async () => {
      try {
        const { data, error } = await supabase
          .from('faq_items')
          .select('id, question, answer')
          .order('display_order', { ascending: true });

        if (error) throw error;
        setFaqItems(data);
      } catch (err) {
        showErrorToast(err, 'Erro ao buscar perguntas frequentes.');
      } finally {
        setLoading(false);
      }
    };
    fetchFaq();
  }, []);

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Perfil</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={{ width: 50 }} />
      </View>
      <FlatList
        data={faqItems}
        renderItem={({ item }) => <FaqListItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma pergunta encontrada.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
  listContent: { padding: 20 },
  itemContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.text,
  },
  answerContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  answerText: {
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.textSecondary },
});

export default FaqScreen;
