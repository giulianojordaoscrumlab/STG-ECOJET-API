const { xml2js } = require('xml-js');

const soapHandler = (req, res, next) => {
  // O middleware express.text() já deve ter colocado o corpo XML em req.body
  // e validado o Content-Type.
  if (req.body && typeof req.body === 'string' && req.body.length > 0) {
    try {
      // Converte o XML para um objeto JS e o anexa ao request
      // A opção compact: true cria uma estrutura mais limpa.
      // A opção alwaysChildren: true garante que os nós sempre tenham um array de filhos,
      // facilitando o acesso, mesmo que haja apenas um filho.
      req.soap = xml2js(req.body, { compact: true, spaces: 4 });
      console.log('SOAP Request Body (JSON):', JSON.stringify(req.soap, null, 2));
    } catch (error) {
      console.error('Error parsing XML:', error);
      return res.status(400).send('Invalid XML format');
    }
  }
  next();
};

module.exports = soapHandler;