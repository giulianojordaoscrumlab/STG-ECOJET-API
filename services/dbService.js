const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'mockDatabase.json');

// Função para ler o banco de dados
const readDb = () => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erro ao ler mockDatabase.json, retornando DB vazio. Erro:", error);
        return {}; // Se o arquivo não existir ou estiver vazio, retorna um objeto vazio
    }
};

// Função para escrever no banco de dados
const writeDb = (data) => {
    try {
        // Usamos JSON.stringify com 'null, 2' para formatar o JSON de forma legível
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Erro ao escrever em mockDatabase.json:", error);
    }
};

// Salva (ou atualiza) uma reserva pelo PNR
const saveBooking = (pnr, bookingData) => {
    const db = readDb();
    db[pnr] = bookingData;
    writeDb(db);
};

// Pega uma reserva pelo PNR
const getBooking = (pnr) => {
    const db = readDb();
    return db[pnr]; // Retorna os dados da reserva ou 'undefined' se não encontrar
};

// Deleta uma reserva pelo PNR
const deleteBooking = (pnr) => {
    const db = readDb();
    if (db[pnr]) {
        delete db[pnr];
        writeDb(db);
        return true; // Sucesso
    }
    return false; // Não encontrou
};

module.exports = {
    saveBooking,
    getBooking,
    deleteBooking,
};