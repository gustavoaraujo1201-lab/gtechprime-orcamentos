// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ─── Admin com acesso vitalício ───────────────────────────────────────────────
const ADMIN_EMAILS = [
  'gustavo.araujo@reisalves.com.br', // 🔧 substitua pelo seu email real
];

const TRIAL_DAYS = 7;
const PLANS_URL  = 'https://app.gtechprime.com.br/planos';

export type PlanStatus = 'admin' | 'premium' | 'trial' | 'trial_expired' | 'loading';

export function useAuth() {
  const [user,      setUser]      = useState<any>(null);
  const [profile,   setProfile]   = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setIsLoading(false); }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, plan, trial_start, email')
        .eq('id', userId)
        .single();
      setProfile(data);
    } catch (_) {}
    finally { setIsLoading(false); }
  }

  // ── Calcula status do plano ────────────────────────────────────────────────
  function getPlanStatus(): PlanStatus {
    if (isLoading) return 'loading';

    // Admin → vitalício
    if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return 'admin';

    // Plano premium pago
    if (profile?.plan === 'premium') return 'premium';

    // Trial
    const trialStart = profile?.trial_start
      ? new Date(profile.trial_start)
      : user?.created_at
      ? new Date(user.created_at)
      : null;

    if (!trialStart) return 'trial_expired';

    const diffDays = (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= TRIAL_DAYS) return 'trial';
    return 'trial_expired';
  }

  // Quantos dias restam no trial (0 se expirado)
  function getTrialDaysLeft(): number {
    const trialStart = profile?.trial_start
      ? new Date(profile.trial_start)
      : user?.created_at
      ? new Date(user.created_at)
      : null;
    if (!trialStart) return 0;
    const used = (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(TRIAL_DAYS - used));
  }

  // ── Auth actions ──────────────────────────────────────────────────────────
  async function signIn(identifier: string, password: string) {
    let email = identifier.trim();
    if (!email.includes('@')) {
      const { data: p } = await supabase
        .from('profiles').select('email').ilike('username', email).maybeSingle();
      if (!p?.email) return { error: 'Usuário não encontrado.' };
      email = p.email;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) msg = 'Email/usuário ou senha incorretos.';
      if (msg.includes('Email not confirmed'))       msg = 'Confirme seu email antes de fazer login.';
      if (msg.includes('rate limit'))                msg = 'Muitas tentativas. Aguarde alguns minutos.';
      return { error: msg };
    }
    return { error: null };
  }

  async function signUp(email: string, password: string, username: string) {
    const clean = username.trim();
    if (clean.length < 2) return { error: 'Nome de usuário deve ter pelo menos 2 caracteres.' };

    const { data: existing } = await supabase
      .from('profiles').select('id').ilike('username', clean).maybeSingle();
    if (existing) return { error: 'Este nome de usuário já está em uso.' };

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: clean, full_name: clean } },
    });
    if (error) {
      let msg = error.message;
      if (msg.includes('User already registered')) msg = 'Este email já está cadastrado.';
      if (msg.includes('Password should be at least')) msg = 'A senha deve ter pelo menos 6 caracteres.';
      if (msg.includes('weak')) msg = 'Senha muito fraca.';
      return { error: msg };
    }

    // Auto login
    const { data: sd, error: se } = await supabase.auth.signInWithPassword({ email, password });
    if (!se && sd?.session) {
      await supabase.from('profiles').upsert({
        id: sd.session.user.id,
        email,
        username: clean,
        full_name: clean,
        plan: 'trial',
        trial_start: new Date().toISOString(), // ← marca início do trial
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  }

  const displayName =
    profile?.username ||
    profile?.full_name ||
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] || '';

  const planStatus    = getPlanStatus();
  const trialDaysLeft = getTrialDaysLeft();
  const hasAccess     = planStatus === 'admin' || planStatus === 'premium' || planStatus === 'trial';

  return {
    user,
    profile,
    displayName,
    isLoading,
    isAuthenticated: !!user,
    planStatus,
    trialDaysLeft,
    hasAccess,
    plansUrl: PLANS_URL,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
