const express = require('express');
const sls = require('serverless-http');
const createError = require('http-errors');
const path = require('path');
const i18n = require('i18n');
const indexRouter = require('./routes/index');
const emailHelper = require('./helpers/email');


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



// EMAIL HANDLER (Triggered From SQS)
module.exports.emailQueueProcessor = (event, context) => {
  // console.log('Event:', JSON.stringify(event));
  // console.log('Context:', JSON.stringify(context));

  const recordsFromSQS = event.Records;
  const currentRecord = recordsFromSQS[0];    // Since we have kept the batchSize to only 1
  console.log('Current Record:', JSON.stringify(currentRecord));
  const mailOptions = JSON.parse(currentRecord.body);

  (async () => {
    await emailHelper.sendEmail(mailOptions);
  })();

  return;
};