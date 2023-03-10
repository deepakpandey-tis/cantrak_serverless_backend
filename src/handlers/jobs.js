const knex = require('../db/knex');
const AWS = require('aws-sdk');
const Parallel = require('async-parallel');

const readJsonFile = async (Bucket, Key) => {

  AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION || "ap-southeast-1"
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
  console.log('[handlers][queueProcessor]', 'Message Type:', messageType);


  if (messageType === 'EMAIL') {

    const emailHelper = require('../helpers/email');
    const mailOptions = recordData;
    await emailHelper.sendEmail(mailOptions);

    console.log('[handlers][queueProcessor]: Email Sent Successfully');

  }

  if (messageType === 'NOTIFICATION') {
    console.log('[handlers][queueProcessor]', 'Received message is notification.');
    const notificationHandler = require('../notifications/core/notification');
    const notificationOptions = recordData;

    console.log('[handlers][queueProcessor]: Notification Options:', notificationOptions);
    await notificationHandler.processQueue(notificationOptions);

    console.log('[handlers][queueProcessor]: Notification Sent Successfully');
  }

  return true;
};


module.exports.longJobsProcessor = async (event, context) => {
  // console.log('Event:', JSON.stringify(event));
  // console.log('Context:', JSON.stringify(context));

  const recordsFromSQS = event.Records;
  const currentRecord = recordsFromSQS[0];    // Since we have kept the batchSize to only 1
  console.log('[handlers][longJobsProcessor] Current Record:', currentRecord);

  let recordData = JSON.parse(currentRecord.body);
  console.log('[handlers][longJobsProcessor] recordData:', recordData);


  if (currentRecord && recordData.payloadType && recordData.payloadType == 's3') {
    console.log('[handlers][longJobsProcessor] Got S3 Link, Sqs Message (as json file):', recordData.s3FileKey);
    let jsonData = await readJsonFile(process.env.S3_BUCKET_NAME, recordData.s3FileKey);
    console.log('[handlers][longJobsProcessor] Json Data from s3:', jsonData);
    recordData = JSON.parse(jsonData);
  }

  let messageType = '';

  if (currentRecord.messageAttributes && currentRecord.messageAttributes.messageType) {
    messageType = currentRecord.messageAttributes.messageType.stringValue;
  }
  console.log('[handlers][longJobsProcessor]', 'Message Type:', messageType);


  if (messageType === 'PM_WORK_ORDER_GENERATE') {

    const creatPmHelper = require("../helpers/preventive-maintenance");
    const { consolidatedWorkOrders, payload, orgId, requestedBy, orgMaster } = recordData;

    if (consolidatedWorkOrders && payload) {
      console.log('work orders ==============>>>>>>>>>>', consolidatedWorkOrders, orgMaster)
      pmWorkOrder = await creatPmHelper.createWorkOrders({ consolidatedWorkOrders, payload, orgId });
      console.log("pmWorkOrder result ======>>>>>", pmWorkOrder);

      if (pmWorkOrder) {
        const createPmLongJobsNotification = require("../notifications/preventive-maintenance/long-jobs-notification");

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
      console.log('[handlers][longJobsProcessor]', 'Work Orders Cannot be generated. Wrong Data in Payload');
      throw Error('Work Orders Cannot be generated. Wrong Data in Payload');
    }

    console.log('[handlers][longJobsProcessor]: Task Completed...');

  }

  if (messageType === 'ANNOUNCEMENT_BROADCAST') {

    console.log('[handlers][longJobsProcessor]', 'Data For Announcement:', recordData);

    const announcementHelper = require('../helpers/announcement');

    const { announcementId, dataNos, ALLOWED_CHANNELS, orgId, requestedBy, orgMaster } = recordData;

    if (announcementId) {
      await announcementHelper.sendAnnouncement({ announcementId, dataNos, ALLOWED_CHANNELS, orgId, requestedBy });
    } else {
      console.log('[handlers][longJobsProcessor]', 'Announcement Id not found. Hence Announcement can not be broadcasted.');
      throw Error('Announcement Id not found. Hence Announcement can not be broadcasted.');
    }

    console.log('[handlers][longJobsProcessor]: Task Completed.....');

  }

  if (messageType == 'PLANT_TO_SCAN') {

    console.log('[handlers][longJobsProcessor]: Data For Plants Doc Prepare:', recordData);

    const plantHelper = require('../helpers/plant');

    const { plantId, pdfType, data, orgId, requestedBy } = recordData;

    if (plantId) {
      // await agmHelper.generateVotingDocument({ agmId, data, orgId, requestedBy });
      await plantHelper.generatePlantsDocumentOnEFSv2({ plantId, pdfType, data, orgId, requestedBy });
    } else {
      console.log('[handlers][longJobsProcessor]', 'Plant Id not found. Hence Plants Documents can not be generated.');
      throw Error('Plant Id not found. Hence Plants Documents can not be generated.');
    }

    console.log('[handlers][longJobsProcessor]: Task Completed.....');

  }

  else if (messageType == 'PACKING_TO_SCAN') {

    console.log('[handlers][longJobsProcessor]: Data For Packing Doc Prepare:', recordData);

    const packingHelper = require('../helpers/packing-qrcode');

    const { packingLotId, pdfType, data, orgId, requestedBy } = recordData;

    if (packingLotId) {
      await packingHelper.generatePackingQRCodeDocumentOnEFSv2({ packingLotId, pdfType, data, orgId, requestedBy });
    } else {
      console.log('[handlers][longJobsProcessor]', 'Packing Lot Id not found. Packing Lot PDF document can not be generated.');
      throw Error('Packing Lot Id not found. Packing Lot PDF document can not be generated.');
    }

    console.log('[handlers][longJobsProcessor]: Task Completed.....');

  }


  if (messageType == 'TEST_PROCESSOR') {

    console.log('[handlers][longJobsProcessor]: Data For TEST_PROCESSOR:', recordData);

    const testHelper = require('../helpers/test');

    const { type } = recordData;
    console.log("[handlers][longJobsProcessor]: TEST_PROCESSOR: Messgae TYPE:", type)

    if (type == 'COMPLETED') {
      // await testHelper.setCompletedWO();
    } else if (type == 'OPEN') {
      // await testHelper.setOpenWorkOrder();
    } else if (type == 'efs') {
      await testHelper.testEFS();
    } else {
      console.log('[handlers][longJobsProcessor]', 'Type not found. Hence TEST_PROCESSOR can not be run.');
      throw Error('Type not found. Type not found. Hence TEST_PROCESSOR can not be run.');
    }

    console.log('[handlers][longJobsProcessor]: Task Completed.....');

  }

  console.log('[handlers][longJobsProcessor]: Finished.....');
  return true;
};


module.exports.calSyncQueueProcessor = async (event, context) => {
  const recordsFromSQS = event.Records;
  const currentRecord = recordsFromSQS[0];    // Since we have kept the batchSize to only 1

  console.log('[handlers][calSyncQueueProcessor] Current Record:', currentRecord);

  let recordData = JSON.parse(currentRecord.body);
  
  console.log('[handlers][calSyncQueueProcessor] recordData:', recordData);

  if (currentRecord && recordData.payloadType && recordData.payloadType == 's3') {
    console.log('[handlers][calSyncQueueProcessor] Got S3 Link, Sqs Message (as json file):', recordData.s3FileKey);

    let jsonData = await readJsonFile(process.env.S3_BUCKET_NAME, recordData.s3FileKey);

    console.log('[handlers][calSyncQueueProcessor] Json Data from s3:', jsonData);

    recordData = JSON.parse(jsonData);
  }

  let messageType = '';

  if (currentRecord.messageAttributes && currentRecord.messageAttributes.messageType) {
    messageType = currentRecord.messageAttributes.messageType.stringValue;
  }

  console.log('[handlers][calSyncQueueProcessor]', 'Message Type:', messageType);

  if (messageType == 'ADD_WORK_ORDER_CALENDAR_EVENT') {
    console.log('[handlers][calSyncQueueProcessor]: Data Work Order Add Calendar Event:', recordData);

    const workOrderEventsHelper = require('../helpers/work-order-events');

    const { workOrder } = recordData;
    const { id, orgId } = workOrder;

    if (id && orgId) {
      await workOrderEventsHelper.addWorkOrderEvents(+id, +orgId);
    } else {
      console.log('[handlers][calSyncQueueProcessor]', 'workOrderId or orgId not found.');
      throw Error('workOrderId or OrgId not found.');
    }

    console.log('[handlers][calSyncQueueProcessor]: Task Completed.....');
  }

  if (messageType == 'DELETE_WORK_ORDER_CALENDAR_EVENT') {
    console.log('[handlers][calSyncQueueProcessor]: Data Work Order Delete Calendar Event:', recordData);

    const workOrderEventsHelper = require('../helpers/work-order-events');

    const { workOrder } = recordData;
    const { id, orgId } = workOrder;

    if (id && orgId) {
      await workOrderEventsHelper.deleteWorkOrderEvents(+id, +orgId);
    } else {
      console.log('[handlers][calSyncQueueProcessor]', 'workOrderId or orgId not found.');
      throw Error('workOrderId or OrgId not found.');
    }

    console.log('[handlers][calSyncQueueProcessor]: Task Completed.....');
  }

  console.log('[handlers][calSyncQueueProcessor]: Finished.....');
  return true;
};

