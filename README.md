# SoftPrime Orçamentos — App Mobile

Aplicativo mobile de geração de orçamentos profissionais, construído com **Expo (React Native)** e **Supabase** como backend.

---

## Tecnologias

- **Expo SDK 51** com Expo Router (navegação baseada em arquivos)
- **React Native 0.74**
- **Supabase** — autenticação e banco de dados (PostgreSQL com RLS)
- **Zustand** — gerenciamento de estado global
- **TypeScript**

---

## Estrutura do projeto

```
softprime-app/
├── app/                        # Telas do app (Expo Router)
│   ├── (auth)/
│   │   └── LoginScreen.tsx     # Tela de login e cadastro
│   ├── cadastro.tsx            # Novo orçamento
│   ├── cadastro_emissor.tsx    # Cadastro de emissores
│   ├── cadastro_cliente.tsx    # Cadastro de clientes
│   ├── orcamentos_salvos.tsx   # Lista de orçamentos salvos
│   └── planos.tsx              # Tela de planos e assinatura
├── components/
│   ├── UI.tsx                  # Componentes reutilizáveis (Button, Input, Card...)
│   └── Toast.tsx               # Notificações toast
├── hooks/
│   └── useAuth.ts              # Hook de autenticação com Supabase
├── lib/
│   ├── supabase.ts             # Instância do cliente Supabase
│   ├── theme.ts                # Design tokens (cores, espaçamentos, fontes)
│   └── utils.ts                # Funções utilitárias (formatação, uid, etc.)
├── store/
│   └── appStore.ts             # Store Zustand (emissores, clientes, orçamentos, planos)
├── types/
│   └── index.ts                # Interfaces TypeScript (Issuer, Client, Quote, Plan...)
├── assets/                     # Ícones, splash, fontes
├── app.json                    # Configuração do Expo
├── babel.config.js             # Configuração do Babel
├── package.json                # Dependências
└── schema.sql                  # Script SQL para criação das tabelas no Supabase
```

---

## Como rodar o projeto

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI: `npm install -g expo-cli`
- Conta no [Supabase](https://supabase.com)
- Expo Go no celular (para testes) **ou** emulador Android/iOS

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar o Supabase

As credenciais já estão no `app.json` no campo `extra`. Para trocar de projeto Supabase, edite:

```json
"extra": {
  "SUPABASE_URL": "https://SEU-PROJETO.supabase.co",
  "SUPABASE_ANON_KEY": "SUA_CHAVE_ANON"
}
```

### 3. Criar as tabelas no Supabase

Execute o arquivo `schema.sql` no **SQL Editor** do painel do Supabase. Ele cria todas as tabelas com as políticas de Row Level Security (RLS) corretas.

### 4. Rodar o app

```bash
# Iniciar servidor de desenvolvimento
npm start

# Rodar direto no Android
npm run android

# Rodar direto no iOS
npm run ios
```

Escaneie o QR code com o **Expo Go** ou abra no emulador.

---

## Build para produção

O projeto usa **EAS Build** (Expo Application Services).

```bash
# Build Android (.apk / .aab)
npm run build:android

# Build iOS (.ipa)
npm run build:ios
```

Certifique-se de ter o `eas-cli` instalado e o projeto configurado com `eas.json`.

---

## Funcionalidades

- Autenticação por email/senha e por nome de usuário
- Recuperação de senha por email
- Cadastro de emissores (empresa/prestador) com logo
- Cadastro de clientes
- Criação de orçamentos com múltiplos itens
- Numeração automática de orçamentos por emissor
- Exportação em PDF
- Sistema de planos: Free, Trial (7 dias), Pro e Premium
- Suporte a usuários com acesso vitalício

---

## Planos e funcionalidades

| Recurso     | Free | Trial | Pro | Premium |
|-------------|------|-------|-----|---------|
| PDF         | ❌   | ✅    | ✅  | ✅      |
| Logo        | ❌   | ✅    | ✅  | ✅      |
| Word/Excel  | ❌   | ✅    | ❌  | ✅      |
| Exportação  | ❌   | ✅    | ❌  | ✅      |

---

## Banco de dados (Supabase)

Tabelas utilizadas:

- `profiles` — perfil do usuário (username, plano, trial)
- `issuers` — emissores cadastrados pelo usuário
- `clients` — clientes cadastrados pelo usuário
- `quotes` — orçamentos gerados

Todas as tabelas têm **Row Level Security (RLS)** ativo, garantindo que cada usuário acessa apenas seus próprios dados.

---

## Observações

- O app é orientado para **portrait** (retrato) em iOS e Android.
- Não há suporte a tablet (`supportsTablet: false`).
- O bundle identifier iOS é `br.com.softprime.orcamentos` e o package Android é `br.com.softprime.orcamentos`.
