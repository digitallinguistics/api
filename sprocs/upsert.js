/* global __ */

/* eslint-disable
  func-style,
  no-param-reassign,
  no-throw-literal,
  require-jsdoc,
*/

function upsert(data = {}, userID, { ifMatch } = {}) {

  const { response } = __;
  const link = __.getAltLink();

  const parseError = err => {

    if (!err) return;

    switch (err.number) {
      case 400:
      case 403:
        throw new Error(500, `Unknown database error.`);
      case 404:
        throw new Error(404, `Resource with ID ${data.id} does not exist.`);
      case 412:
        throw new Error(412, `Precondition not met for resource with ID ${data.id}.`);
      default:
        throw new Error(err.number, `Database error.`);
    }

  };

  if (data.id) {

    const accepted = __.readDocument(`${link}/docs/${data.id}`, (err, doc) => {

      parseError(err);

      if (doc.ttl) throw new Error(410, `Resource with ID ${doc.id} no longer exists.`);

      if (doc.permissions.owners.includes(userID) || doc.permissions.contributors.includes(userID)) {

        const opts             = {};
        if (ifMatch) opts.etag = ifMatch;
        data.permissions       = doc.permissions;

        const accepted = __.replaceDocument(doc._self, data, opts, (err, res) => {
          parseError(err);
          if (!res._ts) res._ts = new Date() / 1000 | 0;
          response.setBody(res);
        });

        if (!accepted) throw new Error(408, `Timeout upserting resource.`);

      } else {

        throw new Error(403, `User does not have permissions to upsert the resource with ID ${doc.id}.`);

      }

    });

    if (!accepted) throw new Error(408, `Timeout reading resource for upsert.`);

  } else {

    data.permissions = {
      contributors: [],
      owners:       [userID],
      public:       false,
      viewers:      [],
    };

    const accepted = __.createDocument(link, data, (err, res) => {
      parseError(err);
      response.setBody(res);
    });

    if (!accepted) throw new Error(408, `Timeout upserting resource.`);

  }

}