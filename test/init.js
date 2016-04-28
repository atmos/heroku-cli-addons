'use strict'
/* globals cli nock */

global.cli = require('heroku-cli-util')
global.commands = require('..').commands
global.expect = require('chai').expect

global.nock = require('nock')
nock.disableNetConnect()

cli.raiseErrors = true
process.stdout.columns = 80
process.stderr.columns = 80
