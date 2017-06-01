(function() {
  'use strict';

  angular.module('gkt.voiceBox.services').service('BinaryDataHelpersService', ['$q', 'TVC', BinaryDataHelpersService]);

  function BinaryDataHelpersService($q, TVC) {

    var self = this;

    /**
     * Uploads a passed file to S3. Returns promise 
     * @param binaryData Blob selected file
     * @param timeout Number time in milliseconds before timeout
     * @returns {Promise}
     */
    this.uploadFileToS3 = function(binaryData, timeout) {
      timeout = timeout || 30000;

      return $q(function (resolve, reject) {
        TVC.uploadFileToS3(binaryData)
          .then(function (tvcResponse) {
            resolve(tvcResponse.url);
          })
          .catch(reject);
        // reject promise if there is no response from TVC in 30 seconds
        setTimeout(reject, timeout);
      });
    };

    /**
     * Converts passed base64-encoded string to Blob
     * @param dataUrl string
     * @returns {Blob}
     */
    this.convertDataUrlToBlob = function(dataUrl) {
      var dataArray = dataUrl.split(','),
        byteString = atob(dataArray.pop()),
        mimeTypeData = dataArray.pop().match(/data:([a-z/]+);/);

      // write the bytes of the string to a typed array
      var ia = new Uint8Array(byteString.length);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      return new Blob([ia], {type: _.isArray(mimeTypeData) ? mimeTypeData.pop() : 'application/octet-stream'});
    };

    /**
     * Receives string containing file's address or data url and returns Blob
     * @param source string
     * @returns {Promise}
     */
    this.getBinaryData = function(source) {
      return new Promise(function (resolve, reject) {
        if (source instanceof Blob) {
          return resolve(source);
        }

        var dataUrlCheckExpression = new RegExp('data:.+;base64');
        if (dataUrlCheckExpression.test(source)) {
          return resolve(self.convertDataUrlToBlob(source));
        }

        var downloadRequest = new XMLHttpRequest();
        downloadRequest.addEventListener('error', reject);
        downloadRequest.addEventListener('readystatechange', function () {
          if (downloadRequest.readyState === 4) {
            downloadRequest.status === 200 ? resolve(downloadRequest.response) : reject(downloadRequest.status);
          }
        });

        downloadRequest.responseType = 'blob';
        downloadRequest.open('GET', source);
        downloadRequest.send();
      });
    }

  }

})();
