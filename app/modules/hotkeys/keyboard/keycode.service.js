(function() {
  'use strict';

  // Map the keyCodes we use with the real chars they represent.
  //  Note: String.fromCharCode expects unicode charcodes as an argument,
  //   while  "e.keyCode" returns javascript keycodes.
  var keyMap = [];

  keyMap[48] = '0';
  keyMap[49] = '1';
  keyMap[50] = '2';
  keyMap[51] = '3';
  keyMap[52] = '4';
  keyMap[53] = '5';
  keyMap[54] = '6';
  keyMap[55] = '7';
  keyMap[56] = '8';
  keyMap[57] = '9';

  keyMap[65] = 'A';
  keyMap[66] = 'B';
  keyMap[67] = 'C';
  keyMap[68] = 'D';
  keyMap[69] = 'E';
  keyMap[70] = 'F';
  keyMap[71] = 'G';
  keyMap[72] = 'H';
  keyMap[73] = 'I';
  keyMap[74] = 'J';
  keyMap[75] = 'K';
  keyMap[76] = 'L';
  keyMap[77] = 'M';
  keyMap[78] = 'N';
  keyMap[79] = 'O';
  keyMap[80] = 'P';
  keyMap[81] = 'Q';
  keyMap[82] = 'R';
  keyMap[83] = 'S';
  keyMap[84] = 'T';
  keyMap[85] = 'U';
  keyMap[86] = 'V';
  keyMap[87] = 'W';
  keyMap[88] = 'X';
  keyMap[89] = 'Y';
  keyMap[90] = 'Z';

  // Numpad
  keyMap[96] = '0';
  keyMap[97] = '1';
  keyMap[98] = '2';
  keyMap[99] = '3';
  keyMap[100] = '4';
  keyMap[101] = '5';
  keyMap[102] = '6';
  keyMap[103] = '7';
  keyMap[104] = '8';
  keyMap[105] = '9';

  keyMap[112] = 'F1';
  keyMap[113] = 'F2';
  keyMap[114] = 'F3';
  keyMap[115] = 'F4';
  keyMap[116] = 'F5';
  keyMap[117] = 'F6';
  keyMap[118] = 'F7';
  keyMap[119] = 'F8';
  keyMap[120] = 'F9';
  keyMap[121] = 'F10';
  keyMap[122] = 'F11';
  keyMap[123] = 'F12';
  keyMap[124] = 'F13';
  keyMap[125] = 'F14';
  keyMap[126] = 'F15';
  keyMap[127] = 'F16';
  keyMap[128] = 'F17';
  keyMap[129] = 'F18';
  keyMap[130] = 'F19';
  keyMap[131] = 'F20';
  keyMap[132] = 'F21';
  keyMap[133] = 'F22';
  keyMap[134] = 'F23';
  keyMap[135] = 'F24';


  var msReservedComb = [
    'CTRL + X',
    'CTRL + C',
    'CTRL + V',
    'CTRL + A',
    'CTRL + Z'
  ];

  angular.module('gkt.voiceBox.hotkeys')
  .factory('KeycodeService', function KeycodeService() {
    return {
      getChar: function(keyCode) {
        var key = keyMap[keyCode];
        return key || null;
      },

      isMSCombination: function(keyComb) {
        return msReservedComb.indexOf(keyComb.toUpperCase()) >= 0;
      }
    };
  });

})();
