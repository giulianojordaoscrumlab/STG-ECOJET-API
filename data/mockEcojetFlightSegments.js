// --- Base de dados mockada para os voos da Ecojet na Bolívia ---
// Santa Cruz foi atualizado para VVI, que é o código IATA mais comum para voos comerciais.
const MOCK_FLIGHT_SCHEDULE = [
    { origin: "CBB", destination: "LPB", flightNumber: "110", durationMinutes: 50, equipment: "CRJ", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "LPB", destination: "CBB", flightNumber: "111", durationMinutes: 50, equipment: "CRJ", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "CBB", destination: "VVI", flightNumber: "220", durationMinutes: 55, equipment: "320", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "VVI", destination: "CBB", flightNumber: "221", durationMinutes: 55, equipment: "320", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "LPB", destination: "VVI", flightNumber: "330", durationMinutes: 60, equipment: "32N", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "VVI", destination: "LPB", flightNumber: "331", durationMinutes: 60, equipment: "32N", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "CBB", destination: "SRE", flightNumber: "440", durationMinutes: 40, equipment: "CRJ", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "SRE", destination: "CBB", flightNumber: "441", durationMinutes: 40, equipment: "CRJ", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "VVI", destination: "TJA", flightNumber: "550", durationMinutes: 70, equipment: "319", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "TJA", destination: "VVI", flightNumber: "551", durationMinutes: 70, equipment: "319", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "VVI", destination: "TDD", flightNumber: "660", durationMinutes: 65, equipment: "AT7", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "TDD", destination: "VVI", flightNumber: "661", durationMinutes: 65, equipment: "AT7", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "LPB", destination: "CJA", flightNumber: "770", durationMinutes: 75, equipment: "CRJ", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "CJA", destination: "LPB", flightNumber: "771", durationMinutes: 75, equipment: "CRJ", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "TDD", destination: "RIB", flightNumber: "880", durationMinutes: 45, equipment: "AT4", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "RIB", destination: "TDD", flightNumber: "881", durationMinutes: 45, equipment: "AT4", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "TDD", destination: "GYA", flightNumber: "990", durationMinutes: 50, equipment: "AT4", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
    { origin: "GYA", destination: "TDD", flightNumber: "991", durationMinutes: 50, equipment: "AT4", taxes: { CL: 2.20, ZI: 0.00, OB: 1.95, AK: 6.00, C2: 1.25 } },
];

module.exports = {
    MOCK_FLIGHT_SCHEDULE
};