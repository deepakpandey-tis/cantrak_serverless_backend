
const AWS = require('aws-sdk');

const socketConnectionHelper = require('./helpers/socket-connection-helper');

let ENDPOINT = `http://0.0.0.0:3001`;

async function sendMessage(connectionId, body) {
  try {

    const apig = new AWS.ApiGatewayManagementApi({
      // apiVersion: '2018-11-29',
      endpoint: ENDPOINT
    });

    body = JSON.stringify(body);

    await apig.postToConnection({
      ConnectionId: connectionId,
      Data: body
    }).promise();

  } catch (err) {
    console.log('[socket][sendMessage] Err:', err);

    if (err.statusCode !== 400 && err.statusCode !== 410) {
      throw err;
    }
  }
}


async function processRequest( originalRoute, connectionId, methodToCall, body, queryParams, params, me = null, id = null, orgId = null) {

  try {
    console.log('[socket][process-request]: ConnectionId:', connectionId);
    console.log('[socket][process-request]: methodToCall:', methodToCall);
    console.log('[socket][process-request]: body:', body);
    console.log('[socket][process-request]: queryParams:', queryParams);
    console.log('[socket][process-request]: params:', params);
    console.log('[socket][process-request]: me:', me);
    console.log('[socket][process-request]: UserId:', id);
    console.log('[socket][process-request]: orgId:', orgId);

    const req = {
      body, params, queryParams,
      me, id, orgId,
      connectionId
    };

    const res = {
      currentStatus: 200,
      status: (st) => {
        this.currentStatus = st;
      },
      json: async (obj) => {
        const body = {
          route : originalRoute,
          status: this.currentStatus,
          body: obj
        };
        await sendMessage(connectionId, body);
      }
    };

    await methodToCall(req, res);

    return;

  } catch (err) {
    console.log('[socket][process-request]: Error:', err);
  }

}



module.exports.handler = async function (event, context, cb) {
  console.log("[socket][handler]: EVENT: \n" + JSON.stringify(event, null, 2));

  ENDPOINT = process.env.IS_OFFLINE === 'true' ? ENDPOINT : `https://${event.requestContext.domainName}/${event.requestContext.stage}`;

  // const ENDPOINT = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  // const ENDPOINT = `http://0.0.0.0:3001`

  console.log('[socket][handler]: ENDPOINT:', ENDPOINT);

  const { body, queryStringParameters, requestContext: { connectionId, routeKey } } = event;

  switch (routeKey) {
    
    case '$connect':
      console.log('[socket][handler]: Connect - New Connection:', connectionId);
      console.log('[socket][handler]: Connect - User Token:', queryStringParameters.Auth);
      console.log('[socket][handler]: Connect - Browser Id:', queryStringParameters.deviceId);

      const decodedData = await socketConnectionHelper.getUserFromToken(queryStringParameters.Auth);
      console.log('[socket][handler]: Connect - Decoded Data:', decodedData);
      const connectionData = await socketConnectionHelper.addConnection(decodedData.userId, connectionId, queryStringParameters.deviceId, decodedData.orgId);
      console.log('[socket][handler]: Connection Added/Updated:', connectionData);

      break;

    case '$disconnect':
      await socketConnectionHelper.removeConnection(event.requestContext.connectionId);
      console.log('[socket][handler]: Disconnected:', event.requestContext.connectionId);
      break;

    case 'api':
      // Process Incoming message and route them to specific routes..
      // Message Format:: 
      // { route: '', body: {} }

      const routeBase = body.route.split('?')[0];
      const routeQueryParams = body.route.split('?')[1];

      let queryParams = null;
      if (routeQueryParams && routeQueryParams.length > 0) {
        queryParams = JSON.parse('{"' + decodeURI(routeQueryParams).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
      }

      // Improve Logic Here and implement regex matcher....
      const socketRoutes = require('./routes/socket-route');
      const methodToCall = socketRoutes[routeBase];
      console.log('[socket][handler]: Method To Call:', methodToCall);
      if (!methodToCall) {
        await sendMessage(connectionId, { status: 404, body: null });
        return;
      }

      let connection = await socketConnectionHelper.getConnectionByConnectionId(connectionId);
      if (!connection) {
        console.log('[socket][handler]: No connection details for connectionId:', connectionId);
        break;
      }

      let { userId, orgId } = connection;
      let user = await knex('users').where({ id: userId }).first();

      await processRequest(body.route, connectionId, methodToCall, body.body, queryParams, null, user, userId, orgId);

      break;

    case '$default':
    default:
      console.log('[socket][handler]: Received Message on default Route:', body);
      await sendMessage(connectionId,  { status: 200, route: 'welcome', body : { message: 'This is welcome message' } });
      break;

  }

  cb(null, {
    statusCode: 200,
  });

}


module.exports.auth = async (event, context, callback) => {
  // return policy statement that allows to invoke the connect function.
  // in a real world application, you'd verify that the header in the event
  // object actually corresponds to a user, and return an appropriate statement accordingly

  // Retrieve request parameters from the Lambda function input:
  let headers = event.headers;
  let queryStringParameters = event.queryStringParameters;
  let stageVariables = event.stageVariables;
  let requestContext = event.requestContext;

  // Parse the input for the parameter values
  let tmp = event.methodArn.split(':');
  let apiGatewayArnTmp = tmp[5].split('/');
  let awsAccountId = tmp[4];
  let region = tmp[3];
  let restApiId = apiGatewayArnTmp[0];
  let stage = apiGatewayArnTmp[1];
  let route = apiGatewayArnTmp[2];

  // Perform authorization to return the Allow policy for correct parameters and 
  // the 'Unauthorized' error, otherwise.
  var authResponse = {};
  var condition = {};
  condition.IpAddress = {};

  console.log("[socket][auth]:: Auth Token:", queryStringParameters.Auth);
  const { user, orgId } = await socketConnectionHelper.getUserFromToken(queryStringParameters.Auth);
  console.log("[socket][auth]:: Decoded User:", user);
  console.log("[socket][auth]:: Decoded Org:", orgId);


  if (user && orgId) {
    const policy = generatePolicy(user.email, 'Allow', event.methodArn);
    console.log("[socket][auth]:: Policy Generated::", policy);
    callback(null, policy);
  } else {
    callback("Unauthorized");
  }

};


const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};
