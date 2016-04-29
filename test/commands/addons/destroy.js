'use strict'
/* globals commands it describe beforeEach afterEach cli nock */

let resolve = require('../../../lib/resolve')

let cmd = commands.find((c) => c.topic === 'addons' && c.command === 'destroy')
let expect = require('unexpected')

let confirmApp = cli.confirmApp

describe('addons:destroy', () => {
  beforeEach(function () {
    resolve.addon.cache.clear()
    cli.mockConsole()

    cli.confirmApp = confirmApp
  })
  afterEach(() => nock.cleanAll())

  let addon = {
    id: '1234-5678',
    name: 'redis-swiftly-123',
    addon_service: {name: 'heroku-redis'},
    app: {id: '4321-8765', name: 'myapp'},
    plan: {name: 'premium-0', price: {cents: 1, unit: 'month'}},
    config_vars: [
      'REDIS_VAR'
    ]
  }

  it('does not destroy addons with no confirm', () => {
    let addonApi = nock('https://api.heroku.com:443')
      .get('/apps/myapp/addons/redis-swiftly-123').reply(200, addon)

    cli.confirmApp = function *() {
      throw new Error('bad match')
    }

    return cmd.run({app: 'myapp', flags: {}, args: ['redis-swiftly-123']})
    .then(() => { throw new Error('should have failed') })
    .catch((err) => {
      expect(err.message, 'to equal', 'bad match')
      addonApi.done()
    })
  })

  it('destroys addons after prompting for confirmation', () => {
    let addonApi = nock('https://api.heroku.com:443')
      .get('/apps/myapp/addons/redis-swiftly-123').reply(200, addon)

    let attachApi = nock('https://api.heroku.com:443')
      .get('/addons/redis-swiftly-123/addon-attachments')
      .reply(200, [{
        name: 'redis-attachly-456',
        app: {
          name: 'otherapp'
        }
      }])

    let addonDelete = nock('https://api.heroku.com:443')
      .delete('/apps/4321-8765/addons/1234-5678').reply(200, addon)

    let attachedRelease = nock('https://api.heroku.com:443')
      .get('/apps/otherapp/releases').reply(200, [{
        version: 10
      }])

    cli.confirmApp = function *() { }

    return cmd.run({app: 'myapp', flags: {}, args: ['redis-swiftly-123']})
    .then(() => addonApi.done())
    .then(() => attachApi.done())
    .then(() => addonDelete.done())
    .then(() => attachedRelease.done())
    .then(() => expect(cli.stdout, 'to equal', ''))
    .then(() => expect(cli.stderr, 'to equal',
`Destroying redis-swiftly-123 on myapp... $0.01/month
Removing config vars redis-attachly-456 on otherapp and restarting... done, v10
`))
  })

  it('destroys addons with confirm option', () => {
    let addonApi = nock('https://api.heroku.com:443')
      .get('/apps/myapp/addons/redis-swiftly-123').reply(200, addon)

    let attachApi = nock('https://api.heroku.com:443')
      .get('/addons/redis-swiftly-123/addon-attachments').reply(200, [])

    let addonDelete = nock('https://api.heroku.com:443')
      .delete('/apps/4321-8765/addons/1234-5678').reply(200, addon)
    return cmd.run({app: 'myapp', flags: {confirm: 'myapp'}, args: ['redis-swiftly-123']})
    .then(() => addonApi.done())
    .then(() => attachApi.done())
    .then(() => addonDelete.done())
  })

  it('throws error on missing addon names', () => {
    return cmd.run({app: 'myapp', flags: {confirm: 'myapp'}, args: []})
    .then(() => { throw new Error('expected error') })
    .catch((err) => expect(err.message, 'to equal', 'Missing add-on name'))
  })
})
