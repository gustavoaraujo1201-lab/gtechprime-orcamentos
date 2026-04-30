// src/store/appStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { StoreState, Issuer, Client, Quote, Plan } from '../types';

const TRIAL_DAYS = 7;
const LIFETIME_USERS = new Set([
  '3716ddcb-fe65-4c61-8393-e5525388e8d8',
  'e0c0898e-b904-4df9-a5f9-ede4bc86a577',
]);

function trialDaysLeft(trialStartISO: string | null): number {
  if (!trialStartISO) return 0;
  const start = new Date(trialStartISO).getTime();
  const elapsed = (Date.now() - start) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export const useAppStore = create<StoreState>((set, get) => ({
  issuers: [],
  clients: [],
  quotes: [],
  isLoading: false,
  plan: 'free',
  trialStart: null,

  // ── Load all data ─────────────────────────────────────────────
  loadAll: async () => {
    set({ isLoading: true });
    try {
      const uid = await getUserId();
      if (!uid) { set({ isLoading: false }); return; }

      const [issuersRes, clientsRes, quotesRes] = await Promise.all([
        supabase.from('issuers').select('*').eq('user_id', uid).order('created_at'),
        supabase.from('clients').select('*').eq('user_id', uid).order('created_at'),
        supabase.from('quotes').select('*').eq('user_id', uid).order('numero', { ascending: false }),
      ]);

      const issuers: Issuer[] = (issuersRes.data ?? []).map((r: any) => ({
        id: r.id, name: r.name, cnpjCpf: r.cnpj_cpf ?? '',
        address: r.address ?? '', phone: r.phone ?? '',
        logo: r.logo ?? null, createdAt: r.created_at,
      }));

      const clients: Client[] = (clientsRes.data ?? []).map((r: any) => ({
        id: r.id, name: r.name, cnpjCpf: r.cnpj_cpf ?? '',
        address: r.address ?? '', phone: r.phone ?? '', createdAt: r.created_at,
      }));

      const quotes: Quote[] = (quotesRes.data ?? []).map((r: any) => ({
        id: r.id, issuerId: r.issuer_id ?? '', clientId: r.client_id ?? '',
        numero: r.numero ?? '', items: r.items ?? [],
        subtotal: Number(r.subtotal ?? 0), total: Number(r.total ?? 0),
        notes: r.notes ?? '', createdAt: r.created_at, updatedAt: r.updated_at,
      }));

      set({ issuers, clients, quotes });
      await get().syncPlan();
    } catch (e) {
      console.error('loadAll error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Plan sync ─────────────────────────────────────────────────
  syncPlan: async () => {
    const uid = await getUserId();
    if (!uid) return;

    if (LIFETIME_USERS.has(uid)) {
      set({ plan: 'premium', trialStart: null });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, trial_start')
        .eq('id', uid)
        .single();

      let plan: Plan = profile?.plan ?? null;
      let trialStart: string | null = profile?.trial_start ?? null;

      if (!plan && !trialStart) {
        trialStart = new Date().toISOString();
        plan = 'trial';
        await supabase.from('profiles').update({
          plan: 'trial',
          trial_start: trialStart,
          updated_at: new Date().toISOString(),
        }).eq('id', uid);
      }

      if (plan === 'trial' && trialDaysLeft(trialStart) <= 0) {
        plan = 'free';
        await supabase.from('profiles').update({
          plan: 'free',
          updated_at: new Date().toISOString(),
        }).eq('id', uid);
      }

      set({ plan: plan ?? 'free', trialStart });
    } catch (e) {
      console.warn('syncPlan error:', e);
    }
  },

  // ── Issuers ───────────────────────────────────────────────────
  saveIssuer: async (issuer: Issuer) => {
    const uid = await getUserId();
    if (!uid) return;
    const row = {
      id: issuer.id, user_id: uid, name: issuer.name,
      cnpj_cpf: issuer.cnpjCpf, address: issuer.address,
      phone: issuer.phone, logo: issuer.logo ?? null,
    };
    await supabase.from('issuers').upsert(row, { onConflict: 'id' });
    // Reload
    const { data } = await supabase.from('issuers').select('*').eq('user_id', uid).order('created_at');
    const issuers: Issuer[] = (data ?? []).map((r: any) => ({
      id: r.id, name: r.name, cnpjCpf: r.cnpj_cpf ?? '',
      address: r.address ?? '', phone: r.phone ?? '',
      logo: r.logo ?? null, createdAt: r.created_at,
    }));
    set({ issuers });
  },

  deleteIssuer: async (id: string) => {
    await supabase.from('issuers').delete().eq('id', id);
    set(s => ({ issuers: s.issuers.filter(i => i.id !== id) }));
  },

  // ── Clients ───────────────────────────────────────────────────
  saveClient: async (client: Client) => {
    const uid = await getUserId();
    if (!uid) return;
    const row = {
      id: client.id, user_id: uid, name: client.name,
      cnpj_cpf: client.cnpjCpf, address: client.address, phone: client.phone,
    };
    await supabase.from('clients').upsert(row, { onConflict: 'id' });
    const { data } = await supabase.from('clients').select('*').eq('user_id', uid).order('created_at');
    const clients: Client[] = (data ?? []).map((r: any) => ({
      id: r.id, name: r.name, cnpjCpf: r.cnpj_cpf ?? '',
      address: r.address ?? '', phone: r.phone ?? '', createdAt: r.created_at,
    }));
    set({ clients });
  },

  deleteClient: async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
    set(s => ({ clients: s.clients.filter(c => c.id !== id) }));
  },

  // ── Quotes ────────────────────────────────────────────────────
  saveQuote: async (quote: Quote) => {
    const uid = await getUserId();
    if (!uid) return;
    const row = {
      id: quote.id, user_id: uid,
      issuer_id: quote.issuerId || null,
      client_id: quote.clientId || null,
      numero: quote.numero || null,
      items: quote.items,
      subtotal: quote.subtotal,
      total: quote.total,
      notes: quote.notes || null,
      created_at: quote.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await supabase.from('quotes').upsert(row, { onConflict: 'id' });
    const { data } = await supabase.from('quotes').select('*').eq('user_id', uid).order('numero', { ascending: false });
    const quotes: Quote[] = (data ?? []).map((r: any) => ({
      id: r.id, issuerId: r.issuer_id ?? '', clientId: r.client_id ?? '',
      numero: r.numero ?? '', items: r.items ?? [],
      subtotal: Number(r.subtotal ?? 0), total: Number(r.total ?? 0),
      notes: r.notes ?? '', createdAt: r.created_at, updatedAt: r.updated_at,
    }));
    set({ quotes });
  },

  deleteQuote: async (id: string) => {
    await supabase.from('quotes').delete().eq('id', id);
    set(s => ({ quotes: s.quotes.filter(q => q.id !== id) }));
  },
}));

// ── Plan feature access helper ────────────────────────────────────────────
const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [],
  trial: ['pdf', 'logo', 'word', 'excel', 'export'],
  basic: [],
  pro: ['pdf', 'logo'],
  premium: ['pdf', 'logo', 'word', 'excel', 'export'],
};

export function hasAccess(plan: Plan, feature: string): boolean {
  return (PLAN_FEATURES[plan] ?? []).includes(feature);
}

export function getTrialDaysLeft(plan: Plan, trialStart: string | null): number {
  if (plan !== 'trial') return 0;
  return trialDaysLeft(trialStart);
}
