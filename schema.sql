-- ============================================================
-- GTech Orçamentos — Schema do banco de dados (Supabase)
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Extensão para geração de UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- TABELA: profiles
-- Perfil do usuário, vinculado ao auth.users do Supabase
-- ============================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  username      text unique,
  full_name     text,
  plan          text not null default 'free',   -- 'free' | 'trial' | 'basic' | 'pro' | 'premium'
  trial_start   timestamptz default null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table profiles enable row level security;

-- Leitura pública de username e email (necessário para login por username)
create policy "profiles_select_public"
  on profiles for select
  using (true);

-- Cada usuário insere apenas seu próprio perfil
create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

-- Cada usuário atualiza apenas seu próprio perfil
create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);


-- ============================================================
-- TABELA: issuers
-- Emissores (empresa ou prestador) cadastrados pelo usuário
-- ============================================================
create table if not exists issuers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  cnpj_cpf    text,
  address     text,
  phone       text,
  logo        text,   -- URL ou base64 da imagem do logo
  created_at  timestamptz default now()
);

alter table issuers enable row level security;

create policy "issuers_select_own"
  on issuers for select
  using (auth.uid() = user_id);

create policy "issuers_insert_own"
  on issuers for insert
  with check (auth.uid() = user_id);

create policy "issuers_update_own"
  on issuers for update
  using (auth.uid() = user_id);

create policy "issuers_delete_own"
  on issuers for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TABELA: clients
-- Clientes cadastrados pelo usuário
-- ============================================================
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  cnpj_cpf    text,
  address     text,
  phone       text,
  created_at  timestamptz default now()
);

alter table clients enable row level security;

create policy "clients_select_own"
  on clients for select
  using (auth.uid() = user_id);

create policy "clients_insert_own"
  on clients for insert
  with check (auth.uid() = user_id);

create policy "clients_update_own"
  on clients for update
  using (auth.uid() = user_id);

create policy "clients_delete_own"
  on clients for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TABELA: quotes
-- Orçamentos gerados pelo usuário
-- ============================================================
create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  issuer_id   uuid references issuers(id) on delete set null,
  client_id   uuid references clients(id) on delete set null,
  numero      text,
  items       jsonb not null default '[]'::jsonb,
  -- Estrutura esperada de cada item em items:
  -- { "descricao": string, "quantidade": number, "valorUnitario": number }
  subtotal    numeric(12,2) not null default 0,
  total       numeric(12,2) not null default 0,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table quotes enable row level security;

create policy "quotes_select_own"
  on quotes for select
  using (auth.uid() = user_id);

create policy "quotes_insert_own"
  on quotes for insert
  with check (auth.uid() = user_id);

create policy "quotes_update_own"
  on quotes for update
  using (auth.uid() = user_id);

create policy "quotes_delete_own"
  on quotes for delete
  using (auth.uid() = user_id);


-- ============================================================
-- FUNÇÃO: handle_new_user
-- Cria automaticamente o perfil quando um novo usuário
-- se registra via Supabase Auth
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, full_name, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger que dispara a função acima após cada novo usuário criado
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- ÍNDICES para melhorar performance nas queries principais
-- ============================================================
create index if not exists idx_issuers_user_id  on issuers(user_id);
create index if not exists idx_clients_user_id  on clients(user_id);
create index if not exists idx_quotes_user_id   on quotes(user_id);
create index if not exists idx_quotes_issuer_id on quotes(issuer_id);
create index if not exists idx_profiles_username on profiles(username);
