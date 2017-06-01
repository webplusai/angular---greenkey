(function() {
	'use strict';

	// TODO check out and maybe refactor
	var runBlock = function($rootScope, AudioService, commonConstants, CallManager) {

		function extractDTMFSignalChar(dtmfSIPPacket) {
			if ($.isEmptyObject(dtmfSIPPacket))
				return null;
			var strBody = dtmfSIPPacket.body.trim();

			if ($.isEmptyObject(strBody))
				return null;

			/*
			 * Body can be either a cipher of the DTMF tone (with any number of
			 * spaces and line brakes around it) or a definitions like:
			 * 
			 * Signal=5
			 * 
			 * Duration=100
			 * 
			 */

			if (strBody.indexOf('=') > -1) {

				var lines = strBody.split('\n');

				for (var i = 0; i < lines.length; i++) {
					var line = lines[i].trim();

					if (line.indexOf('Signal') > -1) {
						var ar = line.split('=');
						if (ar.length > 1) {
							var signal = ar[1].trim();
							if (signal.length > 0)
								return signal[0];
						}
					}

				}
			} else {
				strBody = strBody.replace(/(?:\r\n|\r|\n)/g, '');
				return strBody.trim()[0];
			}
		}

		function playDTMF(dtmfSIPPacket) {
			var dtmfChar = extractDTMFSignalChar(dtmfSIPPacket);
			if ($.isEmptyObject(dtmfChar))
				return;

			var audio = AudioService.dtmf[dtmfChar];
			if (!$.isEmptyObject(audio))
				audio.play();
		}

		var inboundCallContactUids = new Set();
		var outboundCallContactUids = new Set();

		CallManager.addInboundCallListener(function(contact) {
			if (inboundCallContactUids.has(contact.uid))
				return;

			inboundCallContactUids.add(contact.uid);
			contact.on(commonConstants.GKT.CALL_EVENTS.call_status_change, function () {
				if (!$.isEmptyObject(contact.session))
					contact.session.on(commonConstants.GKT.SIP_EVENTS.dtmf, playDTMF);
			});
		});

		CallManager.addOutboundCallListener(function(contact) {
			if (outboundCallContactUids.has(contact.uid))
				return;

			outboundCallContactUids.add(contact.uid);
			contact.on(commonConstants.GKT.CALL_EVENTS.call_status_change, function (event) {
				if (!$.isEmptyObject(contact.session)) {
					console.log("Call status change, status: ", event);
					contact.session.on(commonConstants.GKT.SIP_EVENTS.dtmf, playDTMF);
				}
			});
		});
	};

	angular.module('gkt.voiceBox.dtmfpad').run(
			[ '$rootScope', 'AudioService', 'commonConstants', 'CallManager', runBlock ]);

})();
