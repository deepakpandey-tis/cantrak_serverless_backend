const Joi = require("@hapi/joi");
const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const pdf = require("pdf-creator-node");
const moment = require("moment-timezone");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1",
});


const createPdf = (document, agmId) => {

  const options = {
    format: "A5",
    orientation: "portrait",
    border: "5mm",
    header: {
      height: "1mm",
      contents: ''
      //contents: '<div style="text-align: center;">Author: Shyam Hajare</div>'
    },
    footer: {
      height: "1mm",
      contents: {
        // first: 'Cover page',
        // 2: 'Second page', // Any page number is working. 1-based index
        // default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
        // last: 'Last Page'
      }
    }
  };

  return new Promise((res, rej) => {

    pdf.create(document, options)
      .then((results) => {

        let bucketName = process.env.S3_BUCKET_NAME;

        fs.readFile(results.filename, function (err, file_buffer) {
          var s3 = new AWS.S3();
          var params = {
            Bucket: bucketName,
            Key: "AGM/" + agmId + "/VotingDocuments/" + filename,
            Body: file_buffer,
            ACL: "public-read"
          };

          s3.putObject(params, function (err, data) {
            if (err) {
              console.log("Error at uploadPDFFileOnS3Bucket function", err);
              rej(err);
            } else {
              console.log("File uploaded Successfully");
              let url = process.env.S3_BUCKET_URL + "AGM/" + agmId + "/VotingDocuments/" + filename;
              res(url);
            }
          });
        });
      })
      .catch((error) => {
        rej(err);
      });
  });

};


const agmHelper = {

  generateVotingDocument: async ({ agmId, data, orgId, requestedBy }) => {
    try {

      console.log('[helpers][agm][generateVotingDocument]: Data:', data);

      const votingDocGeneratedNotification = require('../notifications/agm/voting-doc-generated');

      const path = require('path');
      const fs = require("fs");

      // Read HTML Template
      const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.html');
      console.log('[helpers][agm][generateVotingDocument]: PDF Template Path:', templatePath);

      const html = fs.readFileSync(templatePath, "utf8");

      let agmPropertyUnitOwners = await knex('agm_owner_master').where({ agmId: agmId });
      console.log('[helpers][agm][generateVotingDocument]: AGM PU Owners:', agmPropertyUnitOwners);


      let tempraryDirectory = null;
      if (process.env.IS_OFFLINE) {
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
      }

      const Parallel = require("async-parallel");
      Parallel.setConcurrency(10);

      await Parallel.each(agmPropertyUnitOwners, async (pd) => {

        console.log("[helpers][agm][generateVotingDocument]: Generating Doc for Property Owner: ", pd);

        let filename = `agm-voting-${agmId}-${pd.unitId}-${new Date().getTime()}.pdf`;
        let filepath = tempraryDirectory + filename;

        const options = {
          format: "A5",
          orientation: "portrait",
          border: "5mm",
          header: {
            height: "1mm",
            contents: ''
            //contents: '<div style="text-align: center;">Author: Shyam Hajare</div>'
          },
          footer: {
            height: "1mm",
            contents: {
              // first: 'Cover page',
              // 2: 'Second page', // Any page number is working. 1-based index
              // default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
              // last: 'Last Page'
            }
          }
        };
        const datas = [
          {
            pName: 'PName',
            date: '22/03/2021',
            agenda: 'Agenda',
            unitNo: '',
            oRatio: '',
          }
        ];
        const listDatas = [
          {
            enText: "Consent",
            thaiText: "เห็นชอบ",
            qrCode: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
          },
          {
            enText: "Dissent",
            thaiText: "ไม่เห็นชอบ",
            qrCode: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
          },
          {
            enText: "Abstention",
            thaiText: "งดออกเสียง",
            qrCode: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
          },
        ];
        const document = {
          html: html,
          data: {
            listDatas: listDatas,
            datas: datas
          },
          path: filepath,
          type: "",
        };

        await createPdf(document, agmId);
        console.log("[helpers][agm][generateVotingDocument]: Generated Doc for PU: ", pd);

      });

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

      await votingDocGeneratedNotification.send(
        sender,
        receiver,
        notificationPayload
      );
      console.log("[helpers][agm][generateVotingDocument]: Successfull Voting Doc Generated - Annoncement Send to:", receiver.email);

    } catch (err) {

      console.log("[helpers][announcement][sendAnnouncement]:  Error", err);
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };

    }
  },
};

module.exports = agmHelper;
