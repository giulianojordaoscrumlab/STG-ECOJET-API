const { xml2js } = require('xml-js');

const soapHandler = (req, res, next) => {
  // --- INÍCIO DO BLOCO DE LOG ---
  console.log('\n====================================================');
  console.log(`[${new Date().toISOString()}] Nova Requisição Recebida`);
  console.log('====================================================\n');
  console.log(`Método: ${req.method}\n`);
  console.log(`URL: ${req.originalUrl}\n`);
  console.log(`Headers: ${req.headers}\n\n`);
  // --------------------------------

  // Verifica se o corpo da requisição existe e é uma string (XML)
  if (req.body && typeof req.body === 'string' && req.body.length > 0) {
    console.log(`--- Corpo da Requisição (XML Bruto) ---\n`);
    console.log(req.body);
    console.log(`\n------------------------------------\n`);

    try {
      // O parse do XML para JSON continua aqui
      req.soap = xml2js(req.body, { compact: true, spaces: 4 });

      // Este log também é útil para ver a estrutura do objeto gerado
      console.log(`\n--- Corpo da Requisição (JSON Parseado) ---\n`);
      console.log(JSON.stringify(req.soap, null, 2));
      console.log(`\n----------------------------------------\n`);

    } catch (error) {
      console.error('ERRO AO PARSEAR O XML:', error);
      return res.status(400).send('Invalid XML format');
    }
  } else {
    console.log('Requisição recebida sem corpo ou com corpo inválido.');
  }

  // Continua para o próximo middleware (no nosso caso, as rotas)
  next();
};

module.exports = soapHandler;