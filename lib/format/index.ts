/**
 * Utilidades de formateo para números y moneda según convención es-PE
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('PEN', 'S/');
}

export function formatNumber(val: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(val);
}

export function formatMm(val: number): string {
  return `${formatNumber(val)} mm`;
}

export function formatPct(val: number): string {
  return `${formatNumber(val, 1)}%`;
}
