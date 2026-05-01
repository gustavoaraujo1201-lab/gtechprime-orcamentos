// app/(tabs)/index.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'expo-router';

const PRIMARY    = '#0d7de0';
const PLANS_URL  = 'https://app.gtechprime.com.br/planos';

export default function InicioScreen() {
  const [stats, setStats]     = useState({ emissores: 0, clientes: 0, orcamentos: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const { displayName, planStatus, trialDaysLeft } = useAuth();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(auth)/login'); return; }

    const [{ count: ce }, { count: cc }, { count: co }] = await Promise.all([
      supabase.from('issuers').select('*', { count: 'exact', head: true }),
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('quotes').select('*',  { count: 'exact', head: true }),
    ]);

    setStats({ emissores: ce || 0, clientes: cc || 0, orcamentos: co || 0 });
    setLoading(false);
  }

  function confirmarSair() {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  // ── Badge do plano ────────────────────────────────────────────────────────
  function PlanBadge() {
    // Admin ou Premium → badge dourado estático
    if (planStatus === 'admin') {
      return (
        <View style={styles.planBadge}>
          <Text style={styles.planText}>👑 Admin — Acesso vitalício</Text>
        </View>
      );
    }
    if (planStatus === 'premium') {
      return (
        <View style={styles.planBadge}>
          <Text style={styles.planText}>⭐ Plano Premium ativo</Text>
        </View>
      );
    }
    // Trial ativo → clicável, mostra dias restantes
    if (planStatus === 'trial') {
      const urgent = trialDaysLeft <= 2;
      return (
        <TouchableOpacity
          style={[styles.planBadge, urgent && styles.planBadgeUrgent]}
          onPress={() => Linking.openURL(PLANS_URL)}
          activeOpacity={0.8}
        >
          <Text style={[styles.planText, urgent && styles.planTextUrgent]}>
            {urgent ? '⚠️' : '🎁'} Trial — {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''} · Assinar →
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* ── Banner ── */}
      <View style={styles.banner}>
        <View style={styles.bannerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerGreeting}>Olá, {displayName} 👋</Text>
            <Text style={styles.bannerSub}>Bem-vindo ao GTech Prime — Gerador de Orçamentos</Text>
          </View>
          <TouchableOpacity style={styles.sairBtn} onPress={confirmarSair} activeOpacity={0.8}>
            <Text style={styles.sairText}>⎋ Sair</Text>
          </TouchableOpacity>
        </View>
        <PlanBadge />
      </View>

      {/* ── Aviso trial expirando (≤2 dias) ── */}
      {planStatus === 'trial' && trialDaysLeft <= 2 && (
        <TouchableOpacity
          style={styles.urgentBanner}
          onPress={() => Linking.openURL(PLANS_URL)}
          activeOpacity={0.85}
        >
          <Text style={styles.urgentText}>
            ⚠️  Seu trial expira em {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''}! Toque aqui para assinar e não perder o acesso.
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <StatCard label="Emissores"  value={stats.emissores}  emoji="🏢" />
        <StatCard label="Clientes"   value={stats.clientes}   emoji="👥" />
        <StatCard label="Orçamentos" value={stats.orcamentos} emoji="📄" />
      </View>

      {/* ── Ações rápidas 2×2 ── */}
      <Text style={styles.sectionTitle}>Ações rápidas</Text>
      <View style={styles.actionsGrid}>
        <ActionCard emoji="📋" title="Cadastros"         subtitle="Emissores e clientes"   onPress={() => router.push('/(tabs)/cadastro')} />
        <ActionCard emoji="🗂️" title="Orçamentos Salvos" subtitle="Ver e exportar"          onPress={() => router.push('/(tabs)/orcamentos')} />
        <ActionCard emoji="➕" title="Novo Orçamento"    subtitle="Crie um novo orçamento" onPress={() => router.push('/(tabs)/orcamentos')} primary />
        <ActionCard emoji="👤" title="Meu Perfil"        subtitle="Configurações da conta" onPress={() => router.push('/(tabs)/perfil')} />
      </View>

      <Text style={styles.footer}>GTech Prime © 2026</Text>
    </ScrollView>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────
function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ emoji, title, subtitle, onPress, primary }: {
  emoji: string; title: string; subtitle: string; onPress: () => void; primary?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.actionCard, primary && styles.actionCardPrimary]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={[styles.actionTitle, primary && styles.actionTitlePrimary]}>{title}</Text>
      <Text style={[styles.actionSub,   primary && styles.actionSubPrimary]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f6f8fb' },
  content: { paddingBottom: 40 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f8fb' },

  banner: { backgroundColor: '#0d1520', paddingHorizontal: 20, paddingBottom: 22, paddingTop: 52 },
  bannerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  bannerGreeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  bannerSub: { fontSize: 13, color: 'rgba(180,210,255,0.6)', marginTop: 4 },

  sairBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4,
  },
  sairText: { fontSize: 13, fontWeight: '700', color: '#f87171' },

  // Badges do plano
  planBadge: {
    marginTop: 14, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.35)',
  },
  planBadgeUrgent: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.5)',
  },
  planText:       { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  planTextUrgent: { color: '#f87171' },

  // Aviso urgente trial
  urgentBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderLeftWidth: 3, borderLeftColor: '#ef4444',
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 8, padding: 12,
  },
  urgentText: { fontSize: 13, color: '#fca5a5', lineHeight: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(20,30,40,0.10)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#0d7de0' },
  statLabel: { fontSize: 11, color: '#6b7278', marginTop: 2, textAlign: 'center' },

  // Ações
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  actionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 18,
    borderWidth: 1, borderColor: 'rgba(20,30,40,0.10)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  actionCardPrimary:  { backgroundColor: '#0d7de0', borderColor: '#0a5fb8' },
  actionEmoji:        { fontSize: 26, marginBottom: 10 },
  actionTitle:        { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  actionTitlePrimary: { color: '#fff' },
  actionSub:          { fontSize: 12, color: '#6b7278', marginTop: 4, lineHeight: 16 },
  actionSubPrimary:   { color: 'rgba(255,255,255,0.75)' },

  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 28 },
});
