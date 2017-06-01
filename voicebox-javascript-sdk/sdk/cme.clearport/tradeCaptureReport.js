'use strict';

function TradeCaptureReport()
{
    this.jsonTemplate = function ()
    {
        return {
            'FIXML':
            {
                '@v': '5.0 SP2',
                '@s': '20090815',
                '@xv': '109',
                '@cv': 'CME.0001',
                'TrdCaptRpt':
                {
                    '@RptID': '0000345',
                    '@ExecID2': '12345620003924',
                    '@TransTyp': '0',
                    '@TrdTyp': '1',
                    '@TxnTm': '2016-04-08T15:48:00.000-04:00',
                    '@QtyTyp': '0',
                    '@LastPx': '45.21',
                    '@LastQty': '500000',
                    'Hdr':
                    {
                        '@SID': 'GKMC',
                        '@SSub': 'API_RBEDARKAR',
                        '@TID': 'CME',
                        '@TSub': 'CPAPI'
                    },
                    'Instrmt':
                    {
                        '@SecTyp': 'FUT',
                        '@Exch': 'NYMEX',
                        '@ID': 'CL',
                        '@Src': 'H',
                        '@MMY': '201712',
                        '@TmUnit': 'Mo'
                    },
                    'TrdRegTS':
                    {
                        '@TS': '2016-04-08T15:48:00.000-04:00',
                        '@Typ': '1'
                    },
                    'RptSide':
                    [{
                        '@InptSrc': 'GKMC',
                        '@Side': '1',
                        'Pty':
                        [{
                            '@ID': '666',
                            '@R': '1'
                        },
                        {
                            '@ID': 'JMCDEM01',
                            '@R': '24'
                        },
                        {
                            '@ID': 'green_key',
                            '@R': '30'
                        },
                        {
                            '@ID': 'jmcbtest1',
                            '@R': '36'
                        },
                        {
                            '@ID': 'arivera1',
                            '@R': '62'
                        }]
                    },
                    {
                        '@InptSrc': 'GKMC',
                        '@Side': '2',
                        'Pty':
                        [{
                            '@ID': '072',
                            '@R': '1'
                        },
                        {
                            '@ID': '072ACETEST',
                            '@R': '24'
                        },
                        {
                            '@ID': 'green_key',
                            '@R': '30'
                        },
                        {
                            '@ID': 'jmcace1',
                            '@R': '36'
                        },
                        {
                            '@ID': 'arivera1',
                            '@R': '62'
                        }]
                    }]
                }
            }
        };
    }; // jsonTemplate
} // TradeCaptureReport

