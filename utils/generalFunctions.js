/**
 * Gera um PNR aleatório de 6 caracteres contendo apenas letras maiúsculas.
 * @returns {string} Um PNR no formato "LXOXNL", como "AGIXVW".
 */
export function generatePnr() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    pnr += chars.charAt(randomIndex);
  }
  return pnr;
}

/**
 * Gera um ID de Segment Sell aleatório (ex: SSABCDEF).
 * @returns {string} Um ID de Segment Sell.
 */
export function generateSegmentSellId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SS${id}`;
}