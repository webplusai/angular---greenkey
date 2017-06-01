#!/bin/bash

customEnv="${bamboo.custom.env}"
customInstance="${bamboo.custom.instance}"
branch="${bamboo.repository.git.branch}"

ENV_NAME=""
MODIFIER=""
FILENAME=""

echo "Hello. Starting the build with parameters:"
echo " - node version: `node --version`"
echo " - npm version: `npm --version`"
echo " - bower version: `bower --version`"
echo " - repo branch: ${branch}"
echo " - custom environment: ${customEnv}"
echo " - custom instance: ${customInstance}"
echo ""
echo "Composing commands..."
echo ""

if [ -n "$customEnv" ]; then
    ENV_NAME=${customEnv}
else
    if [ "${branch}" == "develop" ]; then
	    ENV_NAME="test"
    elif [ "${branch}" == "master" ]; then
	    ENV_NAME="prod"
    fi
fi

if [ -z "$ENV_NAME" ]; then
    echo "Error. Couldn't define environment."
    exit 1
fi

if [ -n "${customInstance}" ]; then
    MODIFIER="--${customInstance}"
    FILENAME=${customInstance}
else
    FILENAME=${ENV_NAME}
fi

FILENAME="build-${FILENAME}.tar.gz"

echo "Prepared env command: gulp prepare-env --env=${ENV_NAME} ${MODIFIER}"
echo "Filename for deployment: ${FILENAME}"
echo ""

echo "Installing npm..." &&
npm install &&
echo "Installing bower..." &&
bower install &&
echo "Preparing environment..." &&
gulp prepare-env --env=${ENV_NAME} ${MODIFIER} &&
echo "Building the project..." &&
gulp build &&
echo "Copying files..." &&
cd build/public && tar czf ../../../${FILENAME} . &&
cd ../.. &&
rm -rf build/ &&
echo "Build is done. Have a nice day, sir!" &&
exit 0

echo "Sorry, something went wrong."
exit 1