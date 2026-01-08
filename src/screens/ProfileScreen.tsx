import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

interface Profile {
  full_name: string;
  cpf: string;
  birth_date: string;
  avatar_url: string | null;
}

const ProfileScreen = ({ navigation }: RootStackScreenProps<'Profile'>) => {
  const { user, signOut, userRole } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, cpf, birth_date, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error: any) {
      Alert.alert('Erro ao buscar perfil', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Mapa</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <MaterialIcons name="edit" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: `${profile.avatar_url}?t=${new Date().getTime()}` }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={60} color={Colors.textSecondary} />
            </View>
          )}
          <Text style={styles.profileName}>{profile?.full_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>CPF</Text>
            <Text style={styles.value}>{profile ? formatCPF(profile.cpf) : ''}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Data de Nascimento</Text>
            <Text style={styles.value}>{profile ? formatDate(profile.birth_date) : ''}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Wallet')}>
          <MaterialIcons name="account-balance-wallet" size={20} color={Colors.surface} style={styles.icon} />
          <Text style={styles.actionButtonText}>Minha Carteira</Text>
        </TouchableOpacity>

        <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => navigation.navigate('IdentityVerification', { readOnly: true })}
        >
        <Text style={styles.actionButtonText}>Meus Dados Cadastrais</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('RideHistory')}>
          <MaterialIcons name="history" size={20} color={Colors.surface} style={styles.icon} />
          <Text style={styles.actionButtonText}>Histórico de Corridas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Faq')}>
            <MaterialIcons name="quiz" size={20} color={Colors.surface} style={styles.icon} />
            <Text style={styles.actionButtonText}>Perguntas Frequentes (FAQ)</Text>
        </TouchableOpacity>

        {userRole === 'admin' && (
          <>
            <View style={styles.divider} />
            <Text style={styles.adminTitle}>Painel do Administrador</Text>
            <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminReview')}>
              <MaterialIcons name="rate-review" size={20} color={Colors.text} style={styles.icon} />
              <Text style={styles.adminButtonText}>Revisões Pendentes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminRidesDashboard')}>
              <MaterialIcons name="space-dashboard" size={20} color={Colors.text} style={styles.icon} />
              <Text style={styles.adminButtonText}>Painel de Corridas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminBikesDashboard')}>
              <MaterialIcons name="pedal-bike" size={20} color={Colors.text} style={styles.icon} />
              <Text style={styles.adminButtonText}>Gerenciar Bicicletas</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={[styles.actionButton, {backgroundColor: Colors.error, marginTop: 30}]} onPress={signOut}>
           <MaterialIcons name="logout" size={20} color={Colors.surface} style={styles.icon} />
          <Text style={styles.actionButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
  content: { padding: 20, flexGrow: 1 },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  profileName: { fontSize: 22, fontFamily: 'Montserrat_700Bold', color: Colors.text,textAlign: 'center' },
  profileEmail: { fontSize: 16, fontFamily: 'Montserrat_400Regular', color: Colors.textSecondary, marginTop: 4 },
  infoCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 20, marginBottom: 20 },
  infoRow: { marginBottom: 15 },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4, fontFamily: 'Montserrat_400Regular' },
  value: { fontSize: 18, color: Colors.text, fontFamily: 'Montserrat_600SemiBold' },
  actionButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  icon: {
    marginRight: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    width: '100%',
    marginVertical: 20,
  },
  adminTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  adminButton: {
    backgroundColor: Colors.accent,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  adminButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
});

export default ProfileScreen;