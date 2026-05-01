// app/_layout.tsx
import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Linking, StatusBar, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ToastProvider } from '../src/components/Toast';
import { useAuth } from '../src/hooks/useAuth';

const PLANS_URL = 'https://geradororcamentosoftprime.com.br/planos';

// ─── Loading enquanto verifica sessão ────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#020918', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0d7de0" />
    </View>
  );
}

// ─── Tela de bloqueio trial expirado ─────────────────────────────────────────
function TrialExpiredScreen() {
  return (
    <View style={b.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#020918' }]} />
      <View style={b.card}>
        <View style={b.cardTopBar} />
        <Text style={b.emoji}>⏰</Text>
        <Text style={b.title}>Seu período gratuito{'\n'}encerrou</Text>
        <Text style={b.sub}>
          Você utilizou os 7 dias grátis do GTech Prime.{'\n'}
          Para continuar gerando orçamentos, escolha um plano.
        </Text>
        <View style={b.features}>
          {[
            '📄  Orçamentos ilimitados',
            '🏢  Cadastro de clientes e emissores',
            '📑  PDF profissional com logo',
            '💾  Backup automático na nuvem',
            '📱  Acesso web e mobile',
            '🛡️  Sem marca d\'água',
          ].map((f, i) => (
            <View key={i} style={b.featureRow}>
              <Text style={b.featureText}>{f}</Text>
            </View>
          ))}
        </View>
        <View style={b.priceBox}>
          <Text style={b.priceFrom}>A partir de</Text>
          <Text style={b.price}>R$ 29<Text style={b.priceCents}>,90/mês</Text></Text>
          <Text style={b.priceTrial}>🎁 7 dias grátis — sem cartão necessário</Text>
        </View>
        <TouchableOpacity style={b.btnCta} activeOpacity={0.85} onPress={() => Linking.openURL(PLANS_URL)}>
          <Text style={b.btnCtaText}>Ver planos e assinar →</Text>
        </TouchableOpacity>
        <Text style={b.footer}>© 2026 GTech Prime</Text>
      </View>
    </View>
  );
}

// ─── Gate principal ───────────────────────────────────────────────────────────
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, planStatus } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    // Só age depois que o auth terminou de carregar
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      // ✅ SEMPRE vai para Início — nunca para cadastro
      router.replace('/(tabs)/');
    }
  }, [isAuthenticated, isLoading]);
  // ↑ "segments" removido das dependências propositalmente:
  //   sem isso, navegar entre abas re-dispara o efeito e pode redirecionar

  // ✅ Bloqueia renderização das tabs até auth estar pronto
  if (isLoading) return <LoadingScreen />;

  // Trial expirado → tela de bloqueio total
  if (isAuthenticated && planStatus === 'trial_expired') {
    return <TrialExpiredScreen />;
  }

  return <>{children}</>;
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </ToastProvider>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const b = StyleSheet.create({
  root: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 40,
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(6,18,36,0.95)',
    borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: 'rgba(13,125,224,0.35)',
    shadowColor: '#0d7de0', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 24, elevation: 16,
    overflow: 'hidden', alignItems: 'center',
  },
  cardTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 3, backgroundColor: '#f59e0b',
  },
  emoji: { fontSize: 52, marginTop: 8, marginBottom: 14 },
  title: {
    fontSize: 24, fontWeight: '800', color: '#fff',
    textAlign: 'center', lineHeight: 32, marginBottom: 12,
  },
  sub: {
    fontSize: 14, color: 'rgba(180,210,255,0.65)',
    textAlign: 'center', lineHeight: 21, marginBottom: 22,
  },
  features: { width: '100%', marginBottom: 20 },
  featureRow: {
    paddingVertical: 7, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  featureText: { fontSize: 13, color: 'rgba(200,230,255,0.8)' },
  priceBox: {
    width: '100%', alignItems: 'center',
    backgroundColor: 'rgba(13,125,224,0.1)',
    borderRadius: 12, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(13,125,224,0.25)',
  },
  priceFrom:  { fontSize: 12, color: 'rgba(180,210,255,0.5)', marginBottom: 4 },
  price:      { fontSize: 36, fontWeight: '800', color: '#fff' },
  priceCents: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  priceTrial: { fontSize: 12, color: '#fbbf24', marginTop: 6 },
  btnCta: {
    width: '100%', backgroundColor: '#0d7de0',
    borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#0d7de0', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  btnCtaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  footer: { fontSize: 12, color: 'rgba(100,140,190,0.4)' },
});
