'use strict';

var EncodingUtil = {

    stringifyJSONIgnoringCircularRefs: function (o) {
      var cache = [];
      return JSON.stringify(o, function (key, value) {
        if (typeof value === 'object' && value !== null) {
          if (cache.indexOf(value) !== -1) {
            return;
          }
          cache.push(value);
        }
        return value;
      });
    },

    urlEncodeJSON: function (obj) {
      if (!obj)
        return "";
      var str = [];
      for (var p in obj)
        if (obj.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
      return str.join("&");
    },

    native2ascii: function (str) {
      unescape(escape(str + '').replace(/%(?=u[\da-z]{4})/gi, '\\'));
    },


    ascii2native: function (str) {
      return unescape(( str + '' ).replace(/\\(?=u[\da-z]{4})/gi, '%'));
    },

    encodeJSONToProperties: function (propertiesJSON) {
      var propertiesText = "";
      for (var key in propertiesJSON) {
        if (propertiesJSON.hasOwnProperty(key)) {
          var value = EncodingUtil.native2ascii(propertiesJSON[key]);
          propertiesText += key + "=" + value + "\n";
        }
      }
      return propertiesText;
    },

    parsePropertiesToJSON: function (propertiesText) {
      //console.log("Parsing properties to JSON:");
      //console.log(propertiesText);

      /*
       Based on: https://github.com/xavi-/node-properties-parser released under The MIT License.
       http://opensource.org/licenses/mit-license.php
       The MIT License (MIT)

       Permission is hereby granted, free of charge, to any person obtaining a copy of this software
       and associated documentation files (the "Software"), to deal in the Software without restriction,
       including without limitation the rights to use, copy, modify, merge, publish, distribute,
       sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
       furnished to do so, subject to the following conditions:

       The above copyright notice and this permission notice shall be included in all copies or substantial
       portions of the Software.

       THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
       NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
       IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
       WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
       OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
       */
      function Iterator(text) {
        var pos = 0, length = text.length;

        this.peek = function (num) {
          num = num || 0;
          if (pos + num >= length) {
            return null;
          }

          return text.charAt(pos + num);
        };
        this.next = function (inc) {
          inc = inc || 1;

          if (pos >= length) {
            return null;
          }

          return text.charAt((pos += inc) - inc);
        };
        this.pos = function () {
          return pos;
        };
      }

      var rWhitespace = /\s/;

      function isWhitespace(chr) {
        return rWhitespace.test(chr);
      }

      function consumeWhiteSpace(iter) {
        var start = iter.pos();

        while (isWhitespace(iter.peek())) {
          iter.next();
        }

        return {type: "whitespace", start: start, end: iter.pos()};
      }

      function startsComment(chr) {
        return chr === "!" || chr === "#";
      }

      function isEOL(chr) {
        return chr == null || chr === "\n" || chr === "\r";
      }

      function consumeComment(iter) {
        var start = iter.pos();

        while (!isEOL(iter.peek())) {
          iter.next();
        }

        return {type: "comment", start: start, end: iter.pos()};
      }

      function startsKeyVal(chr) {
        return !isWhitespace(chr) && !startsComment(chr);
      }

      function startsSeparator(chr) {
        return chr === "=" || chr === ":" || isWhitespace(chr);
      }

      function startsEscapedVal(chr) {
        return chr === "\\";
      }

      function consumeEscapedVal(iter) {
        var start = iter.pos();

        iter.next(); // move past "\"
        var curChar = iter.next();
        if (curChar === "u") { // encoded unicode char
          iter.next(4); // Read in the 4 hex values
        }

        return {type: "escaped-value", start: start, end: iter.pos()};
      }

      function consumeKey(iter) {
        var start = iter.pos(), children = [];

        var curChar;
        while ((curChar = iter.peek()) !== null) {
          if (startsSeparator(curChar)) {
            break;
          }
          if (startsEscapedVal(curChar)) {
            children.push(consumeEscapedVal(iter));
            continue;
          }

          iter.next();
        }

        return {type: "key", start: start, end: iter.pos(), children: children};
      }

      function consumeKeyValSeparator(iter) {
        var start = iter.pos();

        var seenHardSep = false, curChar;
        while ((curChar = iter.peek()) !== null) {
          if (isEOL(curChar)) {
            break;
          }

          if (isWhitespace(curChar)) {
            iter.next();
            continue;
          }

          if (seenHardSep) {
            break;
          }

          seenHardSep = (curChar === ":" || curChar === "=");
          if (seenHardSep) {
            iter.next();
            continue;
          }

          break; // curChar is a non-separtor char
        }

        return {type: "key-value-separator", start: start, end: iter.pos()};
      }

      function startsLineBreak(iter) {
        return iter.peek() === "\\" && isEOL(iter.peek(1));
      }

      function consumeLineBreak(iter) {
        var start = iter.pos();

        iter.next(); // consume \
        if (iter.peek() === "\r") {
          iter.next();
        }
        iter.next(); // consume \n

        var curChar;
        while ((curChar = iter.peek()) !== null) {
          if (isEOL(curChar)) {
            break;
          }
          if (!isWhitespace(curChar)) {
            break;
          }

          iter.next();
        }

        return {type: "line-break", start: start, end: iter.pos()};
      }

      function consumeVal(iter) {
        var start = iter.pos(), children = [];

        var curChar;
        while ((curChar = iter.peek()) !== null) {
          if (startsLineBreak(iter)) {
            children.push(consumeLineBreak(iter));
            continue;
          }
          if (startsEscapedVal(curChar)) {
            children.push(consumeEscapedVal(iter));
            continue;
          }
          if (isEOL(curChar)) {
            break;
          }

          iter.next();
        }

        return {type: "value", start: start, end: iter.pos(), children: children};
      }

      function consumeKeyVal(iter) {
        return {
          type: "key-value",
          start: iter.pos(),
          children: [
            consumeKey(iter),
            consumeKeyValSeparator(iter),
            consumeVal(iter)
          ],
          end: iter.pos()
        };
      }

      var renderChild = {
        "escaped-value": function (child, text) {
          var type = text.charAt(child.start + 1);

          if (type === "t") {
            return "\t";
          }
          if (type === "r") {
            return "\r";
          }
          if (type === "n") {
            return "\n";
          }
          if (type === "f") {
            return "\f";
          }
          if (type !== "u") {
            return type;
          }

          return String.fromCharCode(parseInt(text.substr(child.start + 2, 4), 16));
        },
        "line-break": function (child, text) {
          return "";
        }
      };

      function rangeToBuffer(range, text) {
        var start = range.start, buffer = [];

        for (var i = 0; i < range.children.length; i++) {
          var child = range.children[i];

          buffer.push(text.substring(start, child.start));
          buffer.push(renderChild[child.type](child, text));
          start = child.end;
        }
        buffer.push(text.substring(start, range.end));

        return buffer;
      }

      function rangesToObject(ranges, text) {
        var obj = Object.create(null); // Creates to a true hash map

        for (var i = 0; i < ranges.length; i++) {
          var range = ranges[i];

          if (range.type !== "key-value") {
            continue;
          }

          var key = rangeToBuffer(range.children[0], text).join("");
          var val = rangeToBuffer(range.children[2], text).join("");
          obj[key] = val;
        }

        return obj;
      }

      function stringToRanges(text) {
        var iter = new Iterator(text), ranges = [];

        var curChar;
        while ((curChar = iter.peek()) !== null) {
          if (isWhitespace(curChar)) {
            ranges.push(consumeWhiteSpace(iter));
            continue;
          }
          if (startsComment(curChar)) {
            ranges.push(consumeComment(iter));
            continue;
          }
          if (startsKeyVal(curChar)) {
            ranges.push(consumeKeyVal(iter));
            continue;
          }

          throw Error("Something crazy happened. text: '" + text + "'; curChar: '" + curChar + "'");
        }

        return ranges;
      }

      function isNewLineRange(range) {
        if (!range) {
          return false;
        }

        if (range.type === "whitespace") {
          return true;
        }

        if (range.type === "literal") {
          return isWhitespace(range.text) && range.text.indexOf("\n") > -1;
        }

        return false;
      }

      function escapeMaker(escapes) {
        return function escapeKey(key) {
          var zeros = ["", "0", "00", "000"];
          var buf = [];

          for (var i = 0; i < key.length; i++) {
            var chr = key.charAt(i);

            if (escapes[chr]) {
              buf.push(escapes[chr]);
              continue;
            }

            var code = chr.codePointAt(0);

            if (code <= 0x7F) {
              buf.push(chr);
              continue;
            }

            var hex = code.toString(16);

            buf.push("\\u");
            buf.push(zeros[4 - hex.length]);
            buf.push(hex);
          }

          return buf.join("");
        };
      }

      function parse(text) {
        text = text.toString();
        var ranges = stringToRanges(text);
        return rangesToObject(ranges, text);
      }

      return parse(propertiesText);

    }
  }
  ;


