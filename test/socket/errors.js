/* eslint-disable
  func-names,
  max-nested-callbacks,
  no-shadow,
  prefer-arrow-callback,
*/

const config        = require('../../lib/config');
const io            = require('socket.io-client');
const { promisify } = require('util');

const {
  authenticate,
  db,
  getToken,
  jwt,
  testAsync,
} = require('../utilities');

const {
  coll,
  upsert,
} = db;

const test = true;
const type = `Language`;

const permissions = {
  contributors: [],
  owners:       [config.testUser],
  public:       false,
  viewers:      [],
};

const defaultData = {
  name: {},
  permissions,
  test,
  type,
};

module.exports = (v = ``) => {

  describe(`Errors`, function() {

    let client;
    let emit;

    beforeAll(testAsync(async function() {
      const token = await getToken();
      client      = await authenticate(v, token);
      emit        = promisify(client.emit).bind(client);
    }));

    it(`400: Missing argument`, testAsync(async function() {
      try {
        await emit(`delete`);
      } catch (e) {
        expect(e.status).toBe(400);
      }
    }));

    it(`401: Unauthorized`, function(done) {

      const socketOpts = { transports: [`websocket`, `xhr-polling`] };
      const client     = io(`${config.baseURL}${v}`, socketOpts);

      client.on(`error`, err => {
        expect(err.status).toBe(401);
        done();
      });

      client.emit(`unauthorized event`, {});

    });

    it(`403: Forbidden`, testAsync(async function() {

      const data = {
        name: {},
        permissions: {
          contributors: [],
          owners:       [],
          public:       false,
          viewers:      [],
        },
        test,
        type,
      };

      const doc = await upsert(coll, data);

      try {
        await emit(`get`, doc.id);
      } catch (e) {
        expect(e.status).toBe(403);
      }

    }));

    it(`403: Forbidden (bad scope)`, testAsync(async function() {

      const payload = {
        azp:   config.authClientID,
        scope: `public`,
      };

      const opts = {
        audience: [`https://api.digitallinguistics.io/`],
        issuer:   `https://${config.authDomain}/`,
        subject:  config.testUser,
      };

      const token  = await jwt.signJwt(payload, config.authSecret, opts);
      const doc    = await upsert(coll, Object.assign({}, defaultData));
      const client = await authenticate(v, token);
      const emit   = promisify(client.emit).bind(client);

      try {
        await emit(`delete`, doc.id);
      } catch (e) {
        expect(e.status).toBe(403);
      }

    }));

    it(`404: No such event`, testAsync(async function() {
      try {
        await emit(`bad event`);
      } catch (e) {
        expect(e.status).toBe(404);
      }
    }));

    it(`412: Precondition Failed`, testAsync(async function() {

      const opts = { ifMatch: `bad-etag` };
      const doc  = await upsert(coll, Object.assign({}, defaultData));

      try {
        await emit(`delete`, doc.id, opts);
      } catch (e) {
        expect(e.status).toBe(412);
      }

      try {
        await emit(`upsert`, Object.assign({}, defaultData), opts);
      } catch (e) {
        expect(e.status).toBe(412);
      }

    }));

    it(`422: Malformed Data`, testAsync(async function() {

      const data = {
        name: true,
        test,
        type,
      };

      try {
        await emit(`add`, `Language`, data);
      } catch (e) {
        expect(e.status).toBe(422);
      }

    }));

  });

};