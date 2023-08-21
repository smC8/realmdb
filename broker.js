import express from 'express';
import bodyParser from 'body-parser'
import axios from 'axios'; // Import the axios library

import session from 'express-session';
import Keycloak from 'keycloak-connect';
//var FileStore = require('session-file-store')(session);

import sessionFileStore from 'session-file-store';

const FileStore = sessionFileStore(session);

//Client "node-api created" in the realm "resource-server-test".
//no client authentication required in this example. For production,
//enable client authentication when creating the client

const app = express();
app.use(bodyParser.json());


// Create a session-store to be used by both the express-session
// middleware and the keycloak middleware.

const Store = new FileStore()

app.use(session({
  secret: 'mySecret',
  resave: false,
  saveUninitialized: true,
  store: Store
}))

// Provide the session store to the Keycloak so that sessions
// can be invalidated from the Keycloak console callback.
//
// Additional configuration is read from keycloak.json file
// installed from the Keycloak web console.

// const keycloak = new Keycloak({
//     store: Store
// })
// console.log(keycloak)

// Install the Keycloak middleware.
//
// Specifies that the user-accessible application URL to
// logout should be mounted at /logout
//
// Specifies that Keycloak console callbacks should target the
// root URL.  Various permutations, such as /k_logout will ultimately
// be appended to the admin URL.

// app.use(keycloak.middleware({
//     logout: '/logout',
//     admin: '/',
//     protected: '/protected/resource'
//   }))

//default route 
//'home:read' means '<resource-name>:<scope>
// app.get('/', keycloak.enforcer('home:read', {
//     claims: function() {
//       return {
//         // "http.uri": ["/protected/resource"],
//         "http.uri": ["hello"],
//         // get user agent  from request
//         "user.agent": ["insomnia/2023.4.0"],
//         "projects": ["XXX"]
//       }
//     }
//   }), function(req, res) {
//     console.log(res)
//     // const token = req.kauth.grant.access_token.content;
//     // const resolvedPermissions = token.authorization ? token.authorization.permissions : undefined;
//     res.json({ message: 'resource:view', permissions: req.permissions})
//     //console.log(resolvedPermissions)
// });


// app.get('/', keycloak.enforcer(['home:read', 'home:write'], {
//     resource_server_id: 'resource-server-1'
//   }), function (req, res) {
//     res.json( {
//       result: JSON.stringify(JSON.parse(req.session['keycloak-token']), null, 4),
//       event: '1. Access granted to Default Resource\n'
//     })
// })

/**
 * Instantiate a Keycloak.
 *
 * The `config` and `keycloakConfig` hashes are both optional.
 *
 * The `config` hash, if provided, may include either `store`, pointing
 * to the actual session-store used by your application, or `cookies`
 * with boolean `true` as the value to support using cookies as your
 * authentication store. Bear in mind that cookies session store expects
 * a cookie parser to be present, e.g. "cookie-parser" in case of Express.js.
 *
 * A session-based store is recommended, as it allows more assured control
 * from the Keycloak console to explicitly logout some or all sessions.
 *
 * In all cases, also, authentication through a Bearer authentication
 * header is supported for non-interactive APIs.
 *
 * The `keycloakConfig` object, by default, is populated by the contents of
 * a `keycloak.json` file installed alongside your application, copied from
 * the Keycloak administration console when you provision your application.
 *
 * @constructor
 *
 * @param      {Object}    config          Configuration for the Keycloak connector.
 * @param      {Object}    keycloakConfig  Keycloak-specific configuration.
 *
 * @return     {Keycloak}  A constructed Keycloak object.
 *
 */
//  const middleware0 = (req, res, next) => {
//   // const keycloak = mwf(req)
//   const keycloak = new Keycloak({
//     store: Store
//   }, kcConfig);
  
//   keycloak.middleware({
//     logout: '/logout',
//     admin: '/',
//     protected: '/protected/resource'
//   })
//   console.log('kc middleware 0 ===========>')
//   next()

// }
// app.use('/',middleware0)

function secondMiddleware(req, res, next) {
  console.log('Second middleware executed');
  console.log('Custom value from first middleware:', req.permissions);
  // res.json({ message: 'home:read', permissions: req.permissions})
  // Make a request to a remote server using axios
  const remoteUrl = 'https://reqres.in/api/users?page=2'; // Replace with the actual API URL
  axios.get(remoteUrl)
    .then(response => {
      console.log('Response from remote server:', response.data);
      res.json({ message: response.data, permissions: req.permissions})
      next();
    })
    .catch(error => {
      console.error('Error from remote server:', error.message);
      next(error);
    });
}

// Middleware function to fetch kcConfig data from remote API
async function fetchKeycloakConfigData(dynamicParamValue) {
  const apiUrl = `https://my-json-server.typicode.com/smC8/realmdb/${dynamicParamValue}`;
  try {
    const response = await axios.get(apiUrl);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch data from remote API');
  }
}

app.get('/api/:clientid/:resource',async (req, res, next) => {  
  const dynamicParamValue = req.params.clientid;

  try {
    const kcConfig = await fetchKeycloakConfigData(dynamicParamValue);
    console.log(kcConfig)
    const keycloak = new Keycloak({store: Store}, kcConfig);

    // Generate the first middleware function to return an express response handler middleware
    const firstMiddleware = keycloak.enforcer(
      [req.params.resource+':'+req.query.read, req.params.resource+':'+req.query.write], 
      {resource_server_id: req.params.clientid}
    );

    // Use the first middleware and chain it with the second middleware
    firstMiddleware(req, res, () => secondMiddleware(req, res, next));
    console.log('hello')
  } catch (error) {
    next(error);
  }
});
 


app.get('/api/:resource',function (req, res, next) {


  const keycloak = new Keycloak({
    store: Store
  }, kcConfig);

  keycloak.enforcer([req.params.resource+':read', req.params.resource+':write'], {
  // keycloak.enforcer([], {
    resource_server_id: 'felix-broker'
  })(req, res, () => secondMiddleware(req, res, next));

  console.log('hello')
});  

//create an unsecured route
app.get('/api/unsecured', function(req, res) {
  res.json({ message: 'This is an unsecured endpoint payload' });
  console.log('unsecured API route invoked')
});

  
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// start server on port 3008
app.listen(3000, err => {
  if (err) {
    console.error(err);
  }
  {
    console.log(`server listening on port : 3000`);
  }
});