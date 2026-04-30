// src/types/index.ts

export interface Issuer {
  id: string;
  name: string;
  cnpjCpf: string;
  address: string;
  phone: string;
  logo: string | null;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  cnpjCpf: string;
  address: string;
  phone: string;
  createdAt?: string;
}

export interface QuoteItem {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Quote {
  id: string;
  issuerId: string;
  clientId: string;
  numero: string;
  items: QuoteItem[];
  subtotal: number;
  total: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type Plan = 'free' | 'trial' | 'basic' | 'pro' | 'premium';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  plan: Plan | null;
  trial_start: string | null;
}

export interface StoreState {
  issuers: Issuer[];
  clients: Client[];
  quotes: Quote[];
  isLoading: boolean;
  plan: Plan;
  trialStart: string | null;
  loadAll: () => Promise<void>;
  saveIssuer: (issuer: Issuer) => Promise<void>;
  deleteIssuer: (id: string) => Promise<void>;
  saveClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  saveQuote: (quote: Quote) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  syncPlan: () => Promise<void>;
}
