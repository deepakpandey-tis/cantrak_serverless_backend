const Joi = require("@hapi/joi");
const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");
const chromium = require('chrome-aws-lambda')

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1",
});

async function emptyS3Directory(bucket, dir) {

  const s3 = new AWS.S3();
  const listParams = {
    Bucket: bucket,
    Prefix: dir
  };

  const listedObjects = await s3.listObjectsV2(listParams).promise();

  if (listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] }
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  await s3.deleteObjects(deleteParams).promise();

  if (listedObjects.IsTruncated) await emptyS3Directory(bucket, dir);
}

const streamTo = (_bucket, _key) => {
  var stream = require('stream');
  const s3 = new AWS.S3();
  var _pass = new stream.PassThrough();
  s3.upload({ Bucket: _bucket, Key: _key, Body: _pass }, (_err, _data) => { /*...Handle Errors Here*/ });
  return _pass;
};

const createPdf = (document, agmId, browser) => {

  let bucketName = process.env.S3_BUCKET_NAME;

  return new Promise(async (res, rej) => {

    try {

      console.log('HTML To PRINT:', document.html);

      const page = await browser.newPage();
      await page.setContent(document.html, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      if (!pdf) {
        console.log('Unable to generate PDF...');
      } else {
        let filename = document.filename;
        console.log('PDF generated, uploading to s3 with filename:', filename);

        const s3 = new AWS.S3();
        const params = {
          Bucket: bucketName,
          Key: "AGM/" + agmId + "/VotingDocuments/" + filename,
          Body: pdf,
          ACL: "public-read"
        };

        let s3Res = await s3.putObject(params).promise();
        console.log("File uploaded Successfully on s3...", s3Res);

        res(s3Res);
      }

    } catch (err) {
      rej(err);
    }

  });

}



const makeZippedFile = (folderPath, zipFileKey) => {

  const S3Zipper = require('aws-s3-zipper');

  const config = {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION || "us-east-1",
    bucket: process.env.S3_BUCKET_NAME
  };
  const zipper = new S3Zipper(config);

  return new Promise((res, rej) => {
    zipper.zipToS3File({
      s3FolderName: folderPath,
      s3ZipFileName: zipFileKey,
      tmpDir: "/tmp"
    }, (err, result) => {
      if (err) {
        rej(err);
      }
      res(result.zippedFiles);
    });

  });

}


const agmHelper = {

  generateVotingDocument: async ({ agmId, data, orgId, requestedBy }) => {

    let browser = null;
    let bucketName = process.env.S3_BUCKET_NAME;

    try {

      console.log('[helpers][agm][generateVotingDocument]: Data:', data);

      let agmPropertyUnitOwners = await knex('agm_owner_master').where({ agmId: agmId, eligibility: true });
      console.log('[helpers][agm][generateVotingDocument]: AGM PU Owners:', agmPropertyUnitOwners);
      console.log('[helpers][agm][generateVotingDocument]: AGM PU Owners Length:', agmPropertyUnitOwners.length);


      let agendas = await knex('agenda_master').where({ agmId: agmId, eligibleForVoting: true });
      console.log('[helpers][agm][generateVotingDocument]: agendas:', agendas);

      const Parallel = require("async-parallel");

      agendas = await Parallel.map(agendas, async (ag) => {
        let choices = await knex('agenda_choice').where({ agendaId: ag.id });
        ag.choices = choices;
        return ag;
      });

      console.log('[helpers][agm][generateVotingDocument]: Agenda with choices:', agendas);
      console.log('[helpers][agm][generateVotingDocument]: Agenda (Length):', agendas.length);

      let agmDetails = data.agmDetails;
      agmDetails.formattedDate = moment(+agmDetails.agmDate).format('LL');
      console.log('[helpers][agm][generateVotingDocument]: Formatted Date:', agmDetails.formattedDate);


      let tempraryDirectory = null;
      if (process.env.IS_OFFLINE) {
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
      }

      const s3BasePath = "AGM/" + agmId + "/VotingDocuments/";

      // First Clean all files from the s3 directory....
      console.log("[helpers][agm][generateVotingDocument]: Cleaning S3 directory for AGM....", agmId);
      await emptyS3Directory(bucketName, s3BasePath);
      console.log("[helpers][agm][generateVotingDocument]: S3 Directory cleaned....", s3BasePath);


      let s3keys = []; //list of your file keys in s3 
      const QRCODE = require("qrcode");

      Parallel.setConcurrency(1);

      await Parallel.each(agendas, async (agenda) => {

        console.log("[helpers][agm][generateVotingDocument]: Starting to Generat For Agenda: ", agenda);

        await Parallel.each(agmPropertyUnitOwners, async (pd) => {

          console.log("[helpers][agm][generateVotingDocument]: Generating Doc for Property Owner: ", pd);

          await chromium.font('https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf');
          browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
          });

          let filename = `agm-${agmId}-pu-${pd.unitId}-t-${new Date().getTime()}.pdf`;
          let Key = s3BasePath + filename;


          agenda.choices = await Parallel.map(agenda.choices, async (choice) => {
            let qrCodeObj = {
              qrName: 'SM:AGM:VOTING',
              orgId: orgId,
              agmId: agmId,
              unitId: pd.unitId,
              unitNumber: pd.unitNumber,
              ownershipRatio: pd.ownershipRatio,
              agendaId: agenda.id,
              choice: choice.id
            };
            let qrString = JSON.stringify(qrCodeObj);
            // console.log("[helpers][agm][generateVotingDocument]: Qr String: ", qrString);
            let qrCodeDataURI = await QRCODE.toDataURL(qrString);
            choice.qrCode = qrCodeDataURI;
            // console.log("[helpers][agm][generateVotingDocument]: Qr Generated....");
            return choice;
          });

          const ejs = require('ejs');
          const path = require('path');

          // Read HTML Template
          const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.ejs');
          console.log('[helpers][agm][generateVotingDocument]: PDF Template Path:', templatePath);

          let htmlContents = await ejs.renderFile(templatePath, { agmDetails, agenda, propertyOwner: pd });
          // console.log('[helpers][agm][generateVotingDocument]: htmlContents:', htmlContents);

          const document = {
            html: htmlContents,
            data: {
              agmDetails: data.agmDetails,
              agenda: agenda,
              propertyOwner: pd
            },
            filename: filename,
          };

          await createPdf(document, agmId, browser);
          console.log("[helpers][agm][generateVotingDocument]: Generated Doc for PU: ", pd);
          s3keys.push(Key);

          if (browser !== null) {
            await browser.close();
          }

        });

        console.log("[helpers][agm][generateVotingDocument]: All Docs Generated For Agenda: ", agenda);
      });

      console.log("[helpers][agm][generateVotingDocument]: All PDF documents created successfully. Going to create zip file.. ");
      console.log("[helpers][agm][generateVotingDocument]: Files to be zipped: ", s3keys);

      // Write Code to create Zip File...
      const zipFileName = "AGM/" + agmId + "/zipped-files/" + `${new Date().getTime()}.zip`;

      await makeZippedFile(s3BasePath, zipFileName);

      console.log("[helpers][agm][generateVotingDocument]: Zip File created successfully, Name:", zipFileName);

      const s3 = new AWS.S3();

      let s3FileDownloadUrl = await s3.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: zipFileName,
        Expires: 2 * 60 * 60
      }).promise();

      console.log("[helpers][agm][generateVotingDocument]: s3FileDownloadUrl:", s3FileDownloadUrl);

      let sender = requestedBy;
      let receiver = requestedBy;

      let orgData = await knex('organisations').where({ id: orgId }).first();

      let notificationPayload = {
        payload: {
          title: 'AGM - Voting Document Generated',
          description: `AGM - Voting Document Generated for AGM: "${data.agmDetails.agmName}"`,
          url: s3FileDownloadUrl,
          orgData: orgData
        }
      };

      const votingDocGeneratedNotification = require('../notifications/agm/voting-doc-generated');
      await votingDocGeneratedNotification.send(
        sender,
        receiver,
        notificationPayload
      );
      console.log("[helpers][agm][generateVotingDocument]: Successfull Voting Doc Generated - Annoncement Send to:", receiver.email);

    } catch (err) {

      console.error("[helpers][announcement][sendAnnouncement]:  Error", err);
      if (err.list && Array.isArray(err.list)) {
        err.list.forEach(item => {
          console.error(`[helpers][announcement][sendAnnouncement]: Each Error:`, item.message);
        });
      }
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };

    } finally {

    }

  },
};

module.exports = agmHelper;
