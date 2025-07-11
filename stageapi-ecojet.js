const express = require('express');
const cors = require('cors');
const soapHandler = require('./middlewares/soapHandler');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Aplicar CORS
app.use(cors());

// 2. Middleware para processar o corpo da requisição como texto bruto (necessário para o SOAP)
// O express.text() é crucial para que o middleware soapHandler receba o XML como string.
app.use(express.text({ type: ['text/xml', 'application/soap+xml'] }));

// 3. Nosso middleware customizado para converter XML -> JSON
app.use(soapHandler);

// 4. Usar as rotas da API
// Todas as requisições SOAP serão direcionadas para '/ws'
app.use('/', apiRoutes);

// Rota raiz para verificação
app.get('/', (req, res) => {
  res.send('Ecojet_STG_API is running. Send SOAP requests to /ws');
});

app.listen(PORT, () => {
  console.log(`Ecojet_STG_API listening on port ${PORT}`);
  console.log(`WSDL should be available at http://localhost:${PORT}/ws?wsdl`);
});