import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import { RootStackScreenProps } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { MaterialIcons } from '@expo/vector-icons';

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

const EditProfileScreen = ({ navigation }: RootStackScreenProps<'EditProfile'>) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setProfile(data);
          if (data.avatar_url) {
            setImageUri(`${data.avatar_url}?t=${new Date().getTime()}`);
          }
        }
      } catch (error: any) {
        Alert.alert('Erro ao buscar perfil', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const pickImage = async () => {
    Alert.alert("Selecionar Imagem", "Escolha de onde você quer pegar a foto:", [
      {
        text: "Tirar Foto",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert("Permissão necessária", "Você precisa permitir o acesso à câmera.");
            return;
          }
          let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.5,
          });
          if (!result.canceled) setImageUri(result.assets[0].uri);
        }
      },
      {
        text: "Escolher da Galeria",
        onPress: async () => {
          let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5,
          });
          if (!result.canceled) setImageUri(result.assets[0].uri);
        }
      },
      { text: "Cancelar", style: "cancel" }
    ]);
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    
    let newAvatarUrl = profile.avatar_url;

    if (imageUri && imageUri.startsWith('file://')) {
      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri, [{ resize: { width: 400, height: 400 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const fileName = `${user.id}.jpeg`;
        const formData = new FormData();
        formData.append('file', { uri: manipulatedImage.uri, name: fileName, type: `image/jpeg` } as any);

        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, formData, { upsert: true, contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        newAvatarUrl = urlData.publicUrl;
      } catch (error) {
        showErrorToast(error, 'Erro ao fazer upload da imagem.');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name, avatar_url: newAvatarUrl })
      .eq('id', user.id);

    if (error) showErrorToast(error, 'Erro ao atualizar o perfil.');
    else {
      showSuccessToast('Sucesso!', 'Seu perfil foi atualizado.');
      navigation.goBack();
    }
    setSaving(false);
  };

  // --- SOFT DELETE IMPLEMENTATION ---
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Desativar Conta",
      "Sua conta será desativada e você será desconectado. Seus dados históricos serão mantidos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            setSaving(true);
            
            // Marca como 'deleted' no banco (coluna TEXT aceita isso)
            const { error } = await supabase
              .from('profiles')
              .update({ status: 'deleted' }) 
              .eq('id', user.id);

            setSaving(false);

            if (error) {
              showErrorToast(error, 'Erro ao desativar conta.');
            } else {
              Alert.alert('Conta Desativada', 'Até logo!');
              signOut(); // Desloga o usuário
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backButton}>Cancelar</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><MaterialIcons name="person" size={60} color={Colors.textSecondary} /></View>
          )}
          <View style={styles.cameraIcon}><MaterialIcons name="camera-alt" size={24} color={Colors.surface} /></View>
        </TouchableOpacity>
        
        <Text style={styles.label}>Nome Completo</Text>
        <TextInput style={styles.input} value={profile?.full_name} onChangeText={(text) => setProfile(p => p ? { ...p, full_name: text } : null)} />

        <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.saveButtonText}>Salvar Alterações</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={saving}>
          <Text style={styles.deleteButtonText}>Desativar Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: Colors.text },
  backButton: { fontSize: 16, color: Colors.primary, fontFamily: 'Montserrat_600SemiBold' },
  content: { padding: 20, alignItems: 'center' },
  avatarContainer: { marginBottom: 30, position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, padding: 8, borderRadius: 20 },
  label: { alignSelf: 'flex-start', fontSize: 16, fontFamily: 'Montserrat_600SemiBold', color: Colors.textSecondary, marginBottom: 8 },
  input: { width: '100%', height: 55, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 20, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  saveButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', width: '100%', height: 55, justifyContent: 'center' },
  saveButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  divider: { height: 1, backgroundColor: Colors.border, width: '100%', marginVertical: 30 },
  deleteButton: { backgroundColor: 'transparent', borderColor: Colors.error, borderWidth: 1, padding: 15, borderRadius: 12, alignItems: 'center', width: '100%' },
  deleteButtonText: { color: Colors.error, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
});

export default EditProfileScreen;