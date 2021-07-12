const knex = require('../db/knex');
const AWS = require('aws-sdk');

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


  if (messageType == 'AGM_PREPARE_VOTING_DOCUMENT') {

    console.log('[handlers][longJobsProcessor]: Data For AGM Voting Doc Prepare:', recordData);

    const agmHelper = require('../helpers/agm');

    const { agmId, agendaId, data, orgId, requestedBy } = recordData;

    if (agmId) {
      // await agmHelper.generateVotingDocument({ agmId, data, orgId, requestedBy });
      await agmHelper.generateVotingDocumentOnEFSv2({ agmId, agendaId, data, orgId, requestedBy });
    } else {
      console.log('[handlers][longJobsProcessor]', 'AGM Id not found. Hence Voting Documents can not be generated.');
      throw Error('AGM Id not found. Hence Voting Documents can not be generated.');
    }

    console.log('[handlers][longJobsProcessor]: Task Completed.....');

  }

  if (messageType == 'PARCEL_PREPARE_PENDING_LIST_DOCUMENT') {

    console.log('[handlers][longJobsProcessor]: Data For Pending Parcel Doc Prepare:', recordData);

    const parcelHelper = require('../helpers/parcel');

    const { requestId, data, orgId, requestedBy } = recordData;

    if (data.parcelList.length > 0) {
      // await agmHelper.generateVotingDocument({ agmId, data, orgId, requestedBy });
      await parcelHelper.generateParcelSlipDocumentOnEFSv2({ requestId, data, orgId, requestedBy });
    } else {
      console.log('[handlers][longJobsProcessor]', 'Pending Parcel List not found. Hence Pending Parcel Documents can not be generated.');
      throw Error('Pending Parcel List not found. Hence Pending Parcel Documents can not be generated.');
    }

    console.log('[handlers][longJobsProcessor]: Task Completed.....');

  }



  if (messageType == 'AGM_FINAL_SUBMIT') {

    console.log('[handlers][longJobsProcessor]: Data For AGM_FINAL_SUBMIT:', recordData);

    const agmHelper = require('../helpers/agm');

    const { agmId, data, orgId, requestedBy } = recordData;

    if (agmId) {
      await agmHelper.finalSubmit({ agmId, data, orgId, requestedBy });
    } else {
      console.log('[handlers][longJobsProcessor]', 'AGM Id not found. Hence AGM_FINAL_SUBMIT can not be done.');
      throw Error('AGM Id not found. AGM Id not found. Hence AGM_FINAL_SUBMIT can not be done.');
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
