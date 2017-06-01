# Installation Instructions / README notes

## Prerequisites
  * Install NodeJS and npm
  * Install Gulp (npm install -g gulp-cli).
  * Install Bower (npm install -g bower)


## Install
  * Clone the repo
  * Go to the Project Root
  * Current active dev branch is `develop`, so use it
  * App requires filled env.js file with several parameters defining environment where the app works. The following commands prepare env.js for you:
  * * "gulp prepare-env --env=test --local --https" - Test TVC, local development, app at: https://localhost:3000 with self-signed certificates.
  * * "gulp prepare-env --env=prod --local --https" - Prod TVC, local development, app at: https://localhost:3000 with self-signed certificates.
  * * "gulp prepare-env --env=test --local" - Test TVC, local development, app at: http://localhost:3000.
  * * "gulp prepare-env --env=prod --local" - Prod TVC, local development, app at: http://localhost:3000.
  * * "gulp prepare-env --env=test" - Test TVC, certificate paths and options ready for deploying to our servers.
  * * "gulp prepare-env --env=prod" - Prod TVC, certificate paths and options ready for deploying to our servers.
  * Run `npm start` - it executes `npm install`, `bower install` and runs the app
  * The app will be accessible at either http://localhost:3000 or at https://localhost:3000 depending on "--https" option above.
  * If doing local development and running via "https" you need to install the self-signed certificate to your root CA storage.
  Otherwise some components will experience problems.
  For Windows: Open https://localhost:3000 in Internet Explorer, a warning message will be shown, agree opening,
  click on the error icon in the browser address field, open the certificate info window and click "Add Certificate".
  Select the root certificate authority storage.



# Running the Application

## Run
  * Manual Option: `gulp`.
  * Automatic Option: `npm start` (includes `npm install`, `bower install`).
  * Open `http://localhost:3000`.


## Login
There are several testing users, credentials can be found here: https://greenkeytech.atlassian.net/wiki/display/TVBWEB/TVB+WEB+Home


# Development
 * After getting the latest version of the code, be sure to run `npm install` and `bower install` (or `npm start`).
 * Follow this rules for commit messages: https://greenkeytech.atlassian.net/wiki/display/VOIPCLIENT/Commit+Message+Template
 * Code conventions: https://greenkeytech.atlassian.net/wiki/display/TVBLITE/TVBLite+Projects+Code+Conventions .
