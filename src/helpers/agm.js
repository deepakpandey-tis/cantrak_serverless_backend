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

const streamTo = (_bucket, _key) => {
  var stream = require('stream');
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


      let tempraryDirectory = null;
      if (process.env.IS_OFFLINE) {
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
      }

      let s3keys = []; //list of your file keys in s3 
      const QRCODE = require("qrcode");

      Parallel.setConcurrency(1);

      await Parallel.each(agendas, async (agenda) => {

        await Parallel.each(agmPropertyUnitOwners, async (pd) => {

          await chromium.font('https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf');

          browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
          });

          console.log("[helpers][agm][generateVotingDocument]: Generating Doc for Property Owner: ", pd);

          let filename = `agm-${agmId}-pu-${pd.unitId}-t-${new Date().getTime()}.pdf`;
          let Key = "AGM/" + agmId + "/VotingDocuments/" + filename;


          agenda.choices = await Parallel.map(agenda.choices, async (ch) => {
            let qrCodeObj = {
              qrName: 'SM:AGM:VOTING',
              orgId: orgId,
              agmId: agmId,
              unitId: pd.unitId,
              unitNumber: pd.unitNumber,
              ownershipRatio: pd.ownershipRatio,
              agendaId: agenda.id,
              choice: ch.id
            };
            let qrCodeDataURI = await QRCODE.toDataURL(JSON.stringify(qrCodeObj));
            ch.qrCode = qrCodeDataURI;
          });

          const ejs = require('ejs');
          const path = require('path');

          // Read HTML Template
          const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.ejs');
          console.log('[helpers][agm][generateVotingDocument]: PDF Template Path:', templatePath);

          let agmDetails = data.agmDetails;
          agmDetails.formattedDate = moment(+agmDetails.agmDate).format('LL');

          let htmlContents = await ejs.renderFile(templatePath, { agmDetails, agenda, propertyOwner: pd });
          console.log('[helpers][agm][generateVotingDocument]: htmlContents:', htmlContents);

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


      });

      console.log("[helpers][agm][generateVotingDocument]: All PDF documents created successfully. Going to create zip file.. ");
      console.log("[helpers][agm][generateVotingDocument]: Files to be zipped: ", s3keys);

      // Write Code to create Zip File...
      const _archiver = require('archiver');
      const zipFileName = "AGM/" + agmId + "/zipped-files/" + `${new Date().getTime()}.zip`;
      const s3 = new AWS.S3();

      var _list = await Promise.all(s3keys.map(_key => new Promise((_resolve, _reject) => {
        s3.getObject({ Bucket: bucketName, Key: _key }).promise()
          .then(_data => _resolve({ data: _data.Body, name: `${_key.split('/').pop()}` }));
      }
      ))).catch(_err => { throw new Error(_err) });

      await new Promise((_resolve, _reject) => {
        var _myStream = streamTo(bucketName, zipFileName);		//Now we instantiate that pipe...
        var _archive = _archiver('zip');
        _archive.on('error', err => { throw new Error(err); });

        //Your promise gets resolved when the fluid stops running... so that's when you get to close and resolve
        _myStream.on('close', _resolve);
        _myStream.on('end', _resolve);
        _myStream.on('error', _reject);

        _archive.pipe(_myStream);			//Pass that pipe to _archive so it can push the fluid straigh down to S3 bucket
        _list.forEach(_itm => _archive.append(_itm.data, { name: _itm.name }));		//And then we start adding files to it
        _archive.finalize();				//Tell is, that's all we want to add. Then when it finishes, the promise will resolve in one of those events up there
      }).catch(_err => { throw new Error(_err) });


      let s3FileDownloadUrl = 'https://www.google.com';

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

      console.log("[helpers][announcement][sendAnnouncement]:  Error", err);
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };

    } finally {

    }

  },
};

module.exports = agmHelper;
