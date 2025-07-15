const express = require('express');
const router = express.Router();
const resAdapterController = require('../controllers/resAdapterController');
const { createSoapResponse } = require('../services/soapService');
const path = require('path');
const fs = require('fs');

let host;
let environment;

// Todas as requisições SOAP chegarão a este endpoint POST
router.post('/', (req, res) => {
  res.set('Content-Type', 'text/xml');

  // --- LÓGICA DE VERIFICAÇÃO ATUALIZADA ---
  const soapEnvelope = req.soap ? (req.soap['SOAP-ENV:Envelope'] || req.soap['soap:Envelope']) : null;
  const soapBody = soapEnvelope ? (soapEnvelope['SOAP-ENV:Body'] || soapEnvelope['soap:Body']) : null;

  if (!soapBody) {
    console.error('Requisição SOAP inválida: não foi possível encontrar o Body do envelope SOAP.');
    return res.status(400).send('<error>Invalid SOAP request: Body not found</error>');
  }
  // ----------------------------------------

  const action = Object.keys(soapBody)[0];
  let responseJson;

  switch (action) {
    case 'm:pingRequest':
    case 'pingRequest':
      responseJson = resAdapterController.ping(soapBody);
      break;

    case 'ns2:availabilityRequest':
    case 'availabilityRequest':
      responseJson = resAdapterController.getAvailability(req.soap);
      break;

    case 'ns2:availabilityDetailsRequest':
    case 'availabilityDetailsRequest':
      responseJson = resAdapterController.getAvailabilityDetails(req.soap);
      break;

    case 'ns2:segmentSellRequest':
    case 'doSegmentSell':
      responseJson = resAdapterController.doSegmentSell(req.soap);
      break;

    case 'ns2:initRefundTicketRequest':
    case 'initRefundTicketRequest':
        responseJson = resAdapterController.initRefund(soapBody);
        break;

    case 'ns2:updateRefundTicketRequest':
    case 'updateRefundTicketRequest':
        responseJson = resAdapterController.updateRefund(soapBody);
        break;

    case 'ns2:confirmRefundTicketRequest':
    case 'confirmRefundTicketRequest':
        responseJson = resAdapterController.confirmRefund(soapBody);
        break;

    case 'ns2:bookingRequest':
    case 'bookingRequest':
      responseJson = resAdapterController.booking(soapBody); 
      break;
    
    case 'ns2:pricingRequest':
    case 'pricingRequest':
      responseJson = resAdapterController.pricing(soapBody); 
      break;
    
    case 'ns2:retrieveBookingRequest':
    case 'retrieveBookingRequest':
      responseJson = resAdapterController.retrieveBooking(soapBody); 
      break;
    
    case 'ns2:retrieveTicketRequest':
    case 'retrieveTicketRequest':
      responseJson = resAdapterController.retrieveTicket(soapBody); 
      break;

    case 'ns2:createTicketRequest':
    case 'createTicketRequest':
        responseJson = resAdapterController.createTicket(soapBody);
        break;
    
    case 'ns2:cancelSegmentSellRequest':
    case 'cancelSegmentSellRequest':
        responseJson = resAdapterController.cancelSegmentSell(soapBody);
        break;
    
    case 'ns2:cancelBookingRequest':
    case 'cancelBookingRequest':
        responseJson = resAdapterController.cancelBooking(soapBody);
        break;

    case 'ns2:confirmRefundTicketRequest':
    case 'confirmRefundTicketRequest':
        responseJson = resAdapterController.confirmRefund(soapBody);
        break;

    case 'ns2:modifyBookingRequest':
    case 'modifyBookingRequest':
        responseJson = resAdapterController.modifyBooking(soapBody);
        break;

    default:
      console.warn(`[ALERTA] Ação SOAP não tratada recebida: ${action}`);
      console.warn('Corpo da requisição:', JSON.stringify(soapBody, null, 2));
      
      responseJson = {
        'soap:Fault': {
          faultcode: 'soap:Client',
          faultstring: `A ação SOAP '${action}' não é suportada por este servidor mock.`,
        },
      };
      const errorResponse = createSoapResponse(responseJson);
      return res.status(500).send(errorResponse);
  }
  
  const finalSoapResponse = createSoapResponse(responseJson);
  res.status(200).send(finalSoapResponse);
});

// Rota GET para WSDL
router.get('/', (req, res) => {
    host = req.headers.host;

    environment = (host.includes('prd.') || host.includes('prod.')) 
        ? "Production Server"
        :  (host.includes('stg.') || host.includes('stage.')) 
            ? "Stage Server"
            : (host.includes('hml.') || host.includes('homol.')) 
                ? "Homologation Server"
                : (host.includes('tst.') || host.includes('test.')) 
                    ? "Test Server"
                    : "Local Server";

    // Verifica se a query string '?wsdl' está presente
    if (req.query.hasOwnProperty('wsdl')) {
      const wsdlPath = path.join(__dirname, '..', 'schemas', 'RESAdapterService.wsdl');
      
      fs.readFile(wsdlPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Erro ao ler o arquivo WSDL:', err);
          res.status(500).send('Erro interno: não foi possível carregar o WSDL.');
        } else {
          res.set('Content-Type', 'text/xml');
          res.send(data);
        }
      });
    } else {
      res.status(200).send(defaultPage(environment));
    }
});


const defaultPage = (env) => `
    <!doctype html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Linea Aérea Ecojet API</title>
          <style>
              html, body {
                  margin: 0;
                  padding: 0;
                  height: 100%;
                  background-color: #0693e3;
                  display: flex;
                  flex-direction: column;
                  font-family: "Sans";
              }

              .container {
                  flex: 1;
                  display: flex;
                  justify-content: center;
                  align-items: center;
              }

              .footer {
                  position: fixed;
                  bottom: 20px;
                  width: 100%;
                  text-align: center;
                  font-size: 12px;
                  color: #fff;
                  font-family: "Sans";
              }

              .footer .btlink {
                  color: #FFFFFF;
                  background-color: #FF8800;
                  text-decoration: none;
                  padding: 2px 4px;
                  border-radius: 10px;
              }
              
              .H1 {
                font-family: Roboto;
                color: #fff;
                font-size: 12pt;
                width: 100%;
                text-align: center;
                heigth: 25px;
                position: absolute;
                bottom: 50px;
              }
              .H2 {
                font-family: Roboto;
                color: #fff;
                font-size: 12pt;
                width: 100%;
                text-align: center;
                heigth: 25px;
                position: absolute;
                bottom: 150px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <img src="images/ecoblanco.png" alt="Logo" />
          </div>
          <div class="H1">CoreApi Linea Aérea Ecojet</div>
          <div class="H2">${env}</div>
          <div class="footer">
              Powered by
              <a class="btlink" href="https://scrumlab.com.br" target="_blank">ScrumLab</a>
          </div>
      </body>
      </html>`
;

module.exports = router;