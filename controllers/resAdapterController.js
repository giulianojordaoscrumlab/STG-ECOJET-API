const dbService = require('../services/dbService');
const { MOCK_FLIGHT_SCHEDULE } = require("../data/mockEcojetFlightSegments");
const { generatePnr, generateSegmentSellId, generateTicketNumber } = require("../utils/generalFunctions");

// controllers/resAdapterController.js

/**
 * Função Ping (sem alterações)
 */
function ping(soapBody) {
    const token = soapBody['m:pingRequest']?.['m0:token']?._text || 'token-not-found';
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
    const availabilityRequest = soapBody['ns2:availabilityRequest'];
    const otaRequest = availabilityRequest['ota:OTA_AirAvailRQ'];
    const employeeData = availabilityRequest['myid:employeeData'];

    if (!otaRequest || !employeeData) {
        console.error("ERRO: Estrutura inválida na requisição getAvailability.");
        return { 'Error': 'Invalid request structure' };
    }

    const echoToken = otaRequest._attributes?.EchoToken || 'mock-avail-token';
    const requestedODsNode = otaRequest['ota:OriginDestinationInformation'] || [];
    const requestedODsArray = Array.isArray(requestedODsNode) ? requestedODsNode : [requestedODsNode];

    const responseODs = requestedODsArray.map(od => {
        const origin = od['ota:OriginLocation']?._attributes.LocationCode;
        const destination = od['ota:DestinationLocation']?._attributes.LocationCode;
        const departureDateTime = od['ota:DepartureDateTime']?._text;
        const requestedDate = departureDateTime.split('T')[0];

        const foundFlights = MOCK_FLIGHT_SCHEDULE.filter(
            flight => flight.origin === origin && flight.destination === destination
        );

        // Gera uma lista de <ota:OriginDestinationOption>, um para cada voo mockado
        const flightOptions = foundFlights.flatMap(flight => {
            const departureTimes = ["10:30:00Z", "20:30:00Z"];
            
            return departureTimes.map(time => {
                const departureTime = new Date(`${requestedDate}T${time}`);
                const arrivalTime = new Date(departureTime.getTime() + flight.durationMinutes * 60000);
                
                return {
                    'ota:FlightSegment': {
                        _attributes: {
                            DepartureDateTime: departureTime.toISOString(),
                            ArrivalDateTime: arrivalTime.toISOString(),
                            FlightNumber: flight.flightNumber,
                            JourneyDuration: `PT${flight.durationMinutes}M`,
                            StopQuantity: "0",
                            Ticket: "eTicket",
                            RPH: `${flight.flightNumber}-${time.substring(0, 2)}` // Cria um RPH único
                        },
                        'ota:DepartureAirport': { _attributes: { LocationCode: flight.origin, CodeContext: "IATA" } },
                        'ota:ArrivalAirport': { _attributes: { LocationCode: flight.destination, CodeContext: "IATA" } },
                        // CORREÇÃO: OperatingAirline com todos os atributos necessários
                        'ota:OperatingAirline': { _attributes: { CompanyShortName: '8J', FlightNumber: flight.flightNumber } },
                        'ota:Equipment': { _attributes: { AirEquipType: flight.equipment } },
                        'ota:BookingClassAvail': [
                            { _attributes: { ResBookDesigCode: "K", ResBookDesigQuantity: "9" } },
                            { _attributes: { ResBookDesigCode: "H", ResBookDesigQuantity: "9" } },
                            { _attributes: { ResBookDesigCode: "S", ResBookDesigQuantity: "4" } },
                            { _attributes: { ResBookDesigCode: "O", ResBookDesigQuantity: "2" } },
                            { _attributes: { ResBookDesigCode: "B", ResBookDesigQuantity: "9" } },
                        ]
                    }
                };
            });
        });

        // Monta o bloco <ota:OriginDestinationInformation> com a hierarquia correta
        return {
            'ota:DepartureDateTime': { _text: departureDateTime },
            'ota:OriginLocation': { _attributes: { LocationCode: origin, CodeContext: "IATA" } },
            'ota:DestinationLocation': { _attributes: { LocationCode: destination, CodeContext: "IATA" } },
            // CORREÇÃO: A lista de opções de voo agora está corretamente aninhada
            'ota:OriginDestinationOptions': {
                'ota:OriginDestinationOption': flightOptions
            }
        };
    });

    const responseBody = {
        'ns2:availabilityResponse': {
            _attributes: { 
                'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com",
                'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com",
                'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" 
            },
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
                    { _attributes: { DepartureDateTime: `${departureDate}T09:00:00`, ArrivalDateTime: `${departureDate}T11:30:00`, FlightNumber: '8J-101', JourneyDuration: 'PT2H30M', StopQuantity: '0', Ticket: 'eTicket' }, 'ns1:DepartureAirport': { _attributes: { LocationCode: originLocation, CodeContext: 'IATA' } }, 'ns1:ArrivalAirport': { _attributes: { LocationCode: destinationLocation, CodeContext: 'IATA' } }, 'ns1:OperatingAirline': { _attributes: { CompanyShortName: '8J' } }, 'ns1:Equipment': { _attributes: { AirEquipType: '320' } }, 'ns1:BookingClassAvail': [ { _attributes: { ResBookDesigCode: 'G', ResBookDesigQuantity: '9' } }, { _attributes: { ResBookDesigCode: 'B', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'H', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'O', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'S', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'K', ResBookDesigQuantity: '9' }} ] },
                    { _attributes: { DepartureDateTime: `${departureDate}T15:00:00`, ArrivalDateTime: `${departureDate}T17:30:00`, FlightNumber: '8J-105', JourneyDuration: 'PT2H30M', StopQuantity: '0', Ticket: 'eTicket' }, 'ns1:DepartureAirport': { _attributes: { LocationCode: originLocation, CodeContext: 'IATA' } }, 'ns1:ArrivalAirport': { _attributes: { LocationCode: destinationLocation, CodeContext: 'IATA' } }, 'ns1:OperatingAirline': { _attributes: { CompanyShortName: '8J' } }, 'ns1:Equipment': { _attributes: { AirEquipType: '32N' } }, 'ns1:BookingClassAvail': [ { _attributes: { ResBookDesigCode: 'G', ResBookDesigQuantity: '9' } }, { _attributes: { ResBookDesigCode: 'B', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'H', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'O', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'S', ResBookDesigQuantity: '9' }}, { _attributes: { ResBookDesigCode: 'K', ResBookDesigQuantity: '9' }} ] }
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
 * Adiciona os prefixos 'ota:' que faltavam nos nós filhos de AirReservation.
 */
function doSegmentSell(soapBody) {
    // 1. CORREÇÃO: Extrai ambos os nós principais da requisição
    const segmentSellRequest = soapBody['ns2:segmentSellRequest'];
    const otaRequest = segmentSellRequest['ota:OTA_AirBookRQ'];
    const employeeData = segmentSellRequest['myid:employeeData']; // Agora capturamos o employeeData

    const echoToken = otaRequest._attributes.EchoToken;
    const newSegmentSellId = generatePnr();

    // Lógica para modificar o itinerário para a resposta (continua a mesma)
    const airItineraryForResponse = JSON.parse(JSON.stringify(otaRequest['ota:AirItinerary']));
    const segmentsNode = airItineraryForResponse['ota:OriginDestinationOptions']['ota:OriginDestinationOption']['ota:FlightSegment'] || [];
    const segmentsArray = Array.isArray(segmentsNode) ? segmentsNode : [segmentsNode];
    
    segmentsArray.forEach(segment => {
        segment._attributes.Status = "26"; // Holds Confirmed
        segment._attributes.Ticket = "eTicket";
        segment._attributes.NumberInParty = "1";
        if(segment['ota:OperatingAirline']?._attributes) {
            segment['ota:OperatingAirline']._attributes.CompanyShortName = segment['ota:OperatingAirline']._attributes.Code;
        }
    });

    const airReservationData = {
        'ota:AirItinerary': airItineraryForResponse,
        'ota:TravelerInfo': otaRequest['ota:TravelerInfo'],
        'ota:BookingReferenceID': {
            _attributes: { Type: "SS", ID: newSegmentSellId, ID_Context: "Segment Sell" }
        }
    };
    
    // Salva um registro consistente no DB
    dbService.saveBooking(newSegmentSellId, {
        employeeData: employeeData,
        otaAirBookRS: { AirReservation: airReservationData }
    });
    console.log(`Segment Sell com ID ${newSegmentSellId} foi salvo no mockDatabase.json`);

    // --- MONTAGEM DA RESPOSTA FINAL CORRIGIDA ---
    const responseBody = {
        // Usa o wrapper correto que validamos para outras respostas
        'ns2:segmentSellResponse': {
             _attributes: { 
                'xmlns:ns2': 'http://service.resadapter.myidtravel.lhsystems.com',
                'xmlns:myid': 'http://bos.service.resadapter.myidtravel.lhsystems.com',
                'xmlns:ota': 'http://www.opentravel.org/OTA/2003/05'
             },
             // 2. CORREÇÃO: Adiciona o bloco employeeData na resposta
             'myid:employeeData': employeeData,
             'ota:OTA_AirBookRS': {
                _attributes: { 
                    EchoToken: echoToken, 
                    TimeStamp: new Date().toISOString(),
                    Target: "Test",
                    Version: "1.1"
                },
                'ota:Success': {},
                'ota:Warnings': {},
                'ota:AirReservation': airReservationData
             }
        }
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
    const bookingRequest = soapBody['ns2:bookingRequest'];
    const otaRequest = bookingRequest['ota:OTA_AirBookRQ'];
    const employeeData = bookingRequest['myid:employeeData'];
    const contactDetails = bookingRequest['myid:bookingContactDetails'];

    const newPnrId = generatePnr();
    const travelersNode = otaRequest['ota:TravelerInfo']['ota:AirTraveler'] || [];
    const travelersArray = Array.isArray(travelersNode) ? travelersNode : [travelersNode];

    const ticketingBlocks = travelersArray.map(traveler => {
        const rph = traveler['ota:TravelerRefNumber']._attributes.RPH;
        const newTicketNumber = generateTicketNumber();
        return {
            _attributes: { TicketType: "eTicket", TicketingStatus: "3", TravelerRefNumber: rph },
            'ota:TicketAdvisory': { _text: newTicketNumber }
        };
    });

    // Objeto salvo no DB - precisa ser completo para o retrieveBooking funcionar
    const airReservationData = {
        'ota:AirItinerary': otaRequest['ota:AirItinerary'],
        'ota:PriceInfo': otaRequest['ota:PriceInfo'], // Incluindo para salvar
        'ota:TravelerInfo': otaRequest['ota:TravelerInfo'],
        'ota:Fulfillment': otaRequest['ota:Fulfillment'], // Incluindo para salvar
        'ota:Ticketing': ticketingBlocks,
        'ota:BookingReferenceID': { _attributes: { ID: newPnrId, Type: "14" } }
    };

    const bookingToSaveInDb = {
        employeeData,
        contactDetails,
        otaAirBookRS: {
            _attributes: { EchoToken: otaRequest._attributes.EchoToken, TimeStamp: new Date().toISOString(), Target: "Test", Version: "1.1" },
            AirReservation: airReservationData
        }
    };
    dbService.saveBooking(newPnrId, bookingToSaveInDb);

    // Objeto para a resposta imediata (simplificado, como no gabarito)
    const airReservationForResponse = {
        'ota:AirItinerary': otaRequest['ota:AirItinerary'],
        'ota:TravelerInfo': otaRequest['ota:TravelerInfo'],
        'ota:Ticketing': ticketingBlocks,
        'ota:BookingReferenceID': { _attributes: { ID: newPnrId, Type: "14" } }
    };
    
    const responseBody = {
        'ns2:bookingResponse': {
            _attributes: { 'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com", 'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com", 'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" },
            'myid:employeeData': employeeData,
            'myid:bookingContactDetails': contactDetails,
            'ota:OTA_AirBookRS': {
                _attributes: { EchoToken: otaRequest._attributes.EchoToken, TimeStamp: new Date().toISOString(), Target: "Test", Version: "1.1" },
                'ota:AirReservation': airReservationForResponse
            }
        }
    };
    return responseBody;
}
/**
 * --- ATUALIZADO ---
 * Manipula a requisição de pricing.
 * Adiciona os prefixos 'ota:' que faltavam em toda a estrutura da resposta.
 */
/*
function pricing(soapBody) {
    const pricingRequest = soapBody['ns2:pricingRequest'];
    const otaRequest = pricingRequest['ota:OTA_AirPriceRQ'];
    const employeeData = pricingRequest['myid:employeeData'];
    
    const echoToken = otaRequest?._attributes?.EchoToken;
    const itineraryFromRequest = otaRequest['ota:AirItinerary'];
    
    const zedFareBaseNode = pricingRequest['myid:ZEDFareBase'];
    const zedFareBaseArray = Array.isArray(zedFareBaseNode) ? zedFareBaseNode : [zedFareBaseNode];
    
    const travelersNode = otaRequest?.['ota:TravelerInfoSummary']?.['ota:AirTravelerAvail'] || [];
    const travelersArray = Array.isArray(travelersNode) ? travelersNode : [travelersNode];
    
    const segmentsNode = itineraryFromRequest?.['ota:OriginDestinationOptions']?.['ota:OriginDestinationOption']?.['ota:FlightSegment'] || [];
    const segmentsArray = Array.isArray(segmentsNode) ? segmentsNode : [segmentsNode];

    const totalPassengers = travelersArray.length;
    segmentsArray.forEach(segment => {
        segment._attributes.NumberInParty = totalPassengers.toString();
    });

    const groupedTravelers = travelersArray.reduce((acc, traveler) => {
        const pax = traveler['ota:AirTraveler'];
        const ptc = pax._attributes.PassengerTypeCode;
        if (!acc[ptc]) { acc[ptc] = []; }
        acc[ptc].push(pax);
        return acc;
    }, {});
    
    let overallTotalFare = 0, overallTotalBaseFare = 0, overallTotalTaxes = 0;

    const ptcBreakdowns = Object.keys(groupedTravelers).map(ptc => {
        const travelersInGroup = groupedTravelers[ptc];
        const quantity = travelersInGroup.length;
        const zedType = travelersInGroup[0]['ota:ProfileRef']['ota:UniqueID']._attributes.Type;

        const fareBasisCodesForGroup = travelersInGroup.map(pax => {
            const rph = pax['ota:TravelerRefNumber']._attributes.RPH;
            const matchingFareBase = zedFareBaseArray.find(fb => fb._attributes.passengerID === rph);
            return matchingFareBase?._attributes.fareBaseCode || 'YIDFLBK';
        });
        
        const travelerRefsForGroup = travelersInGroup.map(pax => ({ 
            _attributes: { RPH: pax['ota:TravelerRefNumber']._attributes.RPH }
        }));

        let baseFarePerTraveler = 0;
        let taxesPerTraveler = [];
        const adultBaseFare = 15.00;

        // --- LÓGICA DE PRECIFICAÇÃO COM A REGRA DA TAXA OB ---
        if ((ptc === 'ADT' && (zedType === 'ZEA' || zedType === 'ZED'))) {
            baseFarePerTraveler = adultBaseFare;
            taxesPerTraveler = [ { TaxCode: "AK", Amount: 6.00 }, { TaxCode: "C2", Amount: 1.25 }, { TaxCode: "OB", Amount: 1.95 } ];
        } else if (ptc === 'CHD' && zedType === 'ZEC') {
            baseFarePerTraveler = adultBaseFare * 0.75;
            taxesPerTraveler = [ { TaxCode: "AK", Amount: 6.00 }, { TaxCode: "OB", Amount: 1.95 } ];
        } else if (ptc === 'INF' && zedType === 'ZEI') {
            baseFarePerTraveler = 0.00;
            // CORREÇÃO: Bebês pagam apenas a taxa AK
            taxesPerTraveler = [ { TaxCode: "AK", Amount: 6.00 } ];
        }
        
        const totalTaxesPerTraveler = taxesPerTraveler.reduce((sum, tax) => sum + tax.Amount, 0);
        const totalFarePerTraveler = baseFarePerTraveler + totalTaxesPerTraveler;

        overallTotalBaseFare += baseFarePerTraveler * quantity;
        overallTotalTaxes += totalTaxesPerTraveler * quantity;
        overallTotalFare += totalFarePerTraveler * quantity;

        const firstSegment = segmentsArray[0];
        const fareCalcString = `${firstSegment['ota:DepartureAirport']._attributes.LocationCode} ${firstSegment['ota:OperatingAirline']._attributes.Code} ${firstSegment['ota:ArrivalAirport']._attributes.LocationCode} ${baseFarePerTraveler.toFixed(2)}USD END`;

        return {
            'ota:PassengerTypeQuantity': { _attributes: { Quantity: quantity.toString(), Code: ptc } },
            'ota:FareBasisCodes': { 'ota:FareBasisCode': fareBasisCodesForGroup },
            'ota:TravelerRefNumber': travelerRefsForGroup,
            'ota:PassengerFare': {
                _attributes: { NegotiatedFare: "false" },
                'ota:BaseFare': { _attributes: { Amount: baseFarePerTraveler.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                'ota:Taxes': {
                    _attributes: { Amount: totalTaxesPerTraveler.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" },
                    'ota:Tax': taxesPerTraveler.map(tax => ({_attributes: { TaxCode: tax.TaxCode, Amount: tax.Amount.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" }}))
                },
                'ota:TotalFare': { _attributes: { Amount: totalFarePerTraveler.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                'ota:UnstructuredFareCalc': { _text: fareCalcString }
            },
            'ota:TicketDesignators': { 'ota:TicketDesignator': segmentsArray.map(s => ({ _attributes: { FlightRefRPH: s._attributes.RPH } }))}
        };
    });

    const responseBody = {
        'ns2:pricingResponse': {
            _attributes: { 
                'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com", 
                'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com", 
                'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" 
            },
            'myid:employeeData': employeeData,
            'ota:OTA_AirPriceRS': {
                _attributes: { TimeStamp: new Date().toISOString(), EchoToken: echoToken, Target: "Test", Version: "1.1" },
                'ota:Success': {},
                'ota:PricedItineraries': {
                    'ota:PricedItinerary': {
                        _attributes: { SequenceNumber: "1" },
                        'ota:AirItinerary': itineraryFromRequest,
                        'ota:AirItineraryPricingInfo': {
                            'ota:ItinTotalFare': {
                                _attributes: { NegotiatedFare: "false" },
                                'ota:BaseFare': { _attributes: { Amount: overallTotalBaseFare.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                                'ota:Taxes': { _attributes: { Amount: overallTotalTaxes.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                                'ota:TotalFare': { _attributes: { Amount: overallTotalFare.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } }
                            },
                            'ota:PTC_FareBreakdowns': { 'ota:PTC_FareBreakdown': ptcBreakdowns }
                        }
                    }
                }
            }
        }
    };
    return responseBody;
}
*/


function pricing(soapBody) {
    const pricingRequest = soapBody['ns2:pricingRequest'];
    const otaRequest = pricingRequest['ota:OTA_AirPriceRQ'];
    const employeeData = pricingRequest['myid:employeeData'];
    
    const echoToken = otaRequest?._attributes?.EchoToken;
    const itineraryFromRequest = otaRequest['ota:AirItinerary'];
    
    const zedFareBaseNode = pricingRequest['myid:ZEDFareBase'];
    const zedFareBaseArray = Array.isArray(zedFareBaseNode) ? zedFareBaseNode : [zedFareBaseNode];
    
    const travelersNode = otaRequest?.['ota:TravelerInfoSummary']?.['ota:AirTravelerAvail'] || [];
    const travelersArray = Array.isArray(travelersNode) ? travelersNode : [travelersNode];
    
    const segmentsNode = itineraryFromRequest?.['ota:OriginDestinationOptions']?.['ota:OriginDestinationOption']?.['ota:FlightSegment'] || [];
    const segmentsArray = Array.isArray(segmentsNode) ? segmentsNode : [segmentsNode];

    const totalPassengers = travelersArray.length;
    segmentsArray.forEach(segment => {
        segment._attributes.NumberInParty = totalPassengers.toString();
    });

    // 1. Encontra o voo específico que está sendo precificado no nosso schedule
    const currentSegment = segmentsArray[0];
    const flightDetails = MOCK_FLIGHT_SCHEDULE.find(
        f => f.origin === currentSegment['ota:DepartureAirport']._attributes.LocationCode &&
             f.destination === currentSegment['ota:ArrivalAirport']._attributes.LocationCode &&
             f.flightNumber === currentSegment['ota:OperatingAirline']._attributes.FlightNumber
    );

    if (!flightDetails) {
        console.error("ERRO: Voo não encontrado na base de dados.");
        return { Error: "Flight route not found in database." };
    }

    // 2. Agrupa os passageiros por PassengerTypeCode (ADT, CHD, INF)
    const groupedTravelers = travelersArray.reduce((acc, traveler) => {
        const pax = traveler['ota:AirTraveler'];
        const ptc = pax._attributes.PassengerTypeCode;
        if (!acc[ptc]) { acc[ptc] = []; }
        acc[ptc].push(pax);
        return acc;
    }, {});
    
    let overallTotalFare = 0, overallTotalBaseFare = 0, overallTotalTaxes = 0;

    // 3. Itera sobre os GRUPOS para criar um breakdown para cada TIPO de passageiro
    const ptcBreakdowns = Object.keys(groupedTravelers).map(ptc => {
        const travelersInGroup = groupedTravelers[ptc];
        const quantity = travelersInGroup.length;

        const fareBasisCodesForGroup = travelersInGroup.map(pax => {
            const rph = pax['ota:TravelerRefNumber']._attributes.RPH;
            const matchingFareBase = zedFareBaseArray.find(fb => fb._attributes.passengerID === rph);
            return matchingFareBase?._attributes.fareBaseCode || 'YIDFLBK';
        });
        
        const travelerRefsForGroup = travelersInGroup.map(pax => ({ 
            _attributes: { RPH: pax['ota:TravelerRefNumber']._attributes.RPH }
        }));

        let baseFarePerTraveler = 0;
        const allFlightTaxes = Object.keys(flightDetails.taxes).map(code => ({ TaxCode: code, Amount: flightDetails.taxes[code] }));
        let taxesPerTraveler = [];
        const adultBaseFare = 15.00;

        // 4. Aplica as regras de negócio para cada grupo
        switch (ptc) {
            case 'ADT':
                baseFarePerTraveler = adultBaseFare;
                taxesPerTraveler = allFlightTaxes; // Adulto paga todas as taxas do voo
                break;
            case 'CHD':
                baseFarePerTraveler = adultBaseFare * 0.75; // Desconto de 25%
                // Criança é isenta de ZI e CL
                taxesPerTraveler = allFlightTaxes.filter(tax => tax.TaxCode !== 'ZI' && tax.TaxCode !== 'CL' && tax.TaxCode !== 'C2');
                break;
            case 'INF':
                baseFarePerTraveler = 0.00;
                // Bebê é isento de ZI, CL e OB
                taxesPerTraveler = allFlightTaxes.filter(tax => tax.TaxCode === 'OB' && tax.TaxCode !== 'ZI' && tax.TaxCode !== 'CL' && tax.TaxCode !== 'C2');
                break;
            default:
                baseFarePerTraveler = adultBaseFare;
                taxesPerTraveler = allFlightTaxes;
        }
        
        const totalTaxesPerTraveler = taxesPerTraveler.reduce((sum, tax) => sum + tax.Amount, 0);
        const totalFarePerTraveler = baseFarePerTraveler + totalTaxesPerTraveler;

        // 5. Calcula os totais para o GRUPO e os totais GERAIS
        overallTotalBaseFare += baseFarePerTraveler * quantity;
        overallTotalTaxes += totalTaxesPerTraveler * quantity;
        overallTotalFare += totalFarePerTraveler * quantity;

        const fareCalcString = `${flightDetails.origin} ${otaRequest['ota:POS']['ota:Source']._attributes.AirlineVendorID} ${flightDetails.destination} ${baseFarePerTraveler.toFixed(2)}USD END`;
        const totalGroupFare = totalFarePerTraveler * quantity;

        return {
            'ota:PassengerTypeQuantity': { _attributes: { Quantity: quantity.toString(), Code: ptc } },
            'ota:FareBasisCodes': { 'ota:FareBasisCode': fareBasisCodesForGroup },
            'ota:TravelerRefNumber': travelerRefsForGroup,
            'ota:PassengerFare': {
                _attributes: { NegotiatedFare: "false" },
                'ota:BaseFare': { _attributes: { Amount: baseFarePerTraveler.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                'ota:Taxes': {
                    _attributes: { Amount: totalTaxesPerTraveler.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" },
                    'ota:Tax': taxesPerTraveler.map(tax => ({_attributes: { TaxCode: tax.TaxCode, Amount: tax.Amount.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" }}))
                },
                'ota:TotalFare': { _attributes: { Amount: totalGroupFare.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                'ota:UnstructuredFareCalc': { _text: fareCalcString }
            },
            'ota:TicketDesignators': { 'ota:TicketDesignator': segmentsArray.map(s => ({ _attributes: { FlightRefRPH: s._attributes.RPH } }))}
        };
    });

    // 6. Monta o corpo da resposta final com os totais gerais corretos
    const responseBody = {
        'ns2:pricingResponse': {
            _attributes: { 
                'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com", 
                'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com", 
                'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" 
            },
            'myid:employeeData': employeeData,
            'ota:OTA_AirPriceRS': {
                _attributes: { TimeStamp: new Date().toISOString(), EchoToken: echoToken, Target: "Test", Version: "1.1" },
                'ota:Success': {},
                'ota:PricedItineraries': {
                    'ota:PricedItinerary': {
                        _attributes: { SequenceNumber: "1" },
                        'ota:AirItinerary': itineraryFromRequest,
                        'ota:AirItineraryPricingInfo': {
                            'ota:ItinTotalFare': {
                                _attributes: { NegotiatedFare: "false" },
                                'ota:BaseFare': { _attributes: { Amount: overallTotalBaseFare.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                                'ota:Taxes': { _attributes: { Amount: overallTotalTaxes.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
                                'ota:TotalFare': { _attributes: { Amount: overallTotalFare.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } }
                            },
                            'ota:PTC_FareBreakdowns': { 'ota:PTC_FareBreakdown': ptcBreakdowns }
                        }
                    }
                }
            }
        }
    };

    return responseBody;
}


// function pricing(soapBody) {
//     const pricingRequest = soapBody['ns2:pricingRequest'];
//     const otaRequest = pricingRequest['ota:OTA_AirPriceRQ'];
//     const employeeData = pricingRequest['myid:employeeData'];
    
//     // Extração de dados dinâmicos da requisição
//     const echoToken = otaRequest?._attributes?.EchoToken;
//     const itineraryFromRequest = otaRequest['ota:AirItinerary'];
//     const requestedFareBasis = pricingRequest['myid:ZEDFareBase']?._attributes?.fareBaseCode || 'YIDFLBK';

//     const travelersNode = otaRequest?.['ota:TravelerInfoSummary']?.['ota:AirTravelerAvail'] || [];
//     const travelersArray = Array.isArray(travelersNode) ? travelersNode : [travelersNode];
//     const segmentsNode = itineraryFromRequest?.['ota:OriginDestinationOptions']?.['ota:OriginDestinationOption']?.['ota:FlightSegment'] || [];
//     const segmentsArray = Array.isArray(segmentsNode) ? segmentsNode : [segmentsNode];

//     // Adiciona atributos necessários ao itinerário que será ecoado
//     segmentsArray.forEach(segment => {
//         segment._attributes.NumberInParty = "1";
//     });

//     const groupedTravelers = travelersArray.reduce((acc, traveler) => {
//         const pax = traveler['ota:AirTraveler'];
//         const ptc = pax._attributes.PassengerTypeCode;
//         if (!acc[ptc]) { acc[ptc] = []; }
//         acc[ptc].push(pax);
//         return acc;
//     }, {});
    
//     let overallTotalFare = 0, overallTotalBaseFare = 0, overallTotalTaxes = 0;

//     // --- LÓGICA DE PRECIFICAÇÃO DIFERENCIADA POR TIPO DE PASSAGEIRO ---
//     const ptcBreakdowns = Object.keys(groupedTravelers).map(ptc => {
//         const travelersInGroup = groupedTravelers[ptc];
//         const quantity = travelersInGroup.length;

//         let mockBaseFare = 0;
//         let mockTaxes = [];

//         // Aplica regras de negócio diferentes para cada tipo de passageiro
//         switch (ptc) {
//             case 'ADT': // Adulto
//                 mockBaseFare = 15.00; // REGRA 1: Tarifa base da Zona 1
//                 mockTaxes = [ // Adulto paga todas as taxas
//                     { TaxCode: "AK", Amount: 6.00 },
//                     { TaxCode: "C2", Amount: 1.25 },
//                     { TaxCode: "YN", Amount: 6.27 }
//                 ];
//                 break;
//             case 'CHD': // Criança
//                 mockBaseFare = 15.00; // Crianças geralmente pagam a mesma tarifa base ZED
//                 mockTaxes = [ // REGRA 2: Criança paga um conjunto reduzido de taxas
//                     { TaxCode: "AK", Amount: 6.00 }
//                 ];
//                 break;
//             case 'INF': // Bebê de colo
//                 mockBaseFare = 0.00; // Bebês de colo não pagam tarifa base
//                 mockTaxes = [ // REGRA 2: Bebê paga apenas taxas essenciais
//                     { TaxCode: "AK", Amount: 6.00 }
//                 ];
//                 break;
//         }

//         const totalTaxesForPTC = mockTaxes.reduce((sum, tax) => sum + tax.Amount, 0);
//         const totalFarePerTraveler = mockBaseFare + totalTaxesForPTC;

//         overallTotalBaseFare += mockBaseFare * quantity;
//         overallTotalTaxes += totalTaxesForPTC * quantity;
//         overallTotalFare += totalFarePerTraveler * quantity;

//         return {
//             'ota:PassengerTypeQuantity': { _attributes: { Quantity: quantity.toString(), Code: ptc } },
//             'ota:FareBasisCodes': { 'ota:FareBasisCode': requestedFareBasis },
//             'ota:TravelerRefNumber': travelersInGroup.map(pax => ({ _attributes: { RPH: pax['ota:TravelerRefNumber']._attributes.RPH }})),
//             'ota:PassengerFare': {
//                 _attributes: { NegotiatedFare: "false" },
//                 'ota:BaseFare': { _attributes: { Amount: mockBaseFare.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } },
//                 'ota:Taxes': {
//                     _attributes: { Amount: totalTaxesForPTC.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" },
//                     'ota:Tax': mockTaxes.map(tax => ({_attributes: { TaxCode: tax.TaxCode, Amount: tax.Amount.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" }}))
//                 },
//                 'ota:TotalFare': { _attributes: { Amount: totalFarePerTraveler.toFixed(2), CurrencyCode: "USD", DecimalPlaces: "2" } }
//             },
//             'ota:TicketDesignators': { 'ota:TicketDesignator': segmentsArray.map(s => ({ _attributes: { FlightRefRPH: s._attributes.RPH } }))}
//         };
//     });

//     // Monta o corpo da resposta final
//     const responseBody = {
//         'ns2:pricingResponse': {
//             _attributes: { 'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com", 'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com", 'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" },
//             'myid:employeeData': employeeData,
//             'ota:OTA_AirPriceRS': {
//                 _attributes: { TimeStamp: new Date().toISOString(), EchoToken: echoToken, Target: "Test", Version: "1.1" },
//                 'ota:Success': {},
//                 'ota:PricedItineraries': {
//                     'ota:PricedItinerary': {
//                         _attributes: { SequenceNumber: "1" },
//                         'ota:AirItinerary': itineraryFromRequest,
//                         'ota:AirItineraryPricingInfo': {
//                             'ota:ItinTotalFare': {
//                                 _attributes: { NegotiatedFare: "false" },
//                                 'ota:BaseFare': { _attributes: { Amount: "78.35", CurrencyCode: "USD", DecimalPlaces: "2" } },
//                                 'ota:Taxes': { 
//                                     _attributes: { Amount: "30.64", CurrencyCode: "USD", DecimalPlaces: "2" },
//                                     'ota:Tax': [ 
//                                         { _attributes: { TaxCode: "AY", Amount: "5.66", CurrencyCode: "USD", DecimalPlaces: "2" } },
//                                         { _attributes: { TaxCode: "OB", Amount: "1.95", CurrencyCode: "USD", DecimalPlaces: "2" } },
//                                         { _attributes: { TaxCode: "US", Amount: "23.03", CurrencyCode: "USD", DecimalPlaces: "2" } }
//                                     ] 
//                                 },                                
//                                 'ota:TotalFare': { _attributes: { Amount: "108.99", CurrencyCode: "USD", DecimalPlaces: "2" } }
//                             },
//                             'ota:PTC_FareBreakdowns': { 'ota:PTC_FareBreakdown': ptcBreakdowns }
//                         }
//                     }
//                 }
//             }
//         }
//     };
//     return responseBody;
// }

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
//                         'TicketAdvisory': '0532159875412' // Número do bilhete mockado
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
    // 1. Extração de dados da requisição
    const retrieveRequest = soapBody['ns2:retrieveBookingRequest'];
    const otaRequest = retrieveRequest['ota:OTA_ReadRQ'];
    const pnrId = otaRequest['ota:ReadRequests']['ota:ReadRequest']['ota:UniqueID']._attributes.ID;

    console.log(`Recebida consulta para o PNR: ${pnrId}`);

    // 2. Consulta ao banco de dados mock
    const savedData = dbService.getBooking(pnrId);

    // 3. Tratamento de erro, caso o PNR não seja encontrado no banco de dados
    if (!savedData) {
        console.warn(`PNR ${pnrId} não encontrado no banco de dados.`);
        // Retorna um erro padronizado conforme o manual (Seção 17, Código 96501)
        return {
            'ns2:retrieveBookingResponse': {
                 _attributes: { 'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com" },
                'ota:OTA_AirBookRS': {
                    _attributes: { EchoToken: otaRequest._attributes.EchoToken, TimeStamp: new Date().toISOString() },
                    'Errors': {
                        'Error': { 
                            _attributes: { 
                                Code: "96501", 
                                ShortText: "PNR not found", 
                                Type: "ERR" 
                            } 
                        }
                    }
                }
            }
        };
    }

    console.log(`Reserva com PNR ${pnrId} encontrada. Montando resposta...`);
    
    // 4. Montagem da resposta de sucesso com a estrutura correta
    const responseBody = {
        'ns2:retrieveBookingResponse': {
            _attributes: { 
                'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com",
                'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com",
                'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" 
            },
            'myid:employeeData': savedData?.employeeData || {},
            'myid:bookingContactDetails': savedData.contactDetails,
            'ota:OTA_AirBookRS': {
                // Ecoa os atributos da requisição ATUAL, não da que foi salva
                _attributes: {
                    EchoToken: otaRequest._attributes.EchoToken,
                    TimeStamp: new Date().toISOString(),
                    Target: "Test",
                    Version: "1.1"
                },
                'ota:Success': {}, // Tag de sucesso, conforme especificação da tabela ES-4
                'ota:AirReservation': savedData.otaAirBookRS.AirReservation
            }
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
    const otaRequest = retrieveRequest['ota:OTA_ReadRQ'];
    const employeeData = retrieveRequest['myid:employeeData'];
    const informedTicket = retrieveRequest["ota:OTA_ReadRQ"]["ota:ReadRequests"]["ota:AirReadRequest"]["ota:TicketNumber"]._attributes.eTicketNumber;
    console.log(`\n-----------------------------------------------\nInformedTicket: ${JSON.stringify(informedTicket)}\n\n\n`);
    // Para o mock, vamos assumir que o bilhete consultado pertence à última reserva criada.
    // Em um sistema real, faríamos uma busca pelo número do bilhete.
    //const db = dbService.readDb();
    // const allPnrs = Object.keys(db);
    // const lastPnr = allPnrs[allPnrs.length - 1];
    const savedData = dbService.getTicket(informedTicket);

    if (!savedData) {
        return { /* ... seu objeto de erro ... */ };
    }

    console.log(`Consulta de bilhete associada ao eTicket ${informedTicket}. Montando resposta...`);
    
    // Clona o itinerário para poder modificar o status sem alterar o original no DB
    const itineraryForResponse = JSON.parse(JSON.stringify(savedData.otaAirBookRS.AirReservation['ota:AirItinerary']));
    const segmentsNode = itineraryForResponse?.['ota:OriginDestinationOptions']?.['ota:OriginDestinationOption']?.['ota:FlightSegment'] || [];
    const segmentsArray = Array.isArray(segmentsNode) ? segmentsNode : [segmentsNode];
    segmentsArray.forEach(segment => {
        // CORREÇÃO 3: Define o status do cupom como "101" (Aberto/Não utilizado)
        segment._attributes.Status = "101";
    });

    const responseBody = {
        // CORREÇÃO 1: Adiciona o prefixo ns2: ao wrapper
        'ns2:retrieveTicketResponse': {
            _attributes: { 'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com", 'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com", 'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" },
            'myid:employeeData': savedData.employeeData,
            'myid:tourCodeBox': { _attributes: { tourCode: "MOCK/IDTRAVEL/CODE" } },
            'myid:dateOfIssue': { _text: new Date().toISOString().split('T')[0] },
            'ota:OTA_AirBookRS': {
                _attributes: {
                    EchoToken: otaRequest._attributes.EchoToken,
                    TimeStamp: new Date().toISOString(),
                    Target: "Test",
                    Version: "1.1"
                },
                'ota:Success': {},
                'ota:AirReservation': {
                    'ota:AirItinerary': itineraryForResponse,
                    // CORREÇÃO 2: Inclui o bloco de preço completo lido do DB
                    'ota:PriceInfo': savedData.otaAirBookRS.AirReservation['ota:PriceInfo'],
                    'ota:TravelerInfo': savedData.otaAirBookRS.AirReservation['ota:TravelerInfo'],
                    'ota:Ticketing': savedData.otaAirBookRS.AirReservation['ota:Ticketing'],
                    'ota:BookingReferenceID': savedData.otaAirBookRS.AirReservation['ota:BookingReferenceID']
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
//         const mockTicketNumber = `053${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        
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
        const mockTicketNumber = `053${Math.floor(1000000000 + Math.random() * 9000000000)}`;
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
    const cancelRequest = soapBody['ns2:cancelBookingRequest'];
    const otaRequest = cancelRequest['ota:OTA_CancelRQ'];
    const pnrId = otaRequest['ota:UniqueID']._attributes.ID;

    const deleted = dbService.deleteBooking(pnrId);
    
    if (deleted) {
        console.log(`Reserva com PNR ${pnrId} foi removida do mockDatabase.json`);
    } else {
        console.warn(`Tentativa de cancelar PNR ${pnrId}, mas ele não foi encontrado no DB.`);
    }

    // Monta a resposta final com a estrutura e atributos corretos
    const responseBody = {
        // 1. Adiciona o prefixo e os namespaces ao wrapper
        'ns2:cancelBookingResponse': {
            _attributes: {
                'xmlns:ns2': 'http://service.resadapter.myidtravel.lhsystems.com',
                'xmlns:ota': 'http://www.opentravel.org/OTA/2003/05'
            },
            // 2. Adiciona o prefixo 'ota:' ao elemento OTA_CancelRS
            'ota:OTA_CancelRS': {
                // 3. Adiciona os atributos obrigatórios Target e Version
                _attributes: {
                    Status: "Cancelled",
                    EchoToken: otaRequest._attributes.EchoToken,
                    TimeStamp: new Date().toISOString(),
                    Target: "Test",
                    Version: "1.1"
                },
                // 4. Adiciona os prefixos 'ota:' aos elementos filhos
                'ota:Success': {},
                'ota:UniqueID': {
                    _attributes: {
                        Type: "14",
                        ID: pnrId
                    }
                }
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

/**
 * Manipula a requisição para modificar uma reserva existente.
 * Lê a reserva do DB, aplica as alterações e salva o novo estado.
 * Baseado na seção 12 do manual.
 */
function modifyBooking(soapBody) {
    const modifyRequest = soapBody['ns2:modifyBookingRequest'];
    const otaRequest = modifyRequest['ota:OTA_AirBookModifyRQ'];
    const employeeData = modifyRequest['myid:employeeData'];
    // Captura os detalhes de contato da requisição para ecoar na resposta
    const contactDetails = modifyRequest['myid:bookingContactDetails'];

    const pnrId = otaRequest['ota:AirReservation']['ota:BookingReferenceID']._attributes.ID;
    const modificationDetails = otaRequest['ota:AirBookModifyRQ'];
    const modificationType = modificationDetails._attributes.ModificationType;

    console.log(`Recebida modificação (Tipo: ${modificationType}) para o PNR: ${pnrId}`);

    const existingBooking = dbService.getBooking(pnrId);

    if (!existingBooking) {
        console.warn(`Tentativa de modificar PNR ${pnrId}, mas ele não foi encontrado.`);
        return { /* ... seu objeto de erro PNR não encontrado ... */ };
    }

    // Aplica a lógica de modificação
    if (modificationType === '30') { // Rebook all
        console.log(`Aplicando rebook do itinerário para o PNR ${pnrId}`);
        // Substitui o itinerário antigo pelo novo que veio na requisição
        existingBooking.otaAirBookRS.AirReservation['ota:AirItinerary'] = modificationDetails['ota:AirItinerary'];
    }

    // Salva a reserva atualizada
    dbService.saveBooking(pnrId, existingBooking);
    console.log(`PNR ${pnrId} modificado e salvo com sucesso.`);

    // --- MONTAGEM DA RESPOSTA CORRIGIDA ---
    const responseBody = {
        'ns2:modifyBookingResponse': {
            _attributes: { 'xmlns:ns2': "http://service.resadapter.myidtravel.lhsystems.com", 'xmlns:myid': "http://bos.service.resadapter.myidtravel.lhsystems.com", 'xmlns:ota': "http://www.opentravel.org/OTA/2003/05" },
            'myid:employeeData': employeeData,
            // 1. ADIÇÃO DO bookingContactDetails
            'myid:bookingContactDetails': contactDetails, 
            'ota:OTA_AirBookRS': {
                _attributes: {
                    EchoToken: otaRequest._attributes.EchoToken,
                    TimeStamp: new Date().toISOString(),
                    Target: "Test",
                    Version: "1.1"
                },
                // 2. REMOÇÃO do <Success/> para alinhar com o fluxo de booking
                'ota:AirReservation': existingBooking.otaAirBookRS.AirReservation
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
    confirmRefund,
    modifyBooking,
};
