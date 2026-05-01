// src/screens/OrcamentosScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  TextInput, Share, Animated, Modal, FlatList, Platform,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { Button, Card, EmptyState, LoadingOverlay, Divider, Input } from '../components/UI';
import { colors, spacing, radius, fontSize } from '../lib/theme';
import { uid, money, formatDateISOtoLocal, formatQuoteNumber, computeNextQuoteNumberForIssuer } from '../lib/utils';
import type { Quote, QuoteItem } from '../types';

const EMPTY_ITEM = (): QuoteItem => ({ descricao: '', quantidade: 1, valorUnitario: 0 });

type Screen = 'list' | 'form' | 'view';

// ── Borda animada azul (igual PDF/Word/Excluir) ─────────────────────────────
function AnimatedBorder({ children, style }: { children: React.ReactNode; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(13,125,224,0.2)', 'rgba(13,125,224,0.9)'],
  });
  return (
    <Animated.View style={[style, { borderWidth: 1.5, borderRadius: radius.sm, borderColor }]}>
      {children}
    </Animated.View>
  );
}

// ── Dropdown Select (igual ao <select> da web) ──────────────────────────────
type DropdownOption = { label: string; value: string };
function DropdownSelect({
  label, placeholder, options, value, onChange, emptyMessage,
}: {
  label: string; placeholder: string; options: DropdownOption[];
  value: string; onChange: (v: string) => void; emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => options.length > 0 && setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownBtnText, !selected && { color: colors.textWeak }]}>
          {selected ? selected.label : (options.length === 0 ? (emptyMessage ?? placeholder) : placeholder)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{label}</Text>
            {/* Opção vazia */}
            <TouchableOpacity
              style={[styles.modalOption, !value && styles.modalOptionActive]}
              onPress={() => { onChange(''); setOpen(false); }}
            >
              <Text style={[styles.modalOptionText, !value && styles.modalOptionTextActive]}>
                {placeholder}
              </Text>
            </TouchableOpacity>
            <FlatList
              data={options}
              keyExtractor={o => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, item.value === value && styles.modalOptionActive]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.modalOptionText, item.value === value && styles.modalOptionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function OrcamentosScreen() {
  const { quotes, issuers, clients, isLoading, loadAll, saveQuote, deleteQuote } = useAppStore();
  const { planStatus } = useAuth();
  const { showToast } = useToast();

  const [screen, setScreen] = useState<Screen>('list');
  const [form, setForm] = useState<Quote | null>(null);
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  function calcTotals(items: QuoteItem[]) {
    const subtotal = items.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
    return { subtotal, total: subtotal };
  }

  function startNew() {
    const baseNum = computeNextQuoteNumberForIssuer(quotes, '');
    const numero = formatQuoteNumber(quotes.length + 1);
    setForm({
      id: uid(), issuerId: '', clientId: '', numero,
      items: [EMPTY_ITEM()], subtotal: 0, total: 0, notes: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    setScreen('form');
  }

  function startEdit(q: Quote) {
    setForm({ ...q, items: q.items.length ? q.items : [EMPTY_ITEM()] });
    setScreen('form');
  }

  function openView(q: Quote) {
    setViewQuote(q);
    setScreen('view');
  }

  function addItem() {
    if (!form) return;
    const items = [...form.items, EMPTY_ITEM()];
    setForm(p => p ? { ...p, items, ...calcTotals(items) } : p);
  }

  function updateItem(idx: number, field: keyof QuoteItem, value: string) {
    if (!form) return;
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      return { ...it, [field]: field === 'descricao' ? value : parseFloat(value) || 0 };
    });
    setForm(p => p ? { ...p, items, ...calcTotals(items) } : p);
  }

  function removeItem(idx: number) {
    if (!form) return;
    const items = form.items.filter((_, i) => i !== idx);
    setForm(p => p ? { ...p, items, ...calcTotals(items) } : p);
  }

  async function handleSave() {
    if (!form) return;
    if (!form.issuerId) { showToast('Selecione um emissor', 'error'); return; }
    if (!form.clientId) { showToast('Selecione um cliente', 'error'); return; }
    if (form.items.length === 0 || !form.items.some(i => i.descricao.trim())) {
      showToast('Adicione pelo menos um item com descrição', 'error'); return;
    }
    setSaving(true);
    try {
      await saveQuote({ ...form, updatedAt: new Date().toISOString() });
      showToast('Orçamento salvo!', 'success');
      setScreen('list');
      setForm(null);
    } catch { showToast('Erro ao salvar', 'error'); }
    setSaving(false);
  }

  function confirmDelete(q: Quote) {
    Alert.alert('Excluir Orçamento', `Excluir orçamento #${q.numero}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await deleteQuote(q.id);
        showToast('Orçamento excluído', 'info');
        if (screen === 'view') setScreen('list');
      }},
    ]);
  }

  async function handleShare(q: Quote) {
    // Admin e premium compartilham o link do PDF gerado no sistema web
    const canPdf = planStatus === 'admin' || planStatus === 'premium' || planStatus === 'trial';
    if (canPdf) {
      // Compartilha o link direto do orçamento em PDF (igual à web)
      const shareUrl = `https://app.gtechprime.com.br/orcamento/${q.id}`;
      await Share.share({
        message: `📄 Orçamento #${q.numero}\nhttps://app.gtechprime.com.br/orcamento/${q.id}`,
        url: shareUrl,
        title: `Orçamento #${q.numero}`,
      });
      return;
    }
    // Fallback texto para plano expirado
    const issuer = issuers.find(i => i.id === q.issuerId);
    const client = clients.find(c => c.id === q.clientId);
    const lines = [
      `*Orçamento #${q.numero}*`,
      `De: ${issuer?.name ?? '-'}`,
      `Para: ${client?.name ?? '-'}`,
      `Data: ${formatDateISOtoLocal(q.createdAt)}`,
      '',
      '*Itens:*',
      ...q.items.map(it => `• ${it.descricao} — ${it.quantidade}x R$ ${money(it.valorUnitario)} = R$ ${money(it.quantidade * it.valorUnitario)}`),
      '',
      `*Total: R$ ${money(q.total)}*`,
      q.notes ? `\nObs: ${q.notes}` : '',
    ].filter(l => l !== undefined).join('\n');
    await Share.share({ message: lines, title: `Orçamento #${q.numero}` });
  }

  // Acesso total: admin, premium ou trial ativo
  const hasFullAccess = planStatus === 'admin' || planStatus === 'premium' || planStatus === 'trial';

  // ── VIEW SCREEN ───────────────────────────────────────────────
  if (screen === 'view' && viewQuote) {
    const q = viewQuote;
    const issuer = issuers.find(i => i.id === q.issuerId);
    const client = clients.find(c => c.id === q.clientId);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Text style={styles.backBtn}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orçamento #{q.numero}</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>📋 Orçamento #{q.numero}</Text>
            <Text style={styles.heroSub}>Gerencie todos os seus orçamentos</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>R$ {money(q.total)}</Text>
                <Text style={styles.heroStatLabel}>Total</Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>{formatDateISOtoLocal(q.createdAt)}</Text>
                <Text style={styles.heroStatLabel}>Data</Text>
              </View>
            </View>
          </View>

          <Card>
            <Text style={styles.cardTitle}>Informações</Text>
            <Text style={styles.viewLabel}>Emissor</Text>
            <Text style={styles.viewValue}>{issuer?.name ?? '-'}</Text>
            {!!issuer?.cnpjCpf && <Text style={styles.viewMeta}>CNPJ/CPF: {issuer.cnpjCpf}</Text>}
            <Divider />
            <Text style={styles.viewLabel}>Cliente</Text>
            <Text style={styles.viewValue}>{client?.name ?? '-'}</Text>
            {!!client?.cnpjCpf && <Text style={styles.viewMeta}>CNPJ/CPF: {client.cnpjCpf}</Text>}
            {!!q.notes && <><Divider /><Text style={styles.viewLabel}>Observações</Text><Text style={styles.viewValue}>{q.notes}</Text></>}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Itens do Orçamento</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 3 }]}>DESCRIÇÃO</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>QTD</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>UNIT.</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>TOTAL</Text>
            </View>
            {q.items.map((it, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableRowCell, { flex: 3 }]}>{it.descricao}</Text>
                <Text style={[styles.tableRowCell, { flex: 1, textAlign: 'center' }]}>{it.quantidade}</Text>
                <Text style={[styles.tableRowCell, { flex: 2, textAlign: 'right' }]}>R$ {money(it.valorUnitario)}</Text>
                <Text style={[styles.tableRowCell, { flex: 2, textAlign: 'right', fontWeight: '700' }]}>R$ {money(it.quantidade * it.valorUnitario)}</Text>
              </View>
            ))}
            <Divider />
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>R$ {money(q.total)}</Text>
            </View>
          </Card>

          {/* Botões de ação */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(q)}>
              <Text style={styles.actionBtnText}>🔗 Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setScreen('form'); startEdit(q); }}>
              <Text style={styles.actionBtnText}>✏️ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => confirmDelete(q)}>
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>🗑️ Excluir</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── FORM SCREEN ───────────────────────────────────────────────
  if (screen === 'form' && form) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {saving && <LoadingOverlay />}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setScreen('list'); setForm(null); }}>
            <Text style={styles.backBtn}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{form.createdAt !== form.updatedAt ? `Editar #${form.numero}` : 'Novo Orçamento'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>📋 {form.createdAt !== form.updatedAt ? `Editar Orçamento #${form.numero}` : 'Novo Orçamento'}</Text>
            <Text style={styles.heroSub}>Preencha os dados abaixo para gerar um novo orçamento</Text>
          </View>

          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>Informações</Text>

            {/* Emissor */}
            <DropdownSelect
              label="Emissor *"
              placeholder="-- selecione o emissor --"
              options={issuers.map(i => ({ label: i.name, value: i.id }))}
              value={form.issuerId}
              onChange={v => setForm(p => p ? { ...p, issuerId: v } : p)}
              emptyMessage="Nenhum emissor. Cadastre primeiro."
            />

            {/* Cliente */}
            <DropdownSelect
              label="Cliente *"
              placeholder="-- selecione o cliente --"
              options={clients.map(c => ({ label: c.name, value: c.id }))}
              value={form.clientId}
              onChange={v => setForm(p => p ? { ...p, clientId: v } : p)}
              emptyMessage="Nenhum cliente. Cadastre primeiro."
            />

            <Input label="Número do Orçamento" placeholder="2026-0001"
              value={form.numero} onChangeText={v => setForm(p => p ? { ...p, numero: v } : p)} />

            <Input label="Observações" placeholder="Condições de pagamento, validade..."
              value={form.notes} onChangeText={v => setForm(p => p ? { ...p, notes: v } : p)}
              multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
          </Card>

          {/* Itens */}
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={styles.cardTitle}>📋 Itens do Orçamento</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                <Text style={styles.addItemBtnText}>+ Adicionar Item</Text>
              </TouchableOpacity>
            </View>

            {form.items.map((it, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.itemLabel}>Item {idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Text style={{ color: colors.danger, fontSize: fontSize.xs, fontWeight: '700' }}>✕ Remover</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.itemInput} placeholder="Descrição do produto/serviço"
                  placeholderTextColor={colors.textWeak} value={it.descricao}
                  onChangeText={v => updateItem(idx, 'descricao', v)} />
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>Qtd</Text>
                    <TextInput style={styles.itemInput} placeholder="1"
                      placeholderTextColor={colors.textWeak} value={String(it.quantidade)}
                      onChangeText={v => updateItem(idx, 'quantidade', v)} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.itemLabel}>Unit. (R$)</Text>
                    <TextInput style={styles.itemInput} placeholder="0"
                      placeholderTextColor={colors.textWeak} value={String(it.valorUnitario)}
                      onChangeText={v => updateItem(idx, 'valorUnitario', v)} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.itemLabel}>Total (R$)</Text>
                    <View style={[styles.itemInput, { justifyContent: 'center' }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSize.sm }}>
                        R$ {money(it.quantidade * it.valorUnitario)}
                      </Text>
                    </View>
                  </View>
                </View>
                {idx < form.items.length - 1 && <Divider style={{ marginTop: spacing.md }} />}
              </View>
            ))}

            {form.items.length > 0 && (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total: R$ {money(form.total)}</Text>
              </View>
            )}
          </Card>

          <Button label="💾 Salvar Orçamento" onPress={handleSave} loading={saving} fullWidth />
        </ScrollView>
      </View>
    );
  }

  // ── LIST SCREEN ───────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading && <LoadingOverlay />}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Orçamentos</Text>
          <Text style={styles.headerSub}>{quotes.length} orçamento{quotes.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={startNew}>
          <Text style={styles.newBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>📋 Orçamentos Salvos</Text>
          <Text style={styles.heroSub}>Gerencie todos os seus orçamentos</Text>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatValue}>{quotes.length}</Text>
            <Text style={styles.heroStatLabel}>Orçamentos</Text>
          </View>
        </View>

        {quotes.length === 0
          ? <EmptyState icon="📄" message="Nenhum orçamento criado ainda" />
          : quotes.map(q => {
            const issuer = issuers.find(i => i.id === q.issuerId);
            const client = clients.find(c => c.id === q.clientId);
            return (
              <Card key={q.id} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quoteNum}>#{q.numero}</Text>
                    <Text style={styles.quoteMeta}>DE: {issuer?.name ?? '-'}</Text>
                    <Text style={styles.quoteMeta}>PARA: {client?.name ?? '-'}</Text>
                    <Text style={styles.quoteDate}>📅 {formatDateISOtoLocal(q.createdAt)}</Text>
                  </View>
                  <View style={styles.quoteTotalBox}>
                    <Text style={styles.quoteTotal}>R$ {money(q.total)}</Text>
                  </View>
                </View>

                {/* Botões de ação — iguais ao web */}
                <Divider style={{ marginVertical: spacing.sm }} />
                <View style={styles.quoteActions}>
                  <AnimatedBorder style={{ backgroundColor: colors.white }}>
                    <TouchableOpacity style={styles.qBtnInner} onPress={() => openView(q)}>
                      <Text style={styles.qBtnText}>👁️ Ver</Text>
                    </TouchableOpacity>
                  </AnimatedBorder>
                  <AnimatedBorder style={{ backgroundColor: '#eff6ff' }}>
                    <TouchableOpacity style={styles.qBtnInner}
                      onPress={() => {
                        if (hasFullAccess) {
                          const pdfUrl = `https://app.gtechprime.com.br/orcamento/${q.id}`;
                          Share.share({ message: `📄 PDF do Orçamento #${q.numero}\n${pdfUrl}`, url: pdfUrl });
                        } else {
                          showToast('PDF disponível no plano Pro/Premium', 'info');
                        }
                      }}>
                      <Text style={[styles.qBtnText, { color: colors.primary }]}>📄 PDF</Text>
                    </TouchableOpacity>
                  </AnimatedBorder>
                  <AnimatedBorder style={{ backgroundColor: '#eff6ff' }}>
                    <TouchableOpacity style={styles.qBtnInner}
                      onPress={() => {
                        if (hasFullAccess) {
                          showToast('Exportando Word...', 'info');
                        } else {
                          showToast('Word disponível no plano Premium', 'info');
                        }
                      }}>
                      <Text style={[styles.qBtnText, { color: colors.primary }]}>📝 Word</Text>
                    </TouchableOpacity>
                  </AnimatedBorder>
                  <AnimatedBorder style={{ backgroundColor: colors.white }}>
                    <TouchableOpacity style={styles.qBtnInner} onPress={() => handleShare(q)}>
                      <Text style={styles.qBtnText}>🔗 Compartilhar</Text>
                    </TouchableOpacity>
                  </AnimatedBorder>
                  <AnimatedBorder style={{ backgroundColor: colors.white }}>
                    <TouchableOpacity style={styles.qBtnInner} onPress={() => startEdit(q)}>
                      <Text style={styles.qBtnText}>✏️ Editar</Text>
                    </TouchableOpacity>
                  </AnimatedBorder>
                  <AnimatedBorder style={{ backgroundColor: '#fff5f5' }}>
                    <TouchableOpacity style={styles.qBtnInner} onPress={() => confirmDelete(q)}>
                      <Text style={[styles.qBtnText, { color: colors.danger }]}>🗑️</Text>
                    </TouchableOpacity>
                  </AnimatedBorder>
                </View>
              </Card>
            );
          })
        }
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
  backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  newBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.md,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
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
    flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap',
  },
  heroStatValue: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  heroStatLabel: { color: 'rgba(180,210,255,0.6)', fontSize: fontSize.xs },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  quoteNum: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  quoteMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  quoteDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  quoteTotalBox: {
    backgroundColor: colors.primaryLight, borderRadius: radius.md,
    paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
  },
  quoteTotal: { color: colors.primary, fontWeight: '800', fontSize: fontSize.sm },
  quoteActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qBtnInner: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  qBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  qBtnBlue: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  qBtnDanger: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  qBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },

  dropdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.white,
    marginBottom: 0,
  },
  dropdownBtnText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden',
    maxHeight: 360, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: fontSize.md, fontWeight: '700', color: colors.text,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  modalOption: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalOptionActive: { backgroundColor: colors.primaryLight },
  modalOptionText: { fontSize: fontSize.sm, color: colors.text },
  modalOptionTextActive: { color: colors.primary, fontWeight: '700' },

  pickerLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  emptyChip: { fontSize: fontSize.sm, color: colors.textWeak, paddingVertical: 8 },
  addItemBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  addItemBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  itemRow: { marginBottom: spacing.sm },
  itemLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
  itemInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: fontSize.sm,
    color: colors.text, backgroundColor: colors.white,
  },
  totalBox: {
    backgroundColor: colors.primaryLight, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.md, alignItems: 'flex-end',
  },
  totalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  totalValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },

  tableHeader: {
    flexDirection: 'row', backgroundColor: colors.background,
    paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.sm, marginBottom: 4,
  },
  tableCell: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4 },
  tableRowCell: { fontSize: fontSize.sm, color: colors.text },

  viewLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.sm },
  viewValue: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginTop: 2 },
  viewMeta: { fontSize: fontSize.xs, color: colors.textMuted },

  actionRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, minWidth: 100, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center',
  },
  actionBtnDanger: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
});
