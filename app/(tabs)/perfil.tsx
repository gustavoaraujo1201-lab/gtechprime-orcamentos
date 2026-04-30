// app/(tabs)/perfil.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'expo-router';

const PRIMARY   = '#0d7de0';
const PLANS_URL = 'https://geradororcamentosoftprime.com.br/planos';

export default function PerfilScreen() {
  const [user,    setUser]    = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      },
    ]);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;
  }

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Usuário';
  const initials    = displayName.slice(0, 2).toUpperCase();

  // ── Info do plano para exibir ─────────────────────────────────────────────
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
        <Text style={s.bannerTitle}>👤  Perfil</Text>
        <Text style={s.bannerSub}>Seus dados e configurações</Text>
      </View>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.userName}>{displayName}</Text>
        {profile?.username && <Text style={s.userHandle}>@{profile.username}</Text>}
      </View>

      {/* Infos da conta */}
      <View style={s.card}>
        <InfoRow label="E-mail"     value={user?.email || '—'} />
        {profile?.username && <InfoRow label="Usuário" value={profile.username} />}
        <InfoRow
          label="Conta criada em"
          value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
        />
      </View>

      {/* Card do plano */}
      <View style={[s.planCard, { borderColor: planInfo.color + '55' }]}>
        <View style={s.planCardTop}>
          <View>
            <Text style={s.planCardLabel}>Seu plano</Text>
            <Text style={[s.planCardValue, { color: planInfo.color }]}>{planInfo.label}</Text>
          </View>
        </View>

        {/* Barra de progresso do trial */}
        {planStatus === 'trial' && (
          <View style={s.trialBar}>
            <View style={s.trialBarBg}>
              <View style={[s.trialBarFill, {
                width: `${(trialDaysLeft / 7) * 100}%` as any,
                backgroundColor: trialDaysLeft <= 2 ? '#ef4444' : '#0d7de0',
              }]} />
            </View>
            <Text style={s.trialBarLabel}>{trialDaysLeft} de 7 dias restantes</Text>
          </View>
        )}

        {/* Botão Gerenciar Plano */}
        {planInfo.showBtn && (
          <TouchableOpacity
            style={[s.btnPlan, { backgroundColor: planInfo.color }]}
            onPress={() => Linking.openURL(PLANS_URL)}
            activeOpacity={0.85}
          >
            <Text style={s.btnPlanText}>
              {planStatus === 'trial' ? '⭐ Assinar agora' : '🔓 Desbloquear acesso'} →
            </Text>
          </TouchableOpacity>
        )}
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
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f6f8fb' },
  content: { paddingBottom: 40 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f8fb' },

  banner: { backgroundColor: '#0d1520', paddingHorizontal: 20, paddingVertical: 24, paddingTop: 52 },
  bannerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  bannerSub:   { fontSize: 13, color: 'rgba(180,210,255,0.6)', marginTop: 4 },

  avatarSection: { alignItems: 'center', marginTop: -30, marginBottom: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#0d7de0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#0d7de0', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  userName:   { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 10 },
  userHandle: { fontSize: 13, color: '#6b7278', marginTop: 2 },

  card: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(20,30,40,0.10)',
    overflow: 'hidden', marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 13, color: '#6b7278', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // Card do plano
  planCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  planCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  planCardLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  planCardValue: { fontSize: 15, fontWeight: '700' },

  trialBar: { marginBottom: 14 },
  trialBarBg: {
    height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 6,
  },
  trialBarFill: { height: '100%', borderRadius: 3 },
  trialBarLabel: { fontSize: 12, color: '#6b7278' },

  btnPlan: {
    borderRadius: 10, paddingVertical: 12,
    alignItems: 'center',
  },
  btnPlanText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  btnLogout: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)',
    paddingVertical: 14, alignItems: 'center',
  },
  btnLogoutText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 },
});
