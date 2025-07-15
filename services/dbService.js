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

// Pega uma reserva pelo Ticket
const getTicket = (ticketNumber) => {
    const db = readDb();
    // Itera sobre todas as chaves (PNRs) do banco de dados
    for (const pnr in db) {
        // Acessa o array de bilhetes de forma segura com optional chaining (?.)
        const ticketingBlocks = db[pnr]?.otaAirBookRS?.AirReservation?.['ota:Ticketing'];
        if (ticketingBlocks && Array.isArray(ticketingBlocks)) {
            // Procura dentro do array de bilhetes
            const foundTicket = ticketingBlocks.find(
                ticket => ticket['ota:TicketAdvisory']._text === ticketNumber
                
            );
            if (foundTicket) {
                // Se encontrar, retorna o objeto completo da reserva associada
                return db[pnr]; 
            }
        }
    }
    // Se o loop terminar e não encontrar nada, retorna undefined
    return undefined; 
};

// Deleta uma reserva pelo Ticket
const deleteTicket = (ticketNumber) => {
    const db = readDb();
    let pnrToDelete = null;

    // Primeiro, encontra o PNR associado ao número do bilhete
    for (const pnr in db) {
        const ticketingBlocks = db[pnr]?.AirReservation?.['ota:Ticketing'];
        if (ticketingBlocks && Array.isArray(ticketingBlocks)) {
            const found = ticketingBlocks.some(
                ticket => ticket['ota:TicketAdvisory']?._text === ticketNumber
            );
            if (found) {
                pnrToDelete = pnr;
                break; // Encontrou o PNR, pode parar de procurar
            }
        }
    }

    // Se encontrou um PNR para deletar, usa a função deleteBooking que já funciona
    if (pnrToDelete) {
        return deleteBooking(pnrToDelete);
    }
    
    return false; // Não encontrou o bilhete para deletar
};

const saveTicket = (pnr, ticketData) => {
    const db = readDb();
    const bookingRecord = db[pnr];

    // 1. Verifica se a reserva existe
    if (!bookingRecord) {
        console.error(`Erro ao salvar bilhete: PNR ${pnr} não encontrado.`);
        return false;
    }

    // Garante que o container ota:AirReservation exista
    if (!bookingRecord.otaAirBookRS?.AirReservation) {
         console.error(`Erro ao salvar bilhete: Estrutura da reserva para o PNR ${pnr} é inválida.`);
        return false;
    }

    // 2. Garante que o array de bilhetes exista
    if (!bookingRecord.otaAirBookRS.AirReservation['ota:Ticketing']) {
        bookingRecord.otaAirBookRS.AirReservation['ota:Ticketing'] = [];
    }

    // 3. Adiciona o novo bilhete ao array
    bookingRecord.otaAirBookRS.AirReservation['ota:Ticketing'].push(ticketData);

    // 4. Salva a reserva modificada de volta no DB
    writeDb(db);
    console.log(`Bilhete adicionado com sucesso ao PNR ${pnr}.`);
    return true;
};

module.exports = {
    saveBooking,
    getBooking,
    deleteBooking,
    getTicket,
    deleteTicket,
    saveTicket,
};