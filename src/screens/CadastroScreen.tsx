// src/screens/CadastroScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { Button, Input, Card, EmptyState, LoadingOverlay, Divider } from '../components/UI';
import { colors, spacing, radius, fontSize } from '../lib/theme';
import { uid } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { Issuer, Client } from '../types';

type ActiveTab = 'emissores' | 'clientes';

const EMPTY_ISSUER = (): Issuer => ({ id: uid(), name: '', cnpjCpf: '', address: '', phone: '', logo: null });
const EMPTY_CLIENT = (): Client => ({ id: uid(), name: '', cnpjCpf: '', address: '', phone: '' });

export default function CadastroScreen() {
  const { issuers, clients, isLoading, loadAll, saveIssuer, deleteIssuer, saveClient, deleteClient } = useAppStore();
  const { signOut, displayName } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<ActiveTab>('emissores');
  const [issuerForm, setIssuerForm] = useState<Issuer | null>(null);
  const [clientForm, setClientForm] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function handlePickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria nas configurações.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 2], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const fileName = `logo_${Date.now()}.${ext}`;

    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: `image/${ext}` } as any);

    const { error } = await supabase.storage
      .from('logos').upload(fileName, formData, { upsert: true, contentType: `image/${ext}` });

    if (error) {
      // Se não tiver bucket, salva o URI local
      setIssuerForm(p => p ? { ...p, logo: uri } : p);
      return;
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
    setIssuerForm(p => p ? { ...p, logo: urlData.publicUrl } : p);
    showToast('Logo adicionado!', 'success');
  }

  async function handleSaveIssuer() {
    if (!issuerForm?.name.trim()) { showToast('Nome é obrigatório', 'error'); return; }
    setSaving(true);
    try {
      await saveIssuer(issuerForm);
      showToast('Emissor salvo!', 'success');
      setIssuerForm(null);
    } catch { showToast('Erro ao salvar', 'error'); }
    setSaving(false);
  }

  function confirmDeleteIssuer(i: Issuer) {
    Alert.alert('Excluir Emissor', `Excluir "${i.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await deleteIssuer(i.id);
        showToast('Emissor excluído', 'info');
      }},
    ]);
  }

  async function handleSaveClient() {
    if (!clientForm?.name.trim()) { showToast('Nome é obrigatório', 'error'); return; }
    setSaving(true);
    try {
      await saveClient(clientForm);
      showToast('Cliente salvo!', 'success');
      setClientForm(null);
    } catch { showToast('Erro ao salvar', 'error'); }
    setSaving(false);
  }

  function confirmDeleteClient(c: Client) {
    Alert.alert('Excluir Cliente', `Excluir "${c.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await deleteClient(c.id);
        showToast('Cliente excluído', 'info');
      }},
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading && <LoadingOverlay />}

      {/* Header escuro igual ao web */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Cadastros</Text>
          <Text style={styles.headerSub}>Olá, {displayName}</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Sair', 'Deseja sair?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: signOut },
        ])}>
          <Text style={styles.logoutBtn}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['emissores', 'clientes'] as ActiveTab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { setTab(t); setIssuerForm(null); setClientForm(null); }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'emissores' ? `🏢 Emissores (${issuers.length})` : `👤 Clientes (${clients.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero banner */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            {tab === 'emissores' ? '🏢 Cadastro de Emissor' : '👤 Cadastro de Cliente'}
          </Text>
          <Text style={styles.heroSub}>
            {tab === 'emissores' ? 'Gerencie seus emissores cadastrados' : 'Gerencie seus clientes cadastrados'}
          </Text>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatValue}>{tab === 'emissores' ? issuers.length : clients.length}</Text>
            <Text style={styles.heroStatLabel}>{tab === 'emissores' ? 'Emissores' : 'Clientes'}</Text>
          </View>
        </View>

        {/* ── EMISSORES ── */}
        {tab === 'emissores' && (
          <>
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={styles.cardTitle}>
                {issuerForm?.createdAt ? '✏️ Editar Emissor' : '➕ Adicionar Emissor'}
              </Text>
              <Input label="Nome / Razão Social *" placeholder="Nome ou Razão Social"
                value={issuerForm?.name ?? ''}
                onChangeText={v => setIssuerForm(p => ({ ...(p ?? EMPTY_ISSUER()), name: v }))} />
              <Input label="CPF / CNPJ" placeholder="CPF ou CNPJ"
                value={issuerForm?.cnpjCpf ?? ''}
                onChangeText={v => setIssuerForm(p => ({ ...(p ?? EMPTY_ISSUER()), cnpjCpf: v }))} />
              <Input label="Telefone" placeholder="(00) 00000-0000" keyboardType="phone-pad"
                value={issuerForm?.phone ?? ''}
                onChangeText={v => setIssuerForm(p => ({ ...(p ?? EMPTY_ISSUER()), phone: v }))} />
              <Input label="Endereço completo" placeholder="Rua, número, cidade - UF"
                value={issuerForm?.address ?? ''}
                onChangeText={v => setIssuerForm(p => ({ ...(p ?? EMPTY_ISSUER()), address: v }))}
                multiline numberOfLines={2} style={{ height: 60, textAlignVertical: 'top' }} />

              {/* Logotipo */}
              <Text style={styles.logoLabel}>🖼️ Logotipo do Emissor</Text>
              <Text style={styles.logoHint}>Imagem até 4mb (PNG, JPG)</Text>
              <View style={styles.logoRow}>
                <TouchableOpacity style={styles.logoBtn} onPress={handlePickLogo}>
                  <Text style={styles.logoBtnText}>📁 Escolher arquivo</Text>
                </TouchableOpacity>
                {issuerForm?.logo ? (
                  <View style={styles.logoPreviewWrap}>
                    <Image source={{ uri: issuerForm.logo }} style={styles.logoPreview} resizeMode="contain" />
                    <TouchableOpacity onPress={() => setIssuerForm(p => p ? { ...p, logo: null } : p)}>
                      <Text style={styles.logoRemove}>✕ Remover</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.logoEmpty}>Nenhum arquivo escolhido</Text>
                )}
              </View>

              <View style={styles.formRow}>
                {issuerForm?.createdAt && (
                  <Button label="Cancelar" variant="outline" onPress={() => setIssuerForm(null)} style={{ flex: 1 }} />
                )}
                <Button label={issuerForm?.createdAt ? 'Salvar Alterações' : 'Adicionar Emissor'}
                  onPress={handleSaveIssuer} loading={saving} style={{ flex: 1 }} />
              </View>
            </Card>

            <Card>
              <Text style={styles.cardTitle}>📋 Emissores Cadastrados</Text>
              {issuers.length === 0
                ? <EmptyState icon="🏢" message="Nenhum emissor cadastrado ainda" />
                : issuers.map((i, idx) => (
                  <View key={i.id}>
                    {idx > 0 && <Divider />}
                    <View style={styles.listItem}>
                      <View style={{ flex: 1 }}>
                        {!!i.logo && (
                          <Image source={{ uri: i.logo }} style={styles.listLogo} resizeMode="contain" />
                        )}
                        <Text style={styles.itemName}>{i.name}</Text>
                        {!!i.cnpjCpf && <Text style={styles.itemMeta}>CNPJ/CPF: {i.cnpjCpf}</Text>}
                        {!!i.phone && <Text style={styles.itemMeta}>Tel: {i.phone}</Text>}
                        {!!i.address && <Text style={styles.itemMeta}>{i.address}</Text>}
                      </View>
                      <View style={styles.itemBtns}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => setIssuerForm({ ...i })}>
                          <Text style={styles.editBtnText}>✏️ Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteIssuer(i)}>
                          <Text style={styles.deleteBtnText}>🗑️ Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              }
            </Card>
          </>
        )}

        {/* ── CLIENTES ── */}
        {tab === 'clientes' && (
          <>
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={styles.cardTitle}>
                {clientForm?.createdAt ? '✏️ Editar Cliente' : '➕ Adicionar Cliente'}
              </Text>
              <Input label="Nome / Empresa *" placeholder="Nome ou Empresa"
                value={clientForm?.name ?? ''}
                onChangeText={v => setClientForm(p => ({ ...(p ?? EMPTY_CLIENT()), name: v }))} />
              <Input label="CPF / CNPJ" placeholder="CPF ou CNPJ"
                value={clientForm?.cnpjCpf ?? ''}
                onChangeText={v => setClientForm(p => ({ ...(p ?? EMPTY_CLIENT()), cnpjCpf: v }))} />
              <Input label="Telefone" placeholder="(00) 00000-0000" keyboardType="phone-pad"
                value={clientForm?.phone ?? ''}
                onChangeText={v => setClientForm(p => ({ ...(p ?? EMPTY_CLIENT()), phone: v }))} />
              <Input label="Endereço completo" placeholder="Rua, número, cidade - UF"
                value={clientForm?.address ?? ''}
                onChangeText={v => setClientForm(p => ({ ...(p ?? EMPTY_CLIENT()), address: v }))}
                multiline numberOfLines={2} style={{ height: 60, textAlignVertical: 'top' }} />
              <View style={styles.formRow}>
                {clientForm?.createdAt && (
                  <Button label="Cancelar" variant="outline" onPress={() => setClientForm(null)} style={{ flex: 1 }} />
                )}
                <Button label={clientForm?.createdAt ? 'Salvar Alterações' : 'Adicionar Cliente'}
                  onPress={handleSaveClient} loading={saving} style={{ flex: 1 }} />
              </View>
            </Card>

            <Card>
              <Text style={styles.cardTitle}>👥 Clientes Cadastrados</Text>
              {clients.length === 0
                ? <EmptyState icon="👤" message="Nenhum cliente cadastrado ainda" />
                : clients.map((c, idx) => (
                  <View key={c.id}>
                    {idx > 0 && <Divider />}
                    <View style={styles.listItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{c.name}</Text>
                        {!!c.cnpjCpf && <Text style={styles.itemMeta}>CNPJ/CPF: {c.cnpjCpf}</Text>}
                        {!!c.phone && <Text style={styles.itemMeta}>Tel: {c.phone}</Text>}
                        {!!c.address && <Text style={styles.itemMeta}>{c.address}</Text>}
                      </View>
                      <View style={styles.itemBtns}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => setClientForm({ ...c })}>
                          <Text style={styles.editBtnText}>✏️ Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteClient(c)}>
                          <Text style={styles.deleteBtnText}>🗑️ Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              }
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#111827', paddingTop: 52, paddingBottom: 16, paddingHorizontal: spacing.md,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  logoutBtn: { fontSize: fontSize.sm, color: '#f87171', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#111827', paddingHorizontal: spacing.sm },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  tabTextActive: { color: '#fff' },
  content: { padding: spacing.md, paddingBottom: 80 },
  hero: {
    backgroundColor: '#0a1628', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: 'rgba(13,125,224,0.25)',
  },
  heroTitle: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700', marginBottom: 4 },
  heroSub: { color: 'rgba(180,210,255,0.7)', fontSize: fontSize.sm },
  heroStatBox: {
    marginTop: spacing.md, backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroStatValue: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700' },
  heroStatLabel: { color: 'rgba(180,210,255,0.6)', fontSize: fontSize.xs },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  formRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.sm },
  itemName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 2 },
  itemMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  itemBtns: { gap: 6, justifyContent: 'center' },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  deleteBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff5f5',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: colors.danger },

  listLogo: { width: 100, height: 40, marginBottom: 6, borderRadius: 4 },
  logoLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: 2, marginTop: spacing.sm },
  logoHint:  { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  logoBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white,
  },
  logoBtnText:  { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  logoEmpty:    { fontSize: fontSize.sm, color: colors.textWeak },
  logoPreviewWrap: { alignItems: 'center', gap: 4 },
  logoPreview: { width: 120, height: 60, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  logoRemove:  { fontSize: fontSize.xs, color: colors.danger, fontWeight: '600', marginTop: 4 },
});
