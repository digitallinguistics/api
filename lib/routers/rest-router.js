const authenticate = require(`../middleware/authenticate`);
const checkScope   = require(`../middleware/scope`);
const config       = require(`../config`);
const handlers     = require(`../handlers/rest-handlers`);
const errors       = require(`../handlers/error-handlers`);
const test         = require(`../../test/handlers`);

module.exports = router => {

  router.route(`/languages`)
  .delete(checkScope, handlers.deleteAll)
  .get(handlers.getAll)
  .put(checkScope, handlers.upsertAll)
  .all(errors.methodNotAllowed);

  router.route(`/languages/:language`)
  .delete(checkScope, handlers.delete)
  .get(handlers.get)
  .put(checkScope, handlers.upsert)
  .all(errors.methodNotAllowed);

  router.route(`/test`)
  .get(authenticate, test.main)
  .all(errors.methodNotAllowed);

  // do not load test routes on production (JWTs will be exposed)
  if (config.localhost) {
    router.all(`/test/callback`, test.callback);
    router.all(`/test/code`, test.code);
    router.all(`/test/implicit`, test.implicit);
  }

};