# UI test suite

This repo contains the end-to-end tests for our web application.

These tests are run using [Protractor](https://github.com/angular/protractor) (a flavor of [Selenium](http://www.seleniumhq.org/) for use on Angular applications). 

## Install
```shell
# Clone this repository
git clone needs to be updated
cd e2e-ui-tests

# Install dependencies
npm install

# Install protractor and webdriver-manager
npm install -g protractor

# Update and download nescessary webdrivers
webdriver-manager update
```

## Tasks
```shell
# Run tests using protractor-local.config.js
npm run test

# Run the linter
npm run lint

# Automatically fix common style errors
npm run fix-style


## Adding tests
Reusable modules for testing are stored in `objects` and BDD specs are stored in `specs` and helper utilities in `helpers`. 

If you're unfamilar with PageObjects, please read [Martin Fowler's article](http://martinfowler.com/bliki/PageObject.html) and the [Selenium guidelines](https://code.google.com/p/selenium/wiki/PageObjects) on the concept prior to writing tests, it'll clarify the motivation and use of the modules in `objects`. Protractor makes available several global objects to make testing easier, see the [Protractor API](https://github.com/angular/protractor/blob/master/docs/api.md) docs for more info.

## Running tests locally
The following commands will install protractor, webdriver-manager,
and then execute the testing suite against it.

```shell
# Start a local selenium server
webdriver-manager start

# In another terminal run the tests
npm run test
```

Test results will appear in your console and in `reports/`

