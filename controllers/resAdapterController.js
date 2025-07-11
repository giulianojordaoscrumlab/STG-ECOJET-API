const dbService = require('../services/dbService');
const { MOCK_FLIGHT_SCHEDULE } = require("../data/mockEcojetFlightSegments");
const { generatePnr } = require("../utils/generalFunctions");

// controllers/resAdapterController.js

/**
 * Função Ping (sem alterações)
 */
function ping(soapBody) {
  const token = soapBody['m:pingRequest']?.['m0:token']?._text || soapBody['pingRequest']?.['token']?._text || 'token-not-found';
  const responseBody = {
    'm:pingResponse': {
      _attributes: { 'xmlns:m': 'http://service.resadapter.myidtravel.lhsystems.com' },
      'm0:token': { _attributes: { 'xmlns:m0': 'http://bos.service.resadapter.myidtravel.lhsystems.com' }, _text: token },
      'm0:time': { _attributes: { 'xmlns:m0': 'http://bos.service.resadapter.myidtravel.lhsystems.com' }, _text: new Date().toTimeString().split(' ')[0] }
    }
  };
  return responseBody;
}

/**
 * Manipula a requisição de disponibilidade de voos (Flight Schedule & Availability).
 * Retorna uma lista de voos mockados para os trechos solicitados.
 * Baseado na seção 3 do PDF e no exemplo fornecido pelo usuário.
 */
function getAvailability(soapBody) {
    console.log("Iniciando flightAvailability com o seguinte corpo SOAP:", JSON.stringify(soapBody, null, 2));

    // 1. Lógica de extração de dados mais segura
    const availabilityRequest = soapBody["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["ns2:availabilityRequest"];
    const otaRequest = availabilityRequest['ota:OTA_AirAvailRQ'];
    const employeeData = availabilityRequest['myid:employeeData'];

    if (!otaRequest || !employeeData) {
        console.error("ERRO CRÍTICO: Não foi possível encontrar <ota:OTA_AirAvailRQ> ou <myid:employeeData> dentro da requisição.");
        return { 'Error': 'Invalid request structure: missing main OTA or employee data nodes.' };
    }

    const echoToken = otaRequest._attributes?.EchoToken || 'mock-avail-token';
    const requestedODsNode = otaRequest['ota:OriginDestinationInformation'] || [];
    const requestedODsArray = Array.isArray(requestedODsNode) ? requestedODsNode : [requestedODsNode];

    // 2. Mapeia os trechos solicitados para uma resposta (lógica inalterada)
    const responseODs = requestedODsArray.map(od => {
        const origin = od['ota:OriginLocation']?._attributes.LocationCode;
        const destination = od['ota:DestinationLocation']?._attributes.LocationCode;
        const departureDateTime = od['ota:DepartureDateTime']?._text;
        const requestedDate = departureDateTime.split('T')[0];

        const foundFlights = MOCK_FLIGHT_SCHEDULE.filter(
            flight => flight.origin === origin && flight.destination === destination
        );

        const flightOptions = [];
        foundFlights.forEach(flight => {
            const departureTimes = ["10:30:00Z", "20:30:00Z"];
            departureTimes.forEach(time => {
                const departureTime = new Date(`${requestedDate}T${time}`);
                const arrivalTime = new Date(departureTime.getTime() + flight.durationMinutes * 60000);
                flightOptions.push({
                    'OriginDestinationOption': {
                        'FlightSegment': {
                            _attributes: { DepartureDateTime: departureTime.toISOString(), ArrivalDateTime: arrivalTime.toISOString(), FlightNumber: flight.flightNumber, JourneyDuration: `PT${flight.durationMinutes}M`, StopQuantity: "0", Ticket: "eTicket" },
                            'DepartureAirport': { _attributes: { LocationCode: flight.origin, CodeContext: "IATA" } },
                            'ArrivalAirport': { _attributes: { LocationCode: flight.destination, CodeContext: "IATA" } },
                            'OperatingAirline': { _attributes: { CompanyShortName: '8J' } },
                            'BookingClassAvail': [{ _attributes: { ResBookDesigCode: "Y", ResBookDesigQuantity: "9" } }, { _attributes: { ResBookDesigCode: "B", ResBookDesigQuantity: "5" } }],
                            'Equipment': { _attributes: { AirEquipType: flight.equipment } }
                        }
                    }
                });
            });
        });
        return {
            'OriginDestinationOptions': flightOptions,
            'DepartureDateTime': { _text: departureDateTime },
            'OriginLocation': { _attributes: { LocationCode: origin, CodeContext: "IATA" } },
            'DestinationLocation': { _attributes: { LocationCode: destination, CodeContext: "IATA" } }
        };
    });

    // 3. Monta a resposta final
    const responseBody = {
        'ns2:availabilityResponse': {
            _attributes: { 'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com", 'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com", 'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" },
            'myid:employeeData': employeeData,
            'ota:OTA_AirAvailRS': {
                _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: "Test", Version: "1.1" },
                'ota:Success': {},
                'ota:OriginDestinationInformation': responseODs
            }
        }
    };
    return responseBody;
}

/**
 * Função getAvailabilityDetails (sem alterações)
 */
function getAvailabilityDetails(fullSoapRequest) {
    const soapBody = fullSoapRequest['soap:Envelope']['soap:Body'];
    const airDetailsRequest = soapBody['ns2:availabilityDetailsRequest'];
    const otaRequest = airDetailsRequest?.['ota:OTA_AirDetailsRQ'];
    const echoToken = otaRequest?._attributes?.EchoToken || 'mock-token';
    const originLocation = otaRequest?.['ota:AirDetail']?.['ota:DepartureAirport']?._attributes?.LocationCode || 'AAA';
    const destinationLocation = otaRequest?.['ota:AirDetail']?.['ota:ArrivalAirport']?._attributes?.LocationCode || 'BBB';
    const departureDate = otaRequest?.['ota:AirDetail']?.['ota:DepartureDate']?._text || new Date().toISOString().split('T')[0];
    const responseBody = {
        'ns:availabilityDetailsResponse': {
            _attributes: { 'xmlns:ns': 'http://service.resadapter.myidtravel.lhsystems.com', 'xmlns:ns1': 'http://bos.service.resadapter.myidtravel.lhsystems.com', },
            'ns1:MyID_AirAvailDetailRS': {
                _attributes: { Version: '1.1', TimeStamp: new Date().toISOString(), EchoToken: echoToken, Target: 'Test', },
                'ns1:Success': {},
                'ns1:FlightSegment': [
                    { _attributes: { DepartureDateTime: `${departureDate}T09:00:00`, ArrivalDateTime: `${departureDate}T11:30:00`, FlightNumber: 'E9-101', JourneyDuration: 'PT2H30M', StopQuantity: '0', Ticket: 'eTicket' }, 'ns1:DepartureAirport': { _attributes: { LocationCode: originLocation, CodeContext: 'IATA' } }, 'ns1:ArrivalAirport': { _attributes: { LocationCode: destinationLocation, CodeContext: 'IATA' } }, 'ns1:OperatingAirline': { _attributes: { CompanyShortName: 'E9' } }, 'ns1:Equipment': { _attributes: { AirEquipType: '320' } }, 'ns1:BookingClassAvail': [ { _attributes: { ResBookDesigCode: 'Y', ResBookDesigQuantity: '9' } }, { _attributes: { ResBookDesigCode: 'M', ResBookDesigQuantity: '9' } } ] },
                    { _attributes: { DepartureDateTime: `${departureDate}T15:00:00`, ArrivalDateTime: `${departureDate}T17:30:00`, FlightNumber: 'E9-105', JourneyDuration: 'PT2H30M', StopQuantity: '0', Ticket: 'eTicket' }, 'ns1:DepartureAirport': { _attributes: { LocationCode: originLocation, CodeContext: 'IATA' } }, 'ns1:ArrivalAirport': { _attributes: { LocationCode: destinationLocation, CodeContext: 'IATA' } }, 'ns1:OperatingAirline': { _attributes: { CompanyShortName: 'E9' } }, 'ns1:Equipment': { _attributes: { AirEquipType: '32N' } }, 'ns1:BookingClassAvail': [ { _attributes: { ResBookDesigCode: 'Y', ResBookDesigQuantity: '9' } }, { _attributes: { ResBookDesigCode: 'M', ResBookDesigQuantity: '2' } } ] }
                ]
            }
        }
    };
    return responseBody;
}

// /**
//  * Função doSegmentSell (sem alterações)
//  */
// function doSegmentSell(fullSoapRequest) {
//     const echoToken = fullSoapRequest['soap:Envelope']['soap:Body']?.['OTA_AirBookRQ']?._attributes?.EchoToken || 'mock-token-ss';
//     const responseBody = {
//         'OTA_AirBookRS': {
//             _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: 'Test', Version: '1.0' },
//             'Success': {},
//             'AirReservation': {
//                 'BookingReferenceID': { _attributes: { Type: 'SS', ID: `SS${Math.random().toString(36).substring(2, 8).toUpperCase()}`, ID_Context: 'Segment Sell' } }
//             }
//         }
//     };
//     return responseBody;
// }
/**
 * --- ATUALIZADO ---
 * Manipula a requisição de doSegmentSell.
 * Agora salva um estado de pré-reserva no DB.
 * Baseado na seção 5 do PDF.
 */
function doSegmentSell(soapBodyRequest) {
    const soapBody = soapBodyRequest["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["ns2:segmentSellRequest"];
    const otaRequest = soapBody?.['ota:OTA_AirBookRQ'];
    const echoToken = otaRequest?._attributes?.EchoToken || 'mock-ss-token';
    const newSegmentSellId = generatePnr();

    // 1. Monta o objeto que será salvo no DB.
    // Usamos a estrutura da resposta (AirReservation) para armazenar os dados.
    const segmentSellToSave = {
        _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString() },
        'AirReservation': {
            'AirItinerary': otaRequest['ota:AirItinerary'],
            'TravelerInfo': otaRequest['ota:TravelerInfo'],
            'BookingReferenceID': {
                _attributes: { Type: "SS", ID: newSegmentSellId, ID_Context: "Segment Sell" }
            }
        }
    };

    // 2. Salva a pré-reserva no nosso "banco de dados" JSON
    dbService.saveBooking(newSegmentSellId, segmentSellToSave);
    console.log(`Segment Sell com ID ${newSegmentSellId} foi salvo no mockDatabase.json`);

    // 3. Monta a resposta final, que é o mesmo objeto que salvamos
    const responseBody = {
        'OTA_AirBookRS': segmentSellToSave
    };

    return responseBody;
}


// /**
//  * Manipula a requisição de booking.
//  * Recebe diretamente o corpo do SOAP (soapBody).
//  */
// function booking(soapBody) { // A função agora recebe 'soapBody'
//     // --- LÓGICA ATUALIZADA ---
//     // Não precisamos mais procurar pelo envelope ou corpo aqui.
//     const otaRequest = soapBody?.['ns2:bookingRequest']?.['ota:OTA_AirBookRQ'];
//     const employeeData = soapBody?.['ns2:bookingRequest']?.['myid:employeeData'];
    
//     // Extrai dados para a resposta
//     const echoToken = otaRequest?._attributes?.EchoToken || 'mock-token-book';
//     const traveler = otaRequest?.['ota:TravelerInfo']?.['ota:AirTraveler'];
//     const flightSegment = otaRequest?.['ota:AirItinerary']?.['ota:OriginDestinationOptions']?.['ota:OriginDestinationOption']?.['ota:FlightSegment'];
    
//     // Gera um PNR aleatório para o novo booking
//     const newPnrId = generatePnr();

//     // Monta a resposta JSON completa, espelhando a estrutura do manual
//     const responseBody = {
//         'bookingResponse': {
//             _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
//             'employeeData': employeeData,
//             'OTA_AirBookRS': {
//                 _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: 'Test', Version: '1.1' },
//                 'Success': {},
//                 'AirReservation': {
//                     'AirItinerary': {
//                         'OriginDestinationOptions': {
//                             'OriginDestinationOption': {
//                                 'FlightSegment': flightSegment
//                             }
//                         }
//                     },
//                     'PriceInfo': otaRequest?.['ota:PriceInfo'],
//                     'TravelerInfo': {
//                         'AirTraveler': traveler,
//                         'SpecialReqDetails': otaRequest?.['ota:TravelerInfo']?.['ota:SpecialReqDetails']
//                     },
//                     'BookingReferenceID': {
//                         _attributes: {
//                             ID: newPnrId,
//                             Type: '14'
//                         }
//                     }
//                 }
//             }
//         }
//     };
//     return responseBody;
// }

/**
 * --- ATUALIZADO ---
 * Manipula a requisição de booking. Agora salva a reserva no DB.
*/
function booking(soapBody) {
    const otaRequest = soapBody?.['ns2:bookingRequest']?.['ota:OTA_AirBookRQ'];
    const newPnrId = generatePnr();

    // 1. Cria o objeto da reserva que será salvo
    const bookingToSave = {
        _attributes: { EchoToken: otaRequest._attributes.EchoToken, TimeStamp: new Date().toISOString(), Target: 'Test', Version: '1.1' },
        'AirReservation': {
            'AirItinerary': otaRequest['ota:AirItinerary'],
            'PriceInfo': otaRequest['ota:PriceInfo'],
            'TravelerInfo': otaRequest['ota:TravelerInfo'],
            'BookingReferenceID': { _attributes: { ID: newPnrId, Type: '14' } }
        }
    };

    // 2. Salva a reserva no nosso "banco de dados" JSON
    dbService.saveBooking(newPnrId, bookingToSave);
    console.log(`Reserva com PNR ${newPnrId} foi salva no mockDatabase.json`);

    // 3. Monta a resposta final
    const responseBody = {
        'bookingResponse': {
            _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
            'employeeData': soapBody?.['ns2:bookingRequest']?.['myid:employeeData'],
            'OTA_AirBookRS': bookingToSave
        }
    };
    return responseBody;
}

/**
 * Manipula a requisição de pricing.
 * Retorna um mock com as taxas aplicáveis.
 * Baseado na seção 7.4.3 do PDF.
 */
function pricing(soapBody) {
    const pricingRequest = soapBody?.['ns2:pricingRequest'];
    const otaRequest = pricingRequest?.['ota:OTA_AirPriceRQ'];
    const employeeData = pricingRequest?.['myid:employeeData'];

    const echoToken = otaRequest?._attributes?.EchoToken || 'mock-token-price';
    const itinerary = otaRequest?.['ota:AirItinerary'];
    
    // --- CORREÇÃO APLICADA AQUI ---
    // Garante que 'travelers' e 'segments' sejam sempre arrays.

    // 1. Normaliza os viajantes para um array
    const travelersNode = otaRequest?.['ota:TravelerInfoSummary']?.['ota:AirTravelerAvail'] || [];
    const travelersArray = Array.isArray(travelersNode) ? travelersNode : [travelersNode];
    const travelerRefNumbers = travelersArray.map(t => t?.['ota:AirTraveler']?.['ota:TravelerRefNumber']);

    // 2. Normaliza os segmentos para um array
    const segmentsNode = itinerary?.['ota:OriginDestinationOptions']?.['ota:OriginDestinationOption']?.['ota:FlightSegment'] || [];
    const segmentsArray = Array.isArray(segmentsNode) ? segmentsNode : [segmentsNode];
    // ---------------------------------

    const responseBody = {
        'pricingResponse': {
            _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
            'employeeData': employeeData,
            'OTA_AirPriceRS': {
                _attributes: {
                    EchoToken: echoToken,
                    Target: "Test",
                    TimeStamp: new Date().toISOString(),
                    Version: "1.1"
                },
                'PricedItineraries': {
                    'PricedItinerary': {
                        'AirItinerary': itinerary,
                        'AirItineraryPricingInfo': {
                            'PTC_FareBreakdowns': {
                                'PTC_FareBreakdown': {
                                    'PassengerFare': {
                                        'Taxes': {
                                            'Tax': [
                                                { _attributes: { Amount: "2000", CurrencyCode: "JPY", DecimalPlaces: "0", TaxCode: "SW" } },
                                                { _attributes: { Amount: "700", CurrencyCode: "JPY", DecimalPlaces: "0", TaxCode: "DE" } },
                                                { _attributes: { Amount: "4580", CurrencyCode: "JPY", DecimalPlaces: "0", TaxCode: "OY" } }
                                            ]
                                        }
                                    },
                                    'TravelerRefNumber': travelerRefNumbers,
                                    'TicketDesignators': {
                                        // Usa o array normalizado para garantir que .map() funcione
                                        'TicketDesignator': segmentsArray.map(s => ({ _attributes: { FlightRefRPH: s._attributes.RPH } }))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    return responseBody;
}

// /**
//  * Manipula a requisição de retrieveBooking.
//  * Retorna um mock de uma reserva completa e já emitida.
//  * Baseado na seção 9.4.2 do PDF.
//  */
// function retrieveBooking(soapBody) {
//     const retrieveRequest = soapBody?.['ns2:retrieveBookingRequest'];
//     const otaRequest = retrieveRequest?.['ota:OTA_ReadRQ'];
//     const employeeData = retrieveRequest?.['myid:employeeData'];

//     // Extrai dados da requisição para ecoar na resposta
//     const echoToken = otaRequest?._attributes?.EchoToken || 'mock-token-retrieve';
//     const uniqueId = otaRequest?.['ota:ReadRequests']?.['ota:ReadRequest']?.['ota:UniqueID']; // Este é o PNR
//     const surname = otaRequest?.['ota:ReadRequests']?.['ota:ReadRequest']?.['ota:Verification']?.['ota:PersonName']?.['ota:Surname']?._text || 'Doe';

//     // Monta uma resposta mockada completa
//     const responseBody = {
//         'retrieveBookingResponse': {
//             _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
//             'employeeData': employeeData,
//             'bookingContactDetails': {
//                  _attributes: { xmlns: 'http://bos.service.resadapter.myidtravel.lhsystems.com' },
//                  'emailAddress': 'mock.traveler@example.com',
//                  'officeNumber': '123456789'
//             },
//             'OTA_AirBookRS': {
//                 _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: 'Test', Version: '1.1' },
//                 'AirReservation': {
//                     'AirItinerary': {
//                         'OriginDestinationOptions': {
//                             'OriginDestinationOption': {
//                                 'FlightSegment': [
//                                     { _attributes: { ArrivalDateTime: "2025-12-20T05:25:00", DepartureDateTime: "2025-12-20T01:10:00", RPH: "1", ResBookDesigCode: "N", Status: "10" }, 'DepartureAirport': { _attributes: { LocationCode: 'VVI' } }, 'ArrivalAirport': { _attributes: { LocationCode: 'CBB' } }, 'OperatingAirline': { _attributes: { Code: '8J', FlightNumber: '203' } } },
//                                     { _attributes: { ArrivalDateTime: "2025-12-23T06:50:00", DepartureDateTime: "2025-12-22T11:25:00", RPH: "2", ResBookDesigCode: "N", Status: "10" }, 'DepartureAirport': { _attributes: { LocationCode: 'CBB' } }, 'ArrivalAirport': { _attributes: { LocationCode: 'VVI' } }, 'OperatingAirline': { _attributes: { Code: '8J', FlightNumber: '204' } } }
//                                 ]
//                             }
//                         }
//                     },
//                     // Simula informações de preço já salvas na reserva
//                     'PriceInfo': { /* ... adicione um mock de PriceInfo se necessário ... */ },
//                     'TravelerInfo': {
//                         'AirTraveler': {
//                             _attributes: { Gender: 'Male', PassengerTypeCode: 'ADT' },
//                             'PersonName': { 'GivenName': 'Jon', 'Surname': surname, 'NameTitle': 'MR' },
//                             'TravelerRefNumber': { _attributes: { RPH: "1" } }
//                         }
//                     },
//                     // Simula um bilhete já emitido para esta reserva
//                     'Ticketing': {
//                         _attributes: { TicketType: 'eTicket', TicketingStatus: '3', TravelerRefNumber: '1' }, // Status 3 = Ticketed
//                         'TicketAdvisory': '8742159875412' // Número do bilhete mockado
//                     },
//                     // Ecoa o PNR que foi solicitado
//                     'BookingReferenceID': uniqueId
//                 }
//             }
//         }
//     };
//     return responseBody;
// }


/**
 * --- ATUALIZADO ---
 * Manipula a requisição de retrieveBooking. Agora lê a reserva do DB.
 */
function retrieveBooking(soapBody) {
    const retrieveRequest = soapBody?.['ns2:retrieveBookingRequest'];
    const otaRequest = retrieveRequest?.['ota:OTA_ReadRQ'];
    
    const pnrId = otaRequest?.['ota:ReadRequests']?.['ota:ReadRequest']?.['ota:UniqueID']?._attributes.ID;

    // 1. Busca a reserva no nosso "banco de dados" JSON
    const savedBooking = dbService.getBooking(pnrId);

    // 2. Verifica se a reserva foi encontrada
    if (!savedBooking) {
        console.warn(`Tentativa de consulta ao PNR ${pnrId}, mas ele não foi encontrado no DB.`);
        // Retorna um erro padrão do myIDTravel (seção 17 do manual)
        return {
            'OTA_AirBookRS': {
                'Errors': {
                    'Error': { _attributes: { Code: "96501", ShortText: "PNR not found", Type: "ERR" } }
                }
            }
        };
    }

    console.log(`Reserva com PNR ${pnrId} encontrada e retornada.`);
    
    // 3. Monta a resposta com os dados que foram salvos
    const responseBody = {
        'retrieveBookingResponse': {
            _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
            'employeeData': retrieveRequest?.['myid:employeeData'],
            'OTA_AirBookRS': savedBooking
        }
    };
    return responseBody;
}

/**
 * Manipula a requisição de retrieveTicket.
 * Retorna um mock de uma reserva completa com base em um número de bilhete.
 * Baseado na seção 11 do PDF.
 */
function retrieveTicket(soapBody) {
    const retrieveRequest = soapBody?.['ns2:retrieveTicketRequest'];
    const otaRequest = retrieveRequest?.['ota:OTA_ReadRQ'];
    const employeeData = retrieveRequest?.['myid:employeeData'];
    
    // Extrai dados da requisição para ecoar na resposta
    const echoToken = otaRequest?._attributes?.EchoToken || 'mock-token-ticket';
    const airReadRequest = otaRequest?.['ota:ReadRequests']?.['ota:AirReadRequest'];
    const ticketNumber = airReadRequest?.['ota:TicketNumber']?._attributes?.eTicketNumber || '0000000000000';
    const surname = airReadRequest?.['ota:Name']?.['ota:Surname']?._text || 'Doe';
    
    const responseBody = {
        'retrieveTicketResponse': {
            _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
            'employeeData': employeeData,
            // Elementos específicos da resposta de retrieveTicket 
            'tourCodeBox': {
                _attributes: {
                    xmlns: 'http://bos.service.resadapter.myidtravel.lhsystems.com',
                    tourCode: `${generatePnr}/IDTRAVEL/CODE`
                }
            },
            'dateOfIssue': {
                _attributes: {
                    xmlns: 'http://bos.service.resadapter.myidtravel.lhsystems.com'
                },
                // A data de hoje como data de emissão mockada
                _text: new Date().toISOString().split('T')[0]
            },
            'OTA_AirBookRS': {
                _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: 'Test', Version: '1.1' },
                'AirReservation': {
                    'AirItinerary': {
                        'OriginDestinationOptions': {
                            'OriginDestinationOption': {
                                // Usa o status '101' (open) conforme especificado no manual 
                                'FlightSegment': { _attributes: { DepartureDateTime: "2025-12-25T10:00:00", RPH: "1", ResBookDesigCode: "Y", Status: "101" }, 'DepartureAirport': { _attributes: { LocationCode: 'VVI' } }, 'ArrivalAirport': { _attributes: { LocationCode: 'SCL' } }, 'OperatingAirline': { _attributes: { Code: '8J', FlightNumber: '300' } } }
                            }
                        }
                    },
                    'PriceInfo': {
                        'PTC_FareBreakdowns': {
                            'PTC_FareBreakdown': {
                                // Inclui o TicketDesignators conforme especificado no manual [cite: 3215]
                                'TicketDesignators': {
                                    'TicketDesignator': { _attributes: { FlightRefRPH: "1" } }
                                }
                            }
                        }
                    },
                    'TravelerInfo': {
                        'AirTraveler': {
                            _attributes: { Gender: 'Male', PassengerTypeCode: 'ADT' },
                            'PersonName': { 'GivenName': 'Jon', 'Surname': surname },
                            'TravelerRefNumber': { _attributes: { RPH: "1" } }
                        }
                    },
                    'Ticketing': {
                        _attributes: { TicketType: 'eTicket', TicketingStatus: '3', TravelerRefNumber: '1' },
                        // Ecoa o número do bilhete da requisição
                        'TicketAdvisory': ticketNumber
                    },
                    // Um PNR mockado associado ao bilhete
                    'BookingReferenceID': { _attributes: { ID: generatePnr(), Type: "14" } }
                }
            }
        }
    };
    return responseBody;
}

// /**
//  * Manipula a requisição de emissão de bilhete (Ticketing).
//  * Gera uma resposta com números de bilhete mockados para cada passageiro.
//  * Baseado na seção 10 do PDF.
//  */
// function createTicket(soapBody) {
//     const createRequest = soapBody?.['ns2:createTicketRequest'];
//     const otaRequest = createRequest?.['ota:OTA_AirDemandTicketRQ'];
//     const employeeData = createRequest?.['myid:employeeData'];

//     // Extrai dados da requisição para ecoar na resposta
//     const echoToken = otaRequest?._attributes?.EchoToken || 'mock-ticket-token';
//     const pnrId = otaRequest?.['ota:DemandTicketDetail']?.['ota:BookingReferenceID']?._attributes.ID;

//     // Pega a lista de viajantes para gerar um bilhete para cada um
//     const travelersNode = otaRequest?.['ota:DemandTicketDetail']?.['ota:TPA_Extensions']?.['ota:TravelerInfo']?.['ota:AirTraveler'] || [];
//     const travelersArray = Array.isArray(travelersNode) ? travelersNode : [travelersNode];

//     // Gera um item de bilhete para cada passageiro na requisição
//     const ticketItems = travelersArray.map(traveler => {
//         const travelerRph = traveler['ota:TravelerRefNumber']?._attributes.RPH;
        
//         // Gera um número de bilhete mockado aleatório
//         const mockTicketNumber = `874${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        
//         return {
//             _attributes: {
//                 ItemNumber: travelerRph,
//                 TicketNumber: mockTicketNumber,
//                 TicketingStatus: "3", // 3 = Ticketed
//                 Type: "eTicket"
//             }
//         };
//     });

//     // Monta a resposta final
//     const responseBody = {
//         'createTicketResponse': {
//             _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
//             'employeeData': employeeData,
//             'OTA_AirDemandTicketRS': {
//                 _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: 'Test', Version: '1.1' },
//                 'Success': {},
//                 'BookingReferenceID': { _attributes: { ID: pnrId, Type: 'PNR' } },
//                 'TicketItemInfo': ticketItems
//             }
//         }
//     };
//     return responseBody;
// }

/**
 * --- ATUALIZADO ---
 * Manipula a requisição de emissão de bilhete (Ticketing).
 * Agora, primeiro verifica se o PNR existe no banco de dados.
 * Baseado na seção 10 e 17 (erros) do PDF.
 */
function createTicket(soapBody) {
    const createRequest = soapBody?.['ns2:createTicketRequest'];
    const otaRequest = createRequest?.['ota:OTA_AirDemandTicketRQ'];
    const employeeData = createRequest?.['myid:employeeData'];

    // 1. Extrai o PNR da requisição
    const echoToken = otaRequest?._attributes?.EchoToken || 'mock-ticket-token';
    const pnrId = otaRequest?.['ota:DemandTicketDetail']?.['ota:BookingReferenceID']?._attributes.ID;

    // 2. Consulta o banco de dados para ver se a reserva existe
    const bookingData = dbService.getBooking(pnrId);

    // 3. Se a reserva (PNR) NÃO for encontrada, retorna um erro
    if (!bookingData) {
        console.warn(`Tentativa de emitir bilhete para o PNR ${pnrId}, mas ele não foi encontrado.`);
        // Estrutura de erro baseada na seção 17 do manual
        const errorResponseBody = {
            'createTicketResponse': {
                'OTA_AirDemandTicketRS': {
                    _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString() },
                    'Errors': {
                        'Error': { 
                            _attributes: { 
                                Type: "ERR",
                                Code: "96501", // Código para "PNR not found"
                                ShortText: "PNR not found. Cannot issue ticket." 
                            } 
                        }
                    }
                }
            }
        };
        return errorResponseBody;
    }
    
    // 4. Se a reserva FOI encontrada, prossegue com a emissão do bilhete
    console.log(`PNR ${pnrId} encontrado. Emitindo bilhetes...`);
    
    const travelersNode = otaRequest?.['ota:DemandTicketDetail']?.['ota:TPA_Extensions']?.['ota:TravelerInfo']?.['ota:AirTraveler'] || [];
    const travelersArray = Array.isArray(travelersNode) ? travelersNode : [travelersNode];

    const ticketItems = travelersArray.map(traveler => {
        const travelerRph = traveler['ota:TravelerRefNumber']?._attributes.RPH;
        const mockTicketNumber = `874${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        return { _attributes: { ItemNumber: travelerRph, TicketNumber: mockTicketNumber, TicketingStatus: "3", Type: "eTicket" } };
    });

    // (Bônus) Atualiza o registro no DB com as informações do bilhete
    if (bookingData.AirReservation) {
        bookingData.AirReservation.Ticketing = ticketItems;
        dbService.saveBooking(pnrId, bookingData);
        console.log(`PNR ${pnrId} atualizado no DB com informações de bilhete.`);
    }

    // 5. Monta a resposta de sucesso
    const successResponseBody = {
        'createTicketResponse': {
            _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
            'employeeData': employeeData,
            'OTA_AirDemandTicketRS': {
                _attributes: { EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: 'Test', Version: '1.1' },
                'Success': {},
                'BookingReferenceID': { _attributes: { ID: pnrId, Type: 'PNR' } },
                'TicketItemInfo': ticketItems
            }
        }
    };
    return successResponseBody;
}

// /**
//  * Manipula a requisição para cancelar um segment sell.
//  * Retorna uma confirmação simples de sucesso.
//  * Baseado na seção 6 do PDF.
//  */
// function cancelSegmentSell(soapBody) {
//     const cancelRequest = soapBody?.['ns2:cancelSegmentSellRequest'] || soapBody;
//     const otaRequest = cancelRequest?.['ota:OTA_CancelRQ'];

//     const echoToken = otaRequest?._attributes?.EchoToken || 'mock-cancel-token';
//     const segmentSellId = otaRequest?.['ota:UniqueID']?._attributes.ID;

//     console.log(`Recebida solicitação para cancelar o Segment Sell ID: ${segmentSellId}`);

//     // A resposta de sucesso é muito simples, conforme o manual (seção 6.3.2)
//     const responseBody = {
//         'cancelSegmentSellResponse': { // Wrapper para consistência
//             'OTA_CancelRS': {
//                 _attributes: {
//                     EchoToken: echoToken,
//                     TimeStamp: new Date().toISOString(),
//                     Target: "Test",
//                     Version: "1.1",
//                     Status: "Cancelled" // Atributo obrigatório na resposta de sucesso
//                 },
//                 'Success': {} // Tag vazia para indicar sucesso
//             }
//         }
//     };
//     return responseBody;
// }


/**
 * --- ATUALIZADO ---
 * Manipula a requisição para cancelar um segment sell.
 * Agora remove o registro do DB.
 * Baseado na seção 6 do PDF.
 */
function cancelSegmentSell(soapBody) {
    const cancelRequest = soapBody?.['ns2:cancelSegmentSellRequest'] || soapBody;
    const otaRequest = cancelRequest?.['ota:OTA_CancelRQ'];

    const echoToken = otaRequest?._attributes?.EchoToken || 'mock-cancel-token';
    const segmentSellId = otaRequest?.['ota:UniqueID']?._attributes.ID;

    // 1. Deleta a pré-reserva do nosso "banco de dados"
    const deleted = dbService.deleteBooking(segmentSellId);

    if (deleted) {
        console.log(`Segment Sell com ID ${segmentSellId} foi removido do mockDatabase.json`);
    } else {
        console.warn(`Tentativa de cancelar Segment Sell ID ${segmentSellId}, mas ele não foi encontrado no DB.`);
    }

    // 2. Monta a resposta de sucesso
    const responseBody = {
        'cancelSegmentSellResponse': {
            'OTA_CancelRS': {
                _attributes: {
                    EchoToken: echoToken, TimeStamp: new Date().toISOString(), Target: "Test", Version: "1.1", Status: "Cancelled"
                },
                'Success': {}
            }
        }
    };
    return responseBody;
}


// /**
//  * Manipula a requisição para cancelar uma reserva (booking/PNR).
//  * Retorna uma confirmação de cancelamento bem-sucedido.
//  * Baseado na seção 15 do PDF.
//  */
// function cancelBooking(soapBody) {
//     const cancelRequest = soapBody?.['ns2:cancelBookingRequest'] || soapBody;
//     const otaRequest = cancelRequest?.['ota:OTA_CancelRQ'];
//     const employeeData = cancelRequest?.['myid:employeeData'];

//     // Extrai dados para a resposta e para log
//     const echoToken = otaRequest?._attributes?.EchoToken || 'mock-cancel-book-token';
//     const pnrId = otaRequest?.['ota:UniqueID']?._attributes.ID;

//     console.log(`Recebida solicitação para cancelar a Reserva (PNR) ID: ${pnrId}`);

//     // Monta a resposta de sucesso conforme o manual (seção 15.3.2)
//     const responseBody = {
//         'cancelBookingResponse': { // Wrapper para consistência
//             'OTA_CancelRS': {
//                 _attributes: {
//                     EchoToken: echoToken,
//                     TimeStamp: new Date().toISOString(),
//                     Target: "Test",
//                     Version: "1.1",
//                     Status: "Cancelled" // Atributo obrigatório
//                 },
//                 'Success': {},
//                 // A resposta deve ecoar o ID do PNR que foi cancelado
//                 'UniqueID': {
//                     _attributes: {
//                         Type: "14", // "14" para PNR
//                         ID: pnrId
//                     }
//                 }
//             }
//         }
//     };
//     return responseBody;
// }

/**
 * --- ATUALIZADO ---
 * Manipula a requisição para cancelar uma reserva. Agora remove do DB.
 */
function cancelBooking(soapBody) {
    const otaRequest = soapBody?.['ns2:cancelBookingRequest']?.['ota:OTA_CancelRQ'];
    const pnrId = otaRequest?.['ota:UniqueID']?._attributes.ID;

    // 1. Deleta a reserva do nosso "banco de dados"
    const deleted = dbService.deleteBooking(pnrId);
    
    if (deleted) {
        console.log(`Reserva com PNR ${pnrId} foi removida do mockDatabase.json`);
    } else {
        console.warn(`Tentativa de cancelar PNR ${pnrId}, mas ele não foi encontrado no DB.`);
    }

    // 2. Monta a resposta de sucesso (mesmo que o PNR não existisse, o estado final é "não existe mais")
    const responseBody = {
        'cancelBookingResponse': {
            'OTA_CancelRS': {
                _attributes: { Status: "Cancelled", EchoToken: otaRequest._attributes.EchoToken, TimeStamp: new Date().toISOString() },
                'Success': {},
                'UniqueID': { _attributes: { Type: "14", ID: pnrId } }
            }
        }
    };
    return responseBody;
}

/**
 * Inicia o processo de reembolso.
 * Calcula valores mockados e salva um estado temporário no DB.
 * Baseado na seção 14.4.3 do PDF (auto-pricing).
 */
function initRefund(soapBody) {
    const initRequest = soapBody['ns2:initRefundTicketRequest'] || soapBody['initRefundTicketRequest'];
    const refundDetails = initRequest['myid:MyIdTravelInitRefundTicketRQ']['myid:InitRefundTicketRQ'];
    
    const refundProcessID = refundDetails._attributes.RefundProcessID;
    const ticketNumber = refundDetails['myid:TicketNumber']._attributes.eTicketNumber;
    const surname = refundDetails['myid:Name']['myid:Surname']._text;

    console.log(`Iniciando processo de reembolso ID: ${refundProcessID} para o bilhete ${ticketNumber}`);

    // Mock: Vamos fingir que este bilhete custou 500, 100 foram usados e 400 serão reembolsados.
    const issuedPrice = { 'ota:TotalFare': { _attributes: { Amount: "500.00", CurrencyCode: "BOB" } } };
    const usedPrice = { 'ota:TotalFare': { _attributes: { Amount: "100.00", CurrencyCode: "BOB" } } };
    const refundPrice = { 'ota:TotalFare': { _attributes: { Amount: "400.00", CurrencyCode: "BOB" } } };

    const refundState = {
        processId: refundProcessID,
        ticketNumber: ticketNumber,
        status: "initiated",
        issuedPrice,
        usedPrice,
        refundPrice,
        // Adiciona um mock de reserva para retornar na resposta
        AirReservation: {
            'myid:PriceInfo': issuedPrice,
            'myid:UsedPriceInfo': usedPrice,
            'myid:RefundPriceInfo': refundPrice,
        }
    };

    // Salva o estado do reembolso no DB usando o ID do processo
    dbService.saveBooking(refundProcessID, refundState);

    const responseBody = {
        'ns4:initRefundTicketResponse': {
            _attributes: { 'xmlns:ns4': 'http://service.resadapter.myidtravel.lhsystems.com' },
            'myid:MyIdTravelInitRefundTicketRS': {
                _attributes: { EchoToken: initRequest['myid:MyIdTravelInitRefundTicketRQ']._attributes.EchoToken, TimeStamp: new Date().toISOString() },
                'myid:Success': {},
                'myid:InitRefundTicketRS': {
                    _attributes: { RefundProcessID: refundProcessID },
                    'myid:AirReservation': refundState.AirReservation
                }
            }
        }
    };
    return responseBody;
}

/**
 * Atualiza o processo de reembolso.
 * No nosso mock (auto-pricing), apenas confirmamos os dados.
 */
function updateRefund(soapBody) {
    const updateRequest = soapBody['ns2:updateRefundTicketRequest'] || soapBody['updateRefundTicketRequest'];
    const refundDetails = updateRequest['myid:MyIdTravelUpdateRefundTicketRQ']['myid:UpdateRefundTicketRQ'];
    const refundProcessID = refundDetails._attributes.RefundProcessID;
    
    console.log(`Recebido update para o processo de reembolso ID: ${refundProcessID}. Apenas confirmando.`);
    
    // Apenas ecoamos os dados recebidos para confirmar
    const responseBody = {
        'ns4:updateRefundTicketResponse': {
            _attributes: { 'xmlns:ns4': 'http://service.resadapter.myidtravel.lhsystems.com' },
            'myid:MyIdTravelUpdateRefundTicketRS': {
                _attributes: { EchoToken: updateRequest['myid:MyIdTravelUpdateRefundTicketRQ']._attributes.EchoToken, TimeStamp: new Date().toISOString() },
                'myid:Success': {},
                'myid:UpdateRefundTicketRS': {
                     _attributes: { RefundProcessID: refundProcessID },
                     'myid:PriceInfo': refundDetails['myid:PriceInfo'],
                     'myid:UsedPriceInfo': refundDetails['myid:UsedPriceInfo'],
                     'myid:RefundPriceInfo': refundDetails['myid:RefundPriceInfo']
                }
            }
        }
    };
    return responseBody;
}

/**
 * Confirma e finaliza o processo de reembolso.
 * Remove o estado temporário do DB.
 */
function confirmRefund(soapBody) {
    const confirmRequest = soapBody['ns2:confirmRefundTicketRequest'] || soapBody['confirmRefundTicketRequest'];
    const refundDetails = confirmRequest['myid:MyIdTravelConfirmRefundTicketRQ']['myid:ConfirmRefundTicketRQ'];
    const refundProcessID = refundDetails._attributes.RefundProcessID;
    
    const refundState = dbService.getBooking(refundProcessID);

    if (!refundState) {
        console.error(`ERRO: Tentativa de confirmar reembolso para ID ${refundProcessID}, mas o processo não foi encontrado.`);
        return { 'Error': `Refund process with ID ${refundProcessID} not found or already completed.` };
    }

    console.log(`Confirmando e finalizando o processo de reembolso ID: ${refundProcessID}`);
    
    // Remove o estado temporário do DB para finalizar o processo
    dbService.deleteBooking(refundProcessID);
    
    const responseBody = {
        'confirmRefundTicketResponse': {
             _attributes: { xmlns: 'http://service.resadapter.myidtravel.lhsystems.com' },
             'MyIdTravelConfirmRefundTicketRS': {
                _attributes: { EchoToken: confirmRequest['myid:MyIdTravelConfirmRefundTicketRQ']._attributes.EchoToken, TimeStamp: new Date().toISOString() },
                'Success': {},
                'ConfirmRefundTicketRS': {
                    _attributes: { RefundProcessID: refundProcessID },
                    'TicketNumber': { _attributes: { eTicketNumber: refundState.ticketNumber } }
                }
             }
        }
    };
    return responseBody;
}

module.exports = {
    cancelBooking,
    cancelSegmentSell,
    createTicket,
    ping,
    pricing,
    retrieveBooking,
    retrieveTicket,
    getAvailabilityDetails,
    getAvailability,
    doSegmentSell,
    booking,
    initRefund,
    updateRefund,
    confirmRefund
};