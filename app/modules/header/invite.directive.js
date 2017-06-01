(function() {
  'use strict';

  var PROP_INVITE_COUNTERPARTY_DEFAULT_GREETING = "tvbweb.INVITE_COUNTERPARTY_DEFAULT_GREETING";

  angular.module('gkt.voiceBox.header')
    .directive('invite', function() {
      return {
        restrict: 'E',
        templateUrl: '/partials/connectionModals/invite.html',
        controller: inviteDirectiveController
      };
    });

  function inviteDirectiveController($scope, $document, $timeout, ngDialog, GKT, TVC) {

    var EMAIL_REG_EXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

    $scope.referralLink = null;

    $scope.resetErrors = function() {
      $scope.emailIsWrong = false;
      $scope.noEmails = false;
    };
    $scope.resetErrors();

    GKT.addConfiguredListener(function() {
      $scope.defaultGreeting = GKTConfig.getProperty(
        PROP_INVITE_COUNTERPARTY_DEFAULT_GREETING,
        "Hi, I’m using Green Key's voice software."
      );
      $scope.customGreeting = null;
    });

    TVC.getReferralLink().then(function(link) {
      $scope.referralLink = link;
    });

    $scope.copyToClipboard = function() {
      var input = $document.find('#referralLink').get(0);
      if (!input) return;

      input.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.warn('Error: was unable to execute copy command.');
      }
    };

    $scope.openInviteDialog = function() {
      $scope.inviteStatus = null;
      $scope.inviteResult = '';
      $scope.resetErrors();
      ngDialog.open({
        className: 'modal-window-wrapper',
        template: '/partials/connectionModals/inviteModal.html',
        closeByEscape: true,
        scope: $scope
      });
    };

    function getEmailsArray(emailsString) {
      if(!emailsString)
        return [];

      // split text by "\n" and then by ","
      var emails = _.flatten(_.map(emailsString.split("\n"), function(row){
        return row.split(",");
      }));

      // remove empty and duplicate values
      emails = _.uniq(_.remove(_.map(emails, _.trim), function(email) {
        // remove return removed items, so the condition is > 0
        return email.length > 0;
      }));

      return emails;
    }

    function showInviteResult(status, message) {
      $scope.inviteStatus = status;
      $scope.inviteResult = message;
      // automatically close dialog in 3 seconds
      $timeout(ngDialog.close, 3000);
    }

    $scope.sendInvite = function(emailsString, greeting) {
      var emails = getEmailsArray(emailsString);
      if (emails.length === 0) {
        $scope.noEmails = true;
        return;
      }

      var isAnyInvalid = _.any(emails, function(email) {
        return !EMAIL_REG_EXP.test(email);
      });
      if (isAnyInvalid) {
        $scope.emailIsWrong = true;
        return;
      }

      TVC.invitePersonsToGKTNetwork(emails, greeting)
        .then(function(result) {
          if (result && result.success) {
            showInviteResult('success', 'Invitation was successfully sent.');
          } else {
            console.log(result);
            showInviteResult('error', 'Unable to invite counterparties.');
          }
        })
        .catch(function(result) {
          console.log(result);
          showInviteResult('error', 'Error sending invitation.');
        });
    };

  }
})();
