// app/(tabs)/perfil.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Linking, TextInput, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'expo-router';

const PRIMARY   = '#0d7de0';
const PLANS_URL = 'https://geradororcamentosoftprime.com.br/planos';

export default function PerfilScreen() {
  const [user,        setUser]        = useState<any>(null);
  const [profile,     setProfile]     = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null);

  // edição de nome
  const [editName,    setEditName]    = useState('');
  const [savingName,  setSavingName]  = useState(false);

  // troca de senha
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);

  const router = useRouter();
  const { planStatus, trialDaysLeft } = useAuth();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { router.replace('/(auth)/login'); return; }
    setUser(u);
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', u.id).maybeSingle();
    setProfile(prof);
    setEditName(prof?.username || prof?.full_name || '');
    if (prof?.avatar_url) setAvatarUrl(prof.avatar_url);
    setLoading(false);
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria nas configurações.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const fileName = `avatar_${user.id}.${ext}`;

    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: `image/${ext}` } as any);

    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(fileName, formData, { upsert: true, contentType: `image/${ext}` });

    if (uploadError) { Alert.alert('Erro', 'Falha ao enviar imagem.'); return; }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    setAvatarUrl(publicUrl);
    Alert.alert('Sucesso', 'Foto de perfil atualizada!');
  }

  async function handleSaveName() {
    if (!editName.trim()) { Alert.alert('Atenção', 'Digite um nome válido.'); return; }
    setSavingName(true);
    const { error } = await supabase.from('profiles')
      .update({ username: editName.trim(), full_name: editName.trim() })
      .eq('id', user.id);
    setSavingName(false);
    if (error) { Alert.alert('Erro', 'Não foi possível salvar o nome.'); return; }
    setProfile((p: any) => ({ ...p, username: editName.trim(), full_name: editName.trim() }));
    Alert.alert('Sucesso', 'Nome atualizado!');
  }

  async function handleChangePassword() {
    if (newPass.length < 6) { Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPass !== confirmPass) { Alert.alert('Atenção', 'As senhas não coincidem.'); return; }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSavingPass(false);
    if (error) { Alert.alert('Erro', 'Não foi possível alterar a senha.'); return; }
    setNewPass(''); setConfirmPass('');
    Alert.alert('Sucesso', 'Senha alterada com sucesso!');
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;
  }

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Usuário';
  const initials    = displayName.slice(0, 2).toUpperCase();

  const planInfo = (() => {
    if (planStatus === 'admin')   return { label: '👑 Admin — Acesso vitalício', color: '#f59e0b', showBtn: false };
    if (planStatus === 'premium') return { label: '⭐ Premium ativo',            color: '#10b981', showBtn: false };
    if (planStatus === 'trial')   return {
      label: `🎁 Trial — ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`,
      color: trialDaysLeft <= 2 ? '#ef4444' : '#f59e0b',
      showBtn: true,
    };
    return { label: '⛔ Trial expirado', color: '#ef4444', showBtn: true };
  })();

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>

      {/* Banner */}
      <View style={s.banner}>
        <View>
          <Text style={s.bannerTitle}>👤  Perfil</Text>
          <Text style={s.bannerSub}>Seus dados e configurações</Text>
        </View>
      </View>

      {/* Avatar centralizado saindo do banner */}
      <View style={s.avatarSection}>
        <TouchableOpacity style={s.avatarWrap} onPress={handlePickImage} activeOpacity={0.85}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
            : <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          }
          <View style={s.avatarBadge}>
            <Text style={{ fontSize: 10, color: '#fff' }}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={s.avatarHint}>Clique na foto para alterar</Text>
        <Text style={s.userName}>{displayName}</Text>
        <Text style={s.userEmail}>{user?.email}</Text>
        {profile?.username && <Text style={s.userHandle}>@{profile.username}</Text>}
      </View>

      {/* Infos da conta */}
      <View style={s.card}>
        <InfoRow label="E-mail"         value={user?.email || '—'} />
        {profile?.username && <InfoRow label="Usuário" value={profile.username} />}
        <InfoRow
          label="Conta criada em"
          value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
        />
      </View>

      {/* Card do plano */}
      <View style={[s.planCard, { borderColor: planInfo.color + '55' }]}>
        <Text style={s.planCardLabel}>SEU PLANO</Text>
        <Text style={[s.planCardValue, { color: planInfo.color }]}>{planInfo.label}</Text>

        {planStatus === 'trial' && (
          <View style={s.trialBar}>
            <View style={s.trialBarBg}>
              <View style={[s.trialBarFill, {
                width: `${(trialDaysLeft / 7) * 100}%` as any,
                backgroundColor: trialDaysLeft <= 2 ? '#ef4444' : PRIMARY,
              }]} />
            </View>
            <Text style={s.trialBarLabel}>{trialDaysLeft} de 7 dias restantes</Text>
          </View>
        )}

        {planInfo.showBtn && (
          <TouchableOpacity style={[s.btnPlan, { backgroundColor: planInfo.color }]}
            onPress={() => Linking.openURL(PLANS_URL)} activeOpacity={0.85}>
            <Text style={s.btnPlanText}>
              {planStatus === 'trial' ? '⭐ Assinar agora' : '🔓 Desbloquear acesso'} →
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Editar nome de usuário ── */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>✏️  NOME DE USUÁRIO</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Seu nome"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveName} disabled={savingName}>
            {savingName
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnText}>Salvar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Alterar senha ── */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>🔑  ALTERAR SENHA</Text>

        <View style={s.passRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={newPass}
            onChangeText={setNewPass}
            placeholder="Nova senha (mínimo 6 caracteres)"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPass}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(p => !p)}>
            <Text style={{ fontSize: 18 }}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.passRow, { marginTop: 10 }]}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="Confirmar nova senha"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showConfirm}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(p => !p)}>
            <Text style={{ fontSize: 18 }}>{showConfirm ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.btnPassword} onPress={handleChangePassword} disabled={savingPass}>
          {savingPass
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.btnPasswordText}>🔒 Alterar Senha</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Sair */}
      <TouchableOpacity style={s.btnLogout} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={s.btnLogoutText}>🚪  Sair da conta</Text>
      </TouchableOpacity>

      <Text style={s.footer}>SoftPrime © 2026</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f6f8fb' },
  content: { paddingBottom: 40 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f8fb' },

  banner: {
    backgroundColor: '#0d1520', paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 50,
  },
  bannerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  bannerSub:   { fontSize: 13, color: 'rgba(180,210,255,0.6)', marginTop: 4 },

  avatarSection: { alignItems: 'center', marginTop: -40, marginBottom: 16 },
  avatarWrap:    { position: 'relative' },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: '#fff',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarText:  { color: '#fff', fontSize: 26, fontWeight: '700' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#374151', borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 3,
    borderWidth: 1.5, borderColor: '#fff',
  },
  avatarHint:  { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  userName:    { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 8 },
  userEmail:   { fontSize: 13, color: '#6b7278', marginTop: 3, textAlign: 'center', paddingHorizontal: 20 },
  userHandle:  { fontSize: 13, color: '#6b7278', marginTop: 2 },

  card: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(20,30,40,0.10)',
    overflow: 'hidden', marginBottom: 14, padding: 16,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 0.8, marginBottom: 12,
  },

  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1a1a1a',
    backgroundColor: '#f9fafb',
  },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  passRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:   { padding: 10 },

  btnPassword: {
    backgroundColor: PRIMARY, borderRadius: 8,
    paddingVertical: 13, alignItems: 'center', marginTop: 14,
  },
  btnPasswordText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  planCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, padding: 16,
  },
  planCardLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4,
  },
  planCardValue: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  trialBar:    { marginBottom: 14 },
  trialBarBg:  { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  trialBarFill: { height: '100%', borderRadius: 3 },
  trialBarLabel: { fontSize: 12, color: '#6b7278' },

  btnPlan:     { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPlanText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  btnLogout: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)',
    paddingVertical: 14, alignItems: 'center',
  },
  btnLogoutText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  footer:        { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 },
});
