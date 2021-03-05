const express = require('express');
const sls = require('serverless-http');
const createError = require('http-errors');
const path = require('path');
const i18n = require('i18n');
const indexRouter = require('./routes/index');
const AWS = require('aws-sdk');


/**
 * App
 */
const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.enable('trust proxy');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, XMLHttpRequest, ngsw-bypass');
  next();
});


// i18n
// i18n.configure({
//   locales: ['en', 'et'],
//   defaultLocale: 'en',
//   cookie: 'lang',
//   objectNotation: true,
//   queryParameter: 'lang',
//   directory: path.join(__dirname, 'i18n'),
//   //updateFiles: true
// });
// app.use(i18n.init);
// app.get('/en', function (req, res) {
//     // res.cookie('lang', 'en', { maxAge: 900000, httpOnly: false });
//     // res.redirect('back');
// });
// app.get('/et', function (req, res) {
//     // res.cookie('lang', 'et', { maxAge: 900000, httpOnly: false });
//     // res.redirect('back');
// });


/**
 * Routers
 */

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  // res.locals.message = err.message;
  // res.locals.error = req.app.get('env') === 'development' ? err : {};

  const error = req.app.get('env') !== 'production' ? err : {};

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, XMLHttpRequest, ngsw-bypass');

  res.status(err.status || 500);
  // res.render('error');
  res.json(error);
});


module.exports.server = sls(app);


// const server = sls(app);
// module.exports.server = async (event, context) => {
//   context.callbackWaitsForEmptyEventLoop = false;
//   console.log('Remaining time: ', context.getRemainingTimeInMillis())
//   console.log('Function name: ', context.functionName)
//   const result = await server(event, context);
//   // and here
//   return result;
// };


if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log(`You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables to enable push notification.`);
  // console.log(webPush.generateVAPIDKeys());
}



global.appRoot = path.resolve(__dirname);

module.exports.s3hook = (event, context) => {
  console.log('S3 Hook: Event   :: ', JSON.stringify(event));
  console.log('S3 Hook: Context ::', JSON.stringify(context));
  // console.log(JSON.stringify(process.env));
};


const readJsonFile = async (Bucket, Key) => {

  AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION || "us-east-1"
  });

  const params = {
    Bucket,
    Key,
    ResponseContentType: 'application/json',
  };

  const s3 = new AWS.S3({
    'signatureVersion': 'v4'
  });

  const f = await s3.getObject(params).promise();
  return f.Body.toString('utf-8');
};



// EMAIL HANDLER (Triggered From SQS)
module.exports.queueProcessor = async (event, context) => {
  // console.log('Event:', JSON.stringify(event));
  // console.log('Context:', JSON.stringify(context));

  const recordsFromSQS = event.Records;
  const currentRecord = recordsFromSQS[0];    // Since we have kept the batchSize to only 1
  console.log('Current Record:', currentRecord);

  let recordData = JSON.parse(currentRecord.body);
  console.log('[longJobsProcessor] recordData:', recordData);

  if (currentRecord && recordData.payloadType && recordData.payloadType == 's3') {
    console.log('[longJobsProcessor] Got S3 Link, Sqs Message (as json file):', recordData.s3FileKey);
    let jsonData = await readJsonFile(process.env.S3_BUCKET_NAME, recordData.s3FileKey);
    console.log('[longJobsProcessor] Json Data from s3:', jsonData);
    recordData = JSON.parse(jsonData);
  }


  let messageType = 'EMAIL';

  if (currentRecord.messageAttributes && currentRecord.messageAttributes.messageType) {
    messageType = currentRecord.messageAttributes.messageType.stringValue;
  }
  console.log('[app][queueProcessor]', 'Message Type:', messageType);


  if (messageType === 'EMAIL') {

    const emailHelper = require('./helpers/email');
    const mailOptions = recordData;
    await emailHelper.sendEmail(mailOptions);

    console.log('[app][queueProcessor]: Email Sent Successfully');

  }

  if (messageType === 'NOTIFICATION') {
    console.log('[app][queueProcessor]', 'Received message is notification.');
    const notificationHandler = require('./notifications/core/notification');
    const notificationOptions = recordData;

    console.log('[app][queueProcessor]: Notification Options:', notificationOptions);
    await notificationHandler.processQueue(notificationOptions);

    console.log('[app][queueProcessor]: Notification Sent Successfully');
  }

  return true;
};


