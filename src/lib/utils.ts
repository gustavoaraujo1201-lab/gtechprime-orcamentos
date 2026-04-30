// src/lib/utils.ts

export function uid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function formatDateISOtoLocal(iso: string | undefined | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function normalizeStr(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function money(v: number | string | undefined | null): string {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function moneyUnit(v: number | string | undefined | null): string {
  const n = Number(v || 0);
  let s = n.toFixed(6);
  s = s.replace(/(\.\d\d[1-9]*)0+$/, '$1');
  const [int, dec] = s.split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return intFmt + ',' + dec;
}

export function formatQuoteNumber(n: number): string {
  return `${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

export function computeNextQuoteNumberForIssuer(
  quotes: { issuerId: string; numero: string }[],
  issuerId: string
): number {
  const issuerQuotes = quotes.filter((q) => q.issuerId === issuerId);
  if (!issuerQuotes.length) return 1;
  let max = 0;
  for (const q of issuerQuotes) {
    const m = String(q.numero || '').match(/(\d+)(?!\d)/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}
