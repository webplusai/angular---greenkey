/**
 * Converts passed base64-encoded string to Blob
 * @param dataUrl string
 * @returns {Blob}
 */
function convertDataUrlToBlob(dataUrl) {
  var dataArray = dataUrl.split(','),
    byteString = atob(dataArray.pop()),
    mimeTypeData = dataArray.pop().match(/data:([a-z/]+);/);

  // write the bytes of the string to a typed array
  var ia = new Uint8Array(byteString.length);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type: _.isArray(mimeTypeData) ? mimeTypeData.pop() : 'application/octet-stream'});
}

/**
 * Receives string containing file's address or data url and returns Blob
 * @param source string
 * @returns {Promise}
 */
function getBinaryData(source) {
  return new Promise(function (resolve, reject) {
    if (source instanceof Blob) {
      return resolve(source);
    }

    var dataUrlCheckExpression = new RegExp('data:.+;base64');
    if (dataUrlCheckExpression.test(source)) {
      return resolve(convertDataUrlToBlob(source));
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