module.exports.longJobsProcessor = async (event, context) => {
  // console.log('Event:', JSON.stringify(event));
  // console.log('Context:', JSON.stringify(context));

  const recordsFromSQS = event.Records;
  const currentRecord = recordsFromSQS[0];    // Since we have kept the batchSize to only 1
  console.log('[longJobsProcessor] Current Record:', currentRecord);

  let recordData = JSON.parse(currentRecord.body);
  console.log('[longJobsProcessor] recordData:', recordData);


  if (currentRecord && recordData.payloadType && recordData.payloadType == 's3') {
    console.log('[longJobsProcessor] Got S3 Link, Sqs Message (as json file):', recordData.s3FileKey);
    let jsonData = await readJsonFile(process.env.S3_BUCKET_NAME, recordData.s3FileKey);
    console.log('[longJobsProcessor] Json Data from s3:', jsonData);
    recordData = JSON.parse(jsonData);
  }

  let messageType = 'PM_WORK_ORDER_GENERATE';

  if (currentRecord.messageAttributes && currentRecord.messageAttributes.messageType) {
    messageType = currentRecord.messageAttributes.messageType.stringValue;
  }
  console.log('[app][longJobsProcessor]', 'Message Type:', messageType);


  if (messageType === 'PM_WORK_ORDER_GENERATE') {

    const creatPmHelper = require("./helpers/preventive-maintenance");
    const { consolidatedWorkOrders, payload, orgId, requestedBy, orgMaster } = recordData;

    if (consolidatedWorkOrders && payload) {
      console.log('work orders ==============>>>>>>>>>>', consolidatedWorkOrders, orgMaster)
      pmWorkOrder = await creatPmHelper.createWorkOrders({ consolidatedWorkOrders, payload, orgId });
      console.log("pmWorkOrder result ======>>>>>", pmWorkOrder);

      if (pmWorkOrder) {
        const createPmLongJobsNotification = require("./notifications/preventive-maintenance/long-jobs-notification");

        const ALLOWED_CHANNELS = ['IN_APP', 'WEB_PUSH', 'SOCKET_NOTIFY']

        let dataNos = {
          payload: {
            orgData: orgMaster
          },
        };


        let receiver = requestedBy
        let sender = requestedBy

        await createPmLongJobsNotification.send(
          sender,
          receiver,
          dataNos,
          ALLOWED_CHANNELS
        )
      }
    } else {
      console.log('[app][longJobsProcessor]', 'Work Orders Cannot be generated. Wrong Data in Payload');
      throw Error('Work Orders Cannot be generated. Wrong Data in Payload');
    }

    console.log('[app][longJobsProcessor]: Task Completed...');

  }

  if (messageType === 'ANNOUNCEMENT_BROADCAST') {

    console.log('[app][longJobsProcessor]', 'Data For Announcement:', recordData);

    const announcementHelper = require('./helpers/announcement');

    const { announcementId, dataNos, ALLOWED_CHANNELS, orgId, requestedBy, orgMaster } = recordData;

    if (announcementId) {
      await announcementHelper.sendAnnouncement({ announcementId, dataNos, ALLOWED_CHANNELS, orgId, requestedBy });
    } else {
      console.log('[app][longJobsProcessor]', 'Announcement Id not found. Hence Announcement can not be broadcasted.');
      throw Error('Announcement Id not found. Hence Announcement can not be broadcasted.');
    }

    console.log('[app][longJobsProcessor]: Task Completed.....');

  }

  return true;
};


module.exports.workOrderOverdueProcessor = async (event, context) => {
  // console.log('[app][workOrderOverdueProcessor]: Event:', JSON.stringify(event));
  // console.log('[app][workOrderOverdueProcessor]: Context:', JSON.stringify(context));

  const pmHelper = require("./helpers/preventive-maintenance");
  await pmHelper.markWorkOrdersOverDue();

  console.log('[app][workOrderOverdueProcessor]: Task Completed Successfully');

  return true;
};


module.exports.dailyDigestProcessor = async (event, context) => {
  console.log('[app][dailyDigestProcessor]: Event:', JSON.stringify(event));
  // console.log('[app][workOrderOverdueProcessor]: Context:', JSON.stringify(context));

  const dailyDigestHelper = require("./helpers/daily-digest");
  await dailyDigestHelper.prepareDailyDigestForUsers();

  console.log('[app][dailyDigestProcessor]: Task Completed Successfully');
  return true;
};