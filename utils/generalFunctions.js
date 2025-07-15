/**
 * Gera um PNR aleatório de 6 caracteres contendo apenas letras maiúsculas.
 * @returns {string} Um PNR no formato "LXOXNL", como "AGIXVW".
 */
function generatePnr() {
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
function generateSegmentSellId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SS${id}`;
}

/**
 * Gera um número de bilhete mockado no formato 874-XXXXXXXXXX.
 * @returns {string} Um número de bilhete.
 */
function generateTicketNumber() {
  // O prefixo de 3 dígitos da companhia aérea. Usaremos um mock para a Ecojet.
  const airlinePrefix = '874'; 
  
  // Gera um número de 10 dígitos aleatório.
  const serialNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

  return `${airlinePrefix}-${serialNumber}`;
}

module.exports = {
    generatePnr,
    generateSegmentSellId,
    generateTicketNumber
};