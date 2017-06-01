@REM This script will run automatic testing module
@REM This script will launch two command prompt
@REM one is for webdriver-manager, other one is for npm run test
cd e2e-ui-tests
npm install & npm install -g protractor & webdriver-manager update & start webdriver-manager start & call run_test.bat