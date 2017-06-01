(function () {
  'use strict';

  angular.module('gkt.voiceBox.services').factory('ContactsExport', ['$q', 'TVC', ContactsExportFactory]);

  function ContactsExportFactory($q, TVC) {
    var HEADER = ['Company', 'FirstName', 'LastName', 'DisplayName', 'PhoneNumber', 'Email', 'Favorite'];
    var CSV_PREFIX = 'data:text/csv;charset=utf-8,';

    function isFakeContact(contact) {
      return contact.uid === 'voicemail.uid' ||
        contact.uid.match(/\.fake\.uid$/) ||
        (!contact.phone_numbers || !contact.phone_numbers.international);
    }

    return {
      isFakeContact: isFakeContact,
      
      exportExternalContactsToCsv: function () {
        return $q(function (resolve) {
          TVC.getContacts(false).then(function (response) {
            if (!response.list)
              $q.reject('Unable to export external contacts');

            var csvContent = CSV_PREFIX + HEADER.join(',');
            var contactsQty = response.list.length;
            if (contactsQty > 0)
              csvContent += "\n";
            _.forEach(response.list, function (contact, index) {
              if(isFakeContact(contact))
                return;

              csvContent += [contact.company, contact.first_name, contact.last_name,
                contact.display_name, contact.phone_numbers.international, contact.email, contact.favorite].join(',');
              if (index < contactsQty)
                csvContent += "\n";
            });

            resolve(csvContent);
          });
        });
      }
    };
  }
})();
