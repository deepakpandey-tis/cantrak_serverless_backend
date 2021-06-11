const AWS = require("aws-sdk");
const knex = require("../db/knex");


const redisHelper = require('../helpers/redis');

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1",
});

const parcelHelper = {
  parcelSNSNotification: async ({
    orgId,
    module,
    data,
    receiver,
  }) => {
    try {
      console.log(
        "[PARCEL][SNS][NOTIFICATION]",
        orgId,
        module,
        data,
        receiver
      );

      const snsHelper = require("../helpers/sns");

      const message = {
        orgId: orgId,
        module: module,
        data: {
          parcelDetail : data.parcelDetail,
          receiverData : data. receiverData,
          senderData : data.senderData
        }
      };

      await snsHelper.sendSNSMessage(
        message,
        "THIRDPARTY_NOTIFICATIONS"
      );
    } catch (err) {
      return { failed: true, error: err };
    }
  },

  generateVotingDocumentOnEFSv2: async ({ data, requestedBy }) => {

    let browser = null;
    let bucketName = process.env.S3_BUCKET_NAME;
    const mountPathRoot = process.env.MNT_DIR;
    const fs = require('fs-extra');
    const QRCODE = require("qrcode");
    const ejs = require('ejs');
    const path = require('path');

    const requestId = 1;

    try {

      console.log('[helpers][parcel][generateVotingDocument]: Data:', data);

      //let agmPropertyUnitOwners = await knex('agm_owner_master').where({ agmId: agmId, eligibility: true });
      
      //Change above query to groupby "ownerGroupNumber" and get other grouped row data as json using func 'json_agg'

      // console.log('[helpers][parcel][generateVotingDocument]: AGM PU Owners:', agmPropertyUnitOwners);
      // console.log('[helpers][parcel][generateVotingDocument]: AGM PU Owners Length:', agmPropertyUnitOwners.length);


      // let agendas = await knex('agenda_master').where({ agmId: agmId, eligibleForVoting: true });
      // console.log('[helpers][parcel][generateVotingDocument]: agendas:', agendas);

      const Parallel = require("async-parallel");

      // agendas = await Parallel.map(agendas, async (ag) => {
      //   let choices = await knex('agenda_choice').where({ agendaId: ag.id });
      //   ag.choices = choices;
      //   return ag;
      // });

      // console.log('[helpers][parcel][generateVotingDocument]: Agenda with choices:', agendas);
      // console.log('[helpers][parcel][generateVotingDocument]: Agenda (Length):', agendas.length);

      let parcelData = data.parcelList;
      // agmDetails.formattedDate = moment(+agmDetails.agmDate).format('LL');
      // console.log('[helpers][parcel][generateVotingDocument]: Formatted Date:', agmDetails.formattedDate);


      const basePath = mountPathRoot + "/PARCEL/" + requestId + "/PendingListDocuments/" + new Date().getTime() + "/";
      console.log("[helpers][parcel][generateVotingDocument]: Base Directory (For Docs)....", basePath);

      // First Clean all files from the base directory....
      console.log("[helpers][parcel][generateVotingDocument]: Cleaning basepath directory for AGM....", requestId);
      await fs.remove(basePath);
      console.log("[helpers][parcel][generateVotingDocument]: basepath Directory cleaned....", basePath);

      //Ensure that directory is created...
      await fs.ensureDir(basePath);
      console.log("[helpers][parcel][generateVotingDocument]: basepath Directory Created/Ensured....", basePath);


      // Write Logic to prepare all objects for generating parallely.........
      Parallel.setConcurrency(30);
      let sheetsToPrepare = [];

      // Read HTML Template
      const templatePath = path.join(__dirname, '..', 'pdf-templates', 'parcel-template.ejs');
      console.log('[helpers][parcel][generateVotingDocument]: PDF Template Path:', templatePath);

      // await Parallel.each(parcelList, async (pd) => {
      //   console.log("[helpers][parcel][generateVotingDocument]: Preparing for each row of parcel pending list: ", pd);

      //   try {

      //     await Parallel.each(parcelList, async (parcelData) => {
      //       console.log("[helpers][parcel][generateVotingDocument]: Preparing For Parcel Data: ", parcelData);

      //       parcelData = await Parallel.map(parcelData, async (choice) => {
      //         let qrCodeObj = {
      //           qrName: 'SM:AGM:VOTING',
      //           orgId: orgId,
      //           agmId: agmId,
      //           unitId: pd.unitId,
      //           unitNumber: pd.unitNumber,   // Will be changed to unitNumber arrays
      //           ownerMasterId: pd.id,
      //           ownershipRatio: pd.ownershipRatio,  // Calculate all the grouped units for this owner and put sum of those here
      //           agendaId: agenda.id,
      //           choice: choice.id
      //         };
      //         let qrString = JSON.stringify(qrCodeObj);
      //         // console.log("[helpers][parcel][generateVotingDocument]: Qr String: ", qrString);
      //         let qrCodeDataURI = await QRCODE.toDataURL(qrString);
      //         choice.qrCode = qrCodeDataURI;
      //         // console.log("[helpers][parcel][generateVotingDocument]: Qr Generated....");
      //         return choice;
      //       });

      //       let htmlContents = await ejs.renderFile(templatePath, { agmDetails, agenda, propertyOwner: pd });
      //       // console.log('[helpers][parcel][generateVotingDocument]: htmlContents:', htmlContents);

      //       // let filename = `agm-${agmId}-pu-${pd.unitId}-agn-${agenda.id}.pdf`;
      //       let sanitizedUnitNumber = pd.unitNumber;
      //       sanitizedUnitNumber = sanitizedUnitNumber.replace('/', '-'); // check alternative like replaceAll
      //       let filename = `agm-${agmId}-proj-${pd.projectId}-agenda-${agenda.agendaNo}-unit-${unitNumber}.pdf`;

      //       const document = {
      //         html: htmlContents,
      //         data: {
      //           agmDetails: data.agmDetails,
      //           agenda: agenda,
      //           propertyOwner: pd
      //         },
      //         s3BasePath: basePath,
      //         filename: filename,
      //       };

      //       console.log("[helpers][parcel][generateVotingDocument]: Prepared Doc for Agenda: ", document);
      //       sheetsToPrepare.push(document);

      //     });

      //   } catch (err) {
      //     console.error("[helpers][announcement][sendAnnouncement]: Inner Loop: Error", err);
      //     if (err.list && Array.isArray(err.list)) {
      //       err.list.forEach(item => {
      //         console.error(`[helpers][announcement][sendAnnouncement]: Inner Loop Each Error:`, item.message);
      //       });
      //     }
      //     throw new Error(err);
      //   }

      //   console.log("[helpers][parcel][generateVotingDocument]: All docs gen for Property Owner: ", pd);
      // });


      parcelData = await Parallel.map(parcelData, async (data) => {
        // let qrCodeObj = {
        //   qrName: 'SM:PARCEL:PENDINGLIST',
        //   id: data.id,
        //   orgId: data.orgId,
        //   unitId: data.unitId,
        //   trackingNumber: data.trackingNumber,
        //   tenant: data.tenant,   // Will be changed to unitNumber arrays
        //   tenantId: data.tenantId,
        //   buildingPhaseCode: data.buildingPhaseCode,  // Calculate all the grouped units for this owner and put sum of those here
        //   buildingName: data.buildingName,
        //   unitNumber: data.unitNumber
        // };
        
        let qrString = JSON.stringify(`org~${data.orgId}~unitNumber~${data.unitNumber}~parcel~${data.id}`);
        // console.log("[helpers][parcel][generateVotingDocument]: Qr String: ", qrString);
        let qrCodeDataURI = await QRCODE.toDataURL(qrString);
        data.qrCode = qrCodeDataURI;
        data.createdAt = moment(
          +data.createdAt
        ).format("MMMM DD, yyyy, hh:mm:ss A");
        // console.log("[helpers][parcel][generateVotingDocument]: Qr Generated....");
        return data;
      });

      let htmlContents = await ejs.renderFile(templatePath, { data, parcelData });
      // console.log('[helpers][parcel][generateVotingDocument]: htmlContents:', htmlContents);

      // let filename = `agm-${agmId}-pu-${pd.unitId}-agn-${agenda.id}.pdf`;
      let sanitizedUnitNumber = pd.unitNumber;
      sanitizedUnitNumber = sanitizedUnitNumber.replace('/', '-'); // check alternative like replaceAll
      //let filename = `agm-${agmId}-proj-${pd.projectId}-agenda-${agenda.agendaNo}-unit-${unitNumber}.pdf`;
      let filename = `pending-parcel-list.pdf`;

      const document = {
        html: htmlContents,
        data: {
          parcelData: parcelData
        },
        s3BasePath: basePath,
        filename: filename,
      };

      console.log("[helpers][parcel][generateVotingDocument]: Prepared Doc for Parcel: ", document);
      sheetsToPrepare.push(document);


      console.log("[helpers][parcel][generateVotingDocument]: Generation Finished. Going to PRiNT");
      console.log("============================== PRiNT ======================================");


      await chromium.font('https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf');
      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });

      Parallel.setConcurrency(5);
      await Parallel.each(sheetsToPrepare, async (document) => {
        console.log("[helpers][parcel][generateVotingDocument]: Generating Doc for: ", document);
        await createPdfOnEFS(document, requestId, browser);
      });

      console.log("============================== PRiNT DONE ======================================");

      console.log("[helpers][parcel][generateVotingDocument]: All PDF documents created successfully. Going to create zip file.. ");

      if (browser !== null) {
        await browser.close();
        browser = null;
      }

      // Write Code to create Zip File...
      await fs.ensureDir(mountPathRoot +  "/PARCEL/" + requestId + "/zipped-files");
      console.log("[helpers][parcel][generateVotingDocument]: ZipFile Directory Created/Ensured....");

      const zipFileName = mountPathRoot +  "/PARCEL/" + requestId + "/zipped-files/" + `${new Date().getTime()}.zip`;
      console.log("[helpers][parcel][generateVotingDocument]: Going To Create Zip file with name:", zipFileName);
      const uploadedZippedFileDetails = await makeZippedFileOnEFS(basePath, zipFileName);

      console.log("[helpers][parcel][generateVotingDocument]: Zip File created successfully, Name:", zipFileName, uploadedZippedFileDetails);

      const s3 = new AWS.S3();

      let s3FileDownloadUrl = await new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', { Bucket: bucketName, Key: zipFileName, Expires: 24 * 60 * 60 }, (err, url) => {
          if (err) reject(err)
          else resolve(url)
        });
      });

      console.log("[helpers][parcel][generateVotingDocument]: s3FileDownloadUrl:", s3FileDownloadUrl);
      await redisHelper.setValueWithExpiry(`parcel-${requestId}-docs-link`, { s3Url: s3FileDownloadUrl }, 24 * 60 * 60);


      let sender = requestedBy;
      let receiver = requestedBy;

      //let orgData = await knex('organisations').where({ id: orgId }).first();

      let notificationPayload = {
        payload: {
          title: 'PARCEL - Pending List Document Generated',
          description: `PARCEL - Pending List Document Generated`,
          url: `/admin/parcel-management/generated-pdf-details`
        }
      };

      const votingDocGeneratedNotification = require('../notifications/agm/voting-doc-generated');
      await votingDocGeneratedNotification.send(
        sender,
        receiver,
        notificationPayload
      );
      console.log("[helpers][parcel][generateVotingDocument]: Successfull Parcel List Doc Generated - Annoncement Send to:", receiver.email);

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

module.exports = parcelHelper;
