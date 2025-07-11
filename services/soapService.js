const { js2xml } = require('xml-js');

/**
 * Envolve o corpo da resposta JSON em um envelope SOAP padrão.
 * @param {object} responseBodyJson - O objeto JSON que representa o corpo da resposta.
 * @returns {string} - A string XML da resposta SOAP completa.
 */
function createSoapResponse(responseBodyJson) {
  // --- ATUALIZADO PARA USAR SOAP-ENV ---
  const soapEnvelope = {
    'SOAP-ENV:Envelope': {
      _attributes: {
        'xmlns:SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/',
      },
      'SOAP-ENV:Body': responseBodyJson,
    },
  };
  // -------------------------------------

  const options = {
    compact: true,
    spaces: 4,
    fullTagEmptyElement: false,
  };

  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>\n${js2xml(soapEnvelope, options)}`;
  
  console.log('SOAP Response Body (XML):', xmlResponse);
  return xmlResponse;
}

module.exports = { createSoapResponse };