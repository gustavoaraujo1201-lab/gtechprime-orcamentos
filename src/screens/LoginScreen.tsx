import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Animated, StatusBar,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Estrelas ────────────────────────────────────────────────────
const STARS = Array.from({ length: 100 }, (_, i) => ({
  key: i,
  x: Math.random() * SW,
  y: Math.random() * SH,
  r: 0.5 + Math.random() * 1.4,
  opacity: 0.08 + Math.random() * 0.65,
  duration: 1500 + Math.random() * 3000,
  delay: Math.random() * 2000,
}));

function Star({ x, y, r, opacity, duration, delay }: any) {
  const anim = useRef(new Animated.Value(opacity)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: opacity * 0.15, duration, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: opacity, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y,
      width: r * 2, height: r * 2, borderRadius: r,
      backgroundColor: '#fff', opacity: anim,
    }} />
  );
}

// ─── Tela principal ──────────────────────────────────────────────
export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'login' | 'cadastrar'>('login');

  // Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]      = useState(false);

  // Cadastro
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail]       = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Animação de entrada do card
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }).start();
  }, []);

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
      { scale:      cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  };

  // ── Login — usa useAuth.signIn que já tem ilike + full_name ──
  async function handleLogin() {
    if (!identifier.trim() || !password) {
      setMessage({ text: 'Preencha e-mail/usuário e senha.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);

    const { error } = await signIn(identifier.trim(), password);

    if (error) {
      setMessage({ text: error, type: 'error' });
    } else {
      setMessage({ text: 'Login realizado! Redirecionando...', type: 'success' });
      setTimeout(() => router.replace('/(tabs)/cadastro'), 600);
    }
    setLoading(false);
  }

  // ── Cadastro — usa useAuth.signUp que faz auto-login + upsert profile ──
  async function handleSignup() {
    if (!signupUsername.trim() || !signupEmail.trim() || !signupPassword) {
      setMessage({ text: 'Preencha todos os campos.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);

    const { error } = await signUp(
      signupEmail.trim(),
      signupPassword,
      signupUsername.trim(),
    );

    if (error) {
      setMessage({ text: error, type: 'error' });
    } else {
      setMessage({ text: 'Conta criada com sucesso! Redirecionando...', type: 'success' });
      setTimeout(() => router.replace('/(tabs)/cadastro'), 800);
    }
    setLoading(false);
  }

  function switchTab(t: 'login' | 'cadastrar') { setTab(t); setMessage(null); }

  // ────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#02040f" />

      {/* Fundo escuro */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#02040f' }]} />

      {/* Nebulosidades */}
      <View style={[s.nebula, s.neb1]} />
      <View style={[s.nebula, s.neb2]} />
      <View style={[s.nebula, s.neb3]} />

      {/* Estrelas animadas */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STARS.map(st => <Star key={st.key} {...st} />)}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[s.card, cardStyle]}>

            {/* ── Logo ── */}
            <View style={s.header}>
              <Text style={s.logo}>SOFT<Text style={s.prime}>PRIME</Text></Text>
              <Text style={s.sub}>Gerador de Orçamentos — Faça login ou crie sua conta</Text>
            </View>

            {/* ── Tabs ── */}
            <View style={s.tabs}>
              {(['login', 'cadastrar'] as const).map(t => (
                <TouchableOpacity key={t} style={s.tabBtn} onPress={() => switchTab(t)} activeOpacity={0.8}>
                  <Text style={[s.tabTxt, tab === t && s.tabActive]}>
                    {t === 'login' ? 'Login' : 'Cadastrar'}
                  </Text>
                  {tab === t && <View style={s.tabLine} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Feedback ── */}
            {message && (
              <View style={[s.msg, message.type === 'error' ? s.msgErr : s.msgOk]}>
                <Text style={s.msgTxt}>{message.text}</Text>
              </View>
            )}

            {/* ══════════ FORMULÁRIO LOGIN ══════════ */}
            {tab === 'login' && (
              <View>
                <Field label="E-MAIL OU USUÁRIO" icon="👤">
                  <TextInput
                    style={s.input}
                    placeholder="Email ou usuário"
                    placeholderTextColor="rgba(100,150,200,0.4)"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    selectionColor="#0d7de0"
                  />
                </Field>

                <Field label="SENHA" icon="🔒">
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(100,150,200,0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    selectionColor="#0d7de0"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPass(v => !v)}
                    style={s.eye}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text>{showPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </Field>

                <View style={s.row}>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={s.forgot}>Esqueceu sua senha?</Text>
                  </TouchableOpacity>
                </View>

                <Btn label="INICIAR SESSÃO" onPress={handleLogin} loading={loading} />
              </View>
            )}

            {/* ══════════ FORMULÁRIO CADASTRO ══════════ */}
            {tab === 'cadastrar' && (
              <View>
                <Field label="NOME DE USUÁRIO" icon="👤">
                  <TextInput
                    style={s.input}
                    placeholder="seu usuario"
                    placeholderTextColor="rgba(100,150,200,0.4)"
                    value={signupUsername}
                    onChangeText={setSignupUsername}
                    autoCapitalize="none"
                    selectionColor="#0d7de0"
                  />
                </Field>

                <Field label="E-MAIL" icon="✉️">
                  <TextInput
                    style={s.input}
                    placeholder="Email"
                    placeholderTextColor="rgba(100,150,200,0.4)"
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    selectionColor="#0d7de0"
                  />
                </Field>

                <Field label="SENHA" icon="🔒">
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(100,150,200,0.4)"
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                    secureTextEntry={!showSignupPass}
                    selectionColor="#0d7de0"
                  />
                  <TouchableOpacity
                    onPress={() => setShowSignupPass(v => !v)}
                    style={s.eye}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text>{showSignupPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </Field>

                <Btn label="CRIAR CONTA" onPress={handleSignup} loading={loading} style={{ marginTop: 8 }} />
              </View>
            )}

            {/* Nota segura */}
            <View style={s.secNote}>
              <Text style={s.secTxt}>Ambiente seguro de autenticação</Text>
            </View>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footTxt}>© 2026 SoftPrime — Todos os direitos reservados</Text>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────
function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldGrp}>
      <Text style={s.fieldLbl}>{label}</Text>
      <View style={s.fieldRow}>
        <Text style={s.fieldIco}>{icon}</Text>
        {children}
      </View>
    </View>
  );
}

function Btn({ label, onPress, loading, style }: any) {
  return (
    <TouchableOpacity
      style={[s.btn, loading && s.btnOff, style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={s.btnTxt}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#02040f' },
  nebula: { position: 'absolute', borderRadius: 9999 },
  neb1:   { width: SW*1.2, height: SH*0.8,  left: -SW*0.1,  top:    SH*0.1,  backgroundColor: 'rgba(30,50,140,0.09)' },
  neb2:   { width: SW*0.75,height: SW*0.75, right: -SW*0.2,  top:   -SW*0.15, backgroundColor: 'rgba(80,20,140,0.07)' },
  neb3:   { width: SW*0.65,height: SW*0.65, left: -SW*0.15,  bottom:-SW*0.1,  backgroundColor: 'rgba(13,80,200,0.06)' },

  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 36, paddingHorizontal: 16 },

  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(6,18,36,0.82)',
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 28,
    borderWidth: 1, borderColor: 'rgba(13,125,224,0.35)',
    shadowColor: '#0d7de0', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, shadowRadius: 24, elevation: 14,
  },

  header:  { alignItems: 'center', marginBottom: 24 },
  logo:    { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 2, marginBottom: 6 },
  prime:   { color: '#0d7de0' },
  sub:     { fontSize: 12, color: 'rgba(180,210,255,0.55)', letterSpacing: 0.4, textAlign: 'center', lineHeight: 18 },

  tabs:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
  tabBtn:  { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabTxt:  { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.3 },
  tabActive:{ color: '#0d7de0' },
  tabLine: { position: 'absolute', bottom: -1, left: '15%', right: '15%', height: 2, borderRadius: 2, backgroundColor: '#0d7de0' },

  msg:    { borderRadius: 8, padding: 10, marginBottom: 14 },
  msgErr: { backgroundColor: 'rgba(220,38,38,0.14)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  msgOk:  { backgroundColor: 'rgba(16,185,129,0.14)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  msgTxt: { color: '#fff', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  fieldGrp: { marginBottom: 14 },
  fieldLbl: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(150,190,255,0.7)', marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(13,125,224,0.22)', backgroundColor: 'rgba(5,15,35,0.65)', paddingHorizontal: 12, minHeight: 46 },
  fieldIco: { fontSize: 14, marginRight: 8, opacity: 0.65 },
  input:    { flex: 1, color: '#e8f4ff', fontSize: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10 },
  eye:      { paddingLeft: 8 },

  row:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16, marginTop: 2 },
  forgot: { color: 'rgba(100,160,255,0.7)', fontSize: 13 },

  btn:    { borderRadius: 12, backgroundColor: '#0d7de0', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#0d7de0', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  btnOff: { opacity: 0.65 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

  secNote: { marginTop: 10, alignItems: 'center' },
  secTxt:  { fontSize: 11, color: 'rgba(180,210,255,0.38)' },

  footer:  { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  footTxt: { fontSize: 11, color: 'rgba(100,140,190,0.4)' },
});
