const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");
const chromium = require('chrome-aws-lambda');
const redisHelper = require('../helpers/redis');


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


const createPdf = (document, agmId, browser, retries = 1) => {

  let bucketName = process.env.S3_BUCKET_NAME;

  return new Promise(async (res, rej) => {

    try {

      console.log('Retries/ HTML To PRINT:', retries, document.html);

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
        rej(new Error('Unable to generate PDF...'));
      } else {
        console.log('PDF generated, uploading to s3 with filename:', document.s3BasePath + document.filename);

        const s3 = new AWS.S3();
        const params = {
          Bucket: bucketName,
          Key: document.s3BasePath + document.filename,
          Body: pdf,
          ACL: "public-read"
        };

        let s3Res = await s3.putObject(params).promise();
        console.log("File uploaded Successfully on s3...", s3Res);

        await page.close();
        res(s3Res);
      }

    } catch (err) {
      // rej(err);  // don't reject ... add a retry...

      if (!browser || wasBrowserKilled(browser)) {
        await chromium.font('https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf');
        browser = await chromium.puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
        });
      }

      retries++;
      if (retries > 5) {
        console.log('Retrying after error:', err);
        await createPdf(document, agmId, browser, retries);
      } else {
        rej(err);
      }

    }

  });

}


const createPdfOnEFS = (document, agmId, browser, retries = 1) => {

  return new Promise(async (res, rej) => {

    try {

      console.log('Retries/ HTML To PRINT:', retries, document.html);

      const page = await browser.newPage();
      await page.setContent(document.html, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });

      const pdf = await page.pdf({
        path: document.s3BasePath + document.filename,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      if (!pdf) {
        console.log('Unable to generate PDF...');
        rej(new Error('Unable to generate PDF...'));
      } else {
        console.log('PDF generated, with filename:', document.s3BasePath + document.filename);
        await page.close();
        res(true);
      }

    } catch (err) {
      // rej(err);  // don't reject ... add a retry...

      if (!browser || wasBrowserKilled(browser)) {
        await chromium.font('https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf');
        browser = await chromium.puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
        });
      }

      retries++;
      if (retries > 5) {
        console.log('Retrying after error:', err);
        await createPdf(document, agmId, browser, retries);
      } else {
        rej(err);
      }

    }

  });

}


const makeZippedFile = (bucket, folder, zipFileKey) => {

  console.log('[helpers][agm][makeZippedFile]: bucket: ', bucket);
  console.log('[helpers][agm][makeZippedFile]: folder: ', folder);
  console.log('[helpers][agm][makeZippedFile]: zipFileKey: ', zipFileKey);

  const XmlStream = require('xml-stream');
  const s3Zip = require('s3-zip');
  const s3 = new AWS.S3();

  const params = {
    Bucket: bucket,
    Prefix: folder
  }

  return new Promise((res, rej) => {

    const filesArray = [];
    const files = s3.listObjects(params).createReadStream();
    const xml = new XmlStream(files);
    xml.collect('Key');
    xml.on('endElement: Key', (item) => {
      filesArray.push(item['$text'].substr(folder.length))
    });

    xml.on('end', () => {
      console.log('[helpers][agm][makeZippedFile]: Files To Be Zipped: ', filesArray);
      // const output = fs.createWriteStream(join(__dirname, 's3-folder.zip'));

      const s3Stream = require('s3-upload-stream')(new AWS.S3());
      const upload = s3Stream.upload({
        "Bucket": bucket,
        "Key": zipFileKey
      });

      upload.on('error', (error) => {
        console.log(error);
        rej(error)
      });

      upload.on('uploaded', (details) => {
        res(details);
      });

      s3Zip.archive({ s3: s3, bucket: bucket, debug: true }, folder, filesArray).pipe(upload);

    });

  });
}

const makeZippedFileOnEFS = (folder, zipFileKey) => {

  const fs = require('fs-extra');
  const archiver = require('archiver');
  let bucketName = process.env.S3_BUCKET_NAME;

  console.log('[helpers][agm][makeZippedFileOnEFS]: folder: ', folder);
  console.log('[helpers][agm][makeZippedFileOnEFS]: zipFileKey: ', zipFileKey);

  console.log('[helpers][agm][makeZippedFileOnEFS]: Lisiting ALL FILES: ');

  fs.readdirSync(folder).forEach(file => {
    console.log('[helpers][agm][makeZippedFileOnEFS]: Found:', file);
  });

  return new Promise(async (res, rej) => {

    const output = fs.createWriteStream(zipFileKey);
    const archive = archiver('zip');

    output.on('close', async () => {
      console.log(archive.pointer() + ' total bytes');
      console.log('[helpers][agm][makeZippedFileOnEFS]: archiver has been finalized and the output file descriptor has closed.');

      const fileContent = fs.readFileSync(zipFileKey);
      console.log('[helpers][agm][makeZippedFileOnEFS]: Zipped File Content Read Successfully for uploading to s3.');

      const s3 = new AWS.S3();
      const params = {
        Bucket: bucketName,
        Key: zipFileKey,
        Body: fileContent,
        ACL: "public-read"
      };
      let s3Res = await s3.putObject(params).promise();
      console.log("[helpers][agm][makeZippedFileOnEFS]: Zip File uploaded Successfully on s3...", s3Res);

      res(true);

    });

    archive.on('error', (err) => {
      rej(err);
    });

    archive.pipe(output);

    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(folder, false);
    archive.finalize();

  });
}

const wasBrowserKilled = async (browser) => {
  const procInfo = await browser.process();
  return !!procInfo.signalCode; // null if browser is still running
}


const agmHelper = {

  generateVotingDocumentImproved: async ({ agmId, data, orgId, requestedBy }) => {

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


      const s3BasePath = "AGM/" + agmId + "/VotingDocuments/" + new Date().getTime() + "/";
      console.log("[helpers][agm][generateVotingDocument]: S3 Directory (For Docs)....", s3BasePath);

      // First Clean all files from the s3 directory....
      // console.log("[helpers][agm][generateVotingDocument]: Cleaning S3 directory for AGM....", agmId);
      // await emptyS3Directory(bucketName, s3BasePath);
      // console.log("[helpers][agm][generateVotingDocument]: S3 Directory cleaned....", s3BasePath);

      // Write Logic to prepare all objects for generating parallely.........
      const QRCODE = require("qrcode");
      const ejs = require('ejs');
      const path = require('path');

      Parallel.setConcurrency(20);
      let sheetsToPrepare = [];

      await Parallel.each(agmPropertyUnitOwners, async (pd) => {
        console.log("[helpers][agm][generateVotingDocument]: Preparing for Property Owner: ", pd);

        try {

          await Parallel.each(agendas, async (agenda) => {
            console.log("[helpers][agm][generateVotingDocument]: Preparing For Agenda: ", agenda);

            agenda.choices = await Parallel.map(agenda.choices, async (choice) => {
              let qrCodeObj = {
                qrName: 'SM:AGM:VOTING',
                orgId: orgId,
                agmId: agmId,
                unitId: pd.unitId,
                unitNumber: pd.unitNumber,
                ownerMasterId: pd.id,
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

            // Read HTML Template
            const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.ejs');
            console.log('[helpers][agm][generateVotingDocument]: PDF Template Path:', templatePath);

            let htmlContents = await ejs.renderFile(templatePath, { agmDetails, agenda, propertyOwner: pd });
            // console.log('[helpers][agm][generateVotingDocument]: htmlContents:', htmlContents);

            let filename = `agm-${agmId}-pu-${pd.unitId}-t-${new Date().getTime()}.pdf`;

            const document = {
              html: htmlContents,
              data: {
                agmDetails: data.agmDetails,
                agenda: agenda,
                propertyOwner: pd
              },
              s3BasePath: s3BasePath,
              filename: filename,
            };

            console.log("[helpers][agm][generateVotingDocument]: Prepared Doc for Agenda: ", document);
            sheetsToPrepare.push(document);

          });

        } catch (err) {
          console.error("[helpers][agm][generateVotingDocument]: Inner Loop: Error", err);
          if (err.list && Array.isArray(err.list)) {
            err.list.forEach(item => {
              console.error(`[helpers][agm][generateVotingDocument]: Inner Loop Each Error:`, item.message);
            });
          }
          throw new Error(err);
        }

        console.log("[helpers][agm][generateVotingDocument]: All docs gen for Property Owner: ", pd);
      });


      console.log("[helpers][agm][generateVotingDocument]: Generation Finished. Going to PRiNT");
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
        console.log("[helpers][agm][generateVotingDocument]: Generating Doc for: ", document);
        await createPdf(document, agmId, browser);
      });

      console.log("============================== PRiNT DONE ======================================");

      console.log("[helpers][agm][generateVotingDocument]: All PDF documents created successfully. Going to create zip file.. ");

      if (browser !== null) {
        await browser.close();
        browser = null;
      }

      // Write Code to create Zip File...
      const zipFileName = "AGM/" + agmId + "/zipped-files/" + `${new Date().getTime()}.zip`;
      const uploadedZippedFileDetails = await makeZippedFile(bucketName, s3BasePath, zipFileName);

      console.log("[helpers][agm][generateVotingDocument]: Zip File created successfully, Name:", zipFileName, uploadedZippedFileDetails);

      const s3 = new AWS.S3();

      let s3FileDownloadUrl = await new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', { Bucket: bucketName, Key: zipFileName, Expires: 2 * 60 * 60 }, (err, url) => {
          if (err) reject(err)
          else resolve(url)
        });
      });

      console.log("[helpers][agm][generateVotingDocument]: s3FileDownloadUrl:", s3FileDownloadUrl);
      await redisHelper.setValueWithExpiry(`agm-${agmId}-voting-docs-link`, { s3Url: s3FileDownloadUrl }, 2 * 60 * 60);


      let sender = requestedBy;
      let receiver = requestedBy;

      let orgData = await knex('organisations').where({ id: orgId }).first();

      let notificationPayload = {
        payload: {
          title: 'AGM - Voting Document Generated',
          description: `AGM - Voting Document Generated for AGM: "${data.agmDetails.agmName}"`,
          url: `/admin/agm/agm-details/${data.agmDetails.id}`,
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

      console.error("[helpers][agm][generateVotingDocument]:  Error", err);
      if (err.list && Array.isArray(err.list)) {
        err.list.forEach(item => {
          console.error(`[helpers][agm][generateVotingDocument]: Each Error:`, item.message);
        });
      }
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };

    } finally {

    }

  },

  generateVotingDocumentOnEFS: async ({ agmId, data, orgId, requestedBy }) => {

    let browser = null;
    let bucketName = process.env.S3_BUCKET_NAME;
    const mountPathRoot = process.env.MNT_DIR;
    const fs = require('fs-extra');
    const QRCODE = require("qrcode");
    const ejs = require('ejs');
    const path = require('path');

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


      const basePath = mountPathRoot + "/AGM/" + agmId + "/VotingDocuments/" + new Date().getTime() + "/";
      console.log("[helpers][agm][generateVotingDocument]: Base Directory (For Docs)....", basePath);

      // First Clean all files from the base directory....
      console.log("[helpers][agm][generateVotingDocument]: Cleaning basepath directory for AGM....", agmId);
      await fs.remove(basePath);
      console.log("[helpers][agm][generateVotingDocument]: basepath Directory cleaned....", basePath);

      //Ensure that directory is created...
      await fs.ensureDir(basePath);
      console.log("[helpers][agm][generateVotingDocument]: basepath Directory Created/Ensured....", basePath);


      // Write Logic to prepare all objects for generating parallely.........
      Parallel.setConcurrency(30);
      let sheetsToPrepare = [];

      // Read HTML Template
      const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.ejs');
      console.log('[helpers][agm][generateVotingDocument]: PDF Template Path:', templatePath);

      await Parallel.each(agmPropertyUnitOwners, async (pd) => {
        console.log("[helpers][agm][generateVotingDocument]: Preparing for Property Owner: ", pd);

        try {

          await Parallel.each(agendas, async (agenda) => {
            console.log("[helpers][agm][generateVotingDocument]: Preparing For Agenda: ", agenda);

            agenda.choices = await Parallel.map(agenda.choices, async (choice) => {
              let qrCodeObj = {
                qrName: 'SM:AGM:VOTING',
                orgId: orgId,
                agmId: agmId,
                unitId: pd.unitId,
                unitNumber: pd.unitNumber,
                ownerMasterId: pd.id,
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

            let htmlContents = await ejs.renderFile(templatePath, { agmDetails, agenda, propertyOwner: pd });
            // console.log('[helpers][agm][generateVotingDocument]: htmlContents:', htmlContents);

            // let filename = `agm-${agmId}-pu-${pd.unitId}-agn-${agenda.id}.pdf`;
            // let sanitizedUnitNumber = pd.unitNumber;
            // sanitizedUnitNumber = sanitizedUnitNumber.replace('/', '-');

            // let sanitizedOwnerGroupNumber = pd.ownerGroupNo;
            // sanitizedOwnerGroupNumber = sanitizedOwnerGroupNumber.replace('#','-')
            // let filename = `agm-${agmId}-proj-${pd.projectId}-agenda-${agenda.agendaNo}-unit-${pd.unitNumber}.pdf`;
            let filename = `agm-${agmId}-proj-${pd.projectId}-agenda-${agenda.agendaNo}-ownerGroupNo-${pd.ownerGroupNo}.pdf`;

            const document = {
              html: htmlContents,
              data: {
                agmDetails: data.agmDetails,
                agenda: agenda,
                propertyOwner: pd
              },
              s3BasePath: basePath,
              filename: filename,
            };

            console.log("[helpers][agm][generateVotingDocument]: Prepared Doc for Agenda: ", document);
            sheetsToPrepare.push(document);

          });

        } catch (err) {
          console.error("[helpers][agm][generateVotingDocument]: Inner Loop: Error", err);
          if (err.list && Array.isArray(err.list)) {
            err.list.forEach(item => {
              console.error(`[helpers][agm][generateVotingDocument]: Inner Loop Each Error:`, item.message);
            });
          }
          throw new Error(err);
        }

        console.log("[helpers][agm][generateVotingDocument]: All docs gen for Property Owner: ", pd);
      });


      console.log("[helpers][agm][generateVotingDocument]: Generation Finished. Going to PRiNT");
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
        console.log("[helpers][agm][generateVotingDocument]: Generating Doc for: ", document);
        await createPdfOnEFS(document, agmId, browser);
      });

      console.log("============================== PRiNT DONE ======================================");

      console.log("[helpers][agm][generateVotingDocument]: All PDF documents created successfully. Going to create zip file.. ");

      if (browser !== null) {
        await browser.close();
        browser = null;
      }

      // Write Code to create Zip File...
      await fs.ensureDir(mountPathRoot +  "/AGM/" + agmId + "/zipped-files");
      console.log("[helpers][agm][generateVotingDocument]: ZipFile Directory Created/Ensured....");

      const zipFileName = mountPathRoot +  "/AGM/" + agmId + "/zipped-files/" + `${new Date().getTime()}.zip`;
      console.log("[helpers][agm][generateVotingDocument]: Going To Create Zip file with name:", zipFileName);
      const uploadedZippedFileDetails = await makeZippedFileOnEFS(basePath, zipFileName);

      console.log("[helpers][agm][generateVotingDocument]: Zip File created successfully, Name:", zipFileName, uploadedZippedFileDetails);

      const s3 = new AWS.S3();

      let s3FileDownloadUrl = await new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', { Bucket: bucketName, Key: zipFileName, Expires: 2 * 60 * 60 }, (err, url) => {
          if (err) reject(err)
          else resolve(url)
        });
      });

      console.log("[helpers][agm][generateVotingDocument]: s3FileDownloadUrl:", s3FileDownloadUrl);
      await redisHelper.setValueWithExpiry(`agm-${agmId}-voting-docs-link`, { s3Url: s3FileDownloadUrl }, 2 * 60 * 60);


      let sender = requestedBy;
      let receiver = requestedBy;

      let orgData = await knex('organisations').where({ id: orgId }).first();

      let notificationPayload = {
        payload: {
          title: 'AGM - Voting Document Generated',
          description: `AGM - Voting Document Generated for AGM: "${data.agmDetails.agmName}"`,
          url: `/admin/agm/agm-details/${data.agmDetails.id}`,
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

      console.error("[helpers][agm][generateVotingDocument]:  Error", err);
      if (err.list && Array.isArray(err.list)) {
        err.list.forEach(item => {
          console.error(`[helpers][agm][generateVotingDocument]: Each Error:`, item.message);
        });
      }
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };

    } finally {

    }

  },

  generateVotingDocumentOnEFSv2: async ({ agmId, data, orgId, requestedBy }) => {

    let browser = null;
    let bucketName = process.env.S3_BUCKET_NAME;
    const mountPathRoot = process.env.MNT_DIR;
    const fs = require('fs-extra');
    const QRCODE = require("qrcode");
    const ejs = require('ejs');
    const path = require('path');

    try {

      console.log('[helpers][agm][generateVotingDocument]: Data:', data);

      // let agmPropertyUnitOwners = await knex('agm_owner_master').where({ agmId: agmId, eligibility: true })
      let agmPropertyUnitOwners = await knex.raw(`SELECT agm_owner_master."ownerGroupNo",json_agg(agm_owner_master."ownerName") as "ownerName",json_agg(agm_owner_master."ownershipRatio") as "ownershipRatio",json_agg(agm_owner_master."unitId") as "unitId",json_agg(agm_owner_master."unitNumber") as "unitNumber",json_agg(agm_owner_master."id") as "id" from agm_owner_master GROUP BY (agm_owner_master."ownerGroupNo")`);
      agmPropertyUnitOwners = agmPropertyUnitOwners.rows
      //Change above query to groupby "ownerGroupNumber" and get other grouped row data as json using func 'json_agg'

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


      const basePath = mountPathRoot + "/AGM/" + agmId + "/VotingDocuments/" + new Date().getTime() + "/";
      console.log("[helpers][agm][generateVotingDocument]: Base Directory (For Docs)....", basePath);

      // First Clean all files from the base directory....
      console.log("[helpers][agm][generateVotingDocument]: Cleaning basepath directory for AGM....", agmId);
      await fs.remove(basePath);
      console.log("[helpers][agm][generateVotingDocument]: basepath Directory cleaned....", basePath);

      //Ensure that directory is created...
      await fs.ensureDir(basePath);
      console.log("[helpers][agm][generateVotingDocument]: basepath Directory Created/Ensured....", basePath);


      // Write Logic to prepare all objects for generating parallely.........
      Parallel.setConcurrency(30);
      let sheetsToPrepare = [];

      // Read HTML Template
      const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.ejs');
      console.log('[helpers][agm][generateVotingDocument]: PDF Template Path:', templatePath);

      await Parallel.each(agmPropertyUnitOwners, async (pd) => {
        console.log("[helpers][agm][generateVotingDocument]: Preparing for Property Owner: ", pd);

        try {

          await Parallel.each(agendas, async (agenda) => {
            console.log("[helpers][agm][generateVotingDocument]: Preparing For Agenda: ", agenda);

            agenda.choices = await Parallel.map(agenda.choices, async (choice) => {
              let qrCodeObj = {
                qrName: 'SM:AGM:VOTING',
                // ownerIds: pd.id,
                ownerGroupNo:pd.ownerGroupNo,
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

            let htmlContents = await ejs.renderFile(templatePath, { agmDetails, agenda, propertyOwner: pd });
            // console.log('[helpers][agm][generateVotingDocument]: htmlContents:', htmlContents);

            // let filename = `agm-${agmId}-pu-${pd.unitId}-agn-${agenda.id}.pdf`;
            // let sanitizedUnitNumber = pd.unitNumber;
            // sanitizedUnitNumber = sanitizedUnitNumber.replace('/', '-'); // check alternative like replaceAll
            // let sanitizedOwnerGroupNumber = pd.ownerGroupNo;
            // sanitizedOwnerGroupNumber = sanitizedOwnerGroupNumber.replace('#','-')
            // let filename = `agm-${agmId}-proj-${pd.projectId}-agenda-${agenda.agendaNo}-unit-${unitNumber}.pdf`;
            let filename = `agm-${agmId}-proj-${pd.projectId}-agenda-${agenda.agendaNo}-ownerGroupNo-${pd.ownerGroupNo}.pdf`;

            const document = {
              html: htmlContents,
              data: {
                agmDetails: data.agmDetails,
                agenda: agenda,
                propertyOwner: pd
              },
              s3BasePath: basePath,
              filename: filename,
            };

            console.log("[helpers][agm][generateVotingDocument]: Prepared Doc for Agenda: ", document);
            sheetsToPrepare.push(document);

          });

        } catch (err) {
          console.error("[helpers][agm][generateVotingDocument]: Inner Loop: Error", err);
          if (err.list && Array.isArray(err.list)) {
            err.list.forEach(item => {
              console.error(`[helpers][agm][generateVotingDocument]: Inner Loop Each Error:`, item);
              for(var it of item.list){
                console.error(`[helpers][agm][generateVotingDocument]: Inner Loop Each Error:`, it.message);
              }
            });
          }
          throw new Error(err);
        }

        console.log("[helpers][agm][generateVotingDocument]: All docs gen for Property Owner: ", pd);
      });


      console.log("[helpers][agm][generateVotingDocument]: Generation Finished. Going to PRiNT");
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
        console.log("[helpers][agm][generateVotingDocument]: Generating Doc for: ", document);
        await createPdfOnEFS(document, agmId, browser);
      });

      console.log("============================== PRiNT DONE ======================================");

      console.log("[helpers][agm][generateVotingDocument]: All PDF documents created successfully. Going to create zip file.. ");

      if (browser !== null) {
        await browser.close();
        browser = null;
      }

      // Write Code to create Zip File...
      await fs.ensureDir(mountPathRoot +  "/AGM/" + agmId + "/zipped-files");
      console.log("[helpers][agm][generateVotingDocument]: ZipFile Directory Created/Ensured....");

      const zipFileName = mountPathRoot +  "/AGM/" + agmId + "/zipped-files/" + `${new Date().getTime()}.zip`;
      console.log("[helpers][agm][generateVotingDocument]: Going To Create Zip file with name:", zipFileName);
      const uploadedZippedFileDetails = await makeZippedFileOnEFS(basePath, zipFileName);

      console.log("[helpers][agm][generateVotingDocument]: Zip File created successfully, Name:", zipFileName, uploadedZippedFileDetails);

      const s3 = new AWS.S3();

      let s3FileDownloadUrl = await new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', { Bucket: bucketName, Key: zipFileName, Expires: 2 * 60 * 60 }, (err, url) => {
          if (err) reject(err)
          else resolve(url)
        });
      });

      console.log("[helpers][agm][generateVotingDocument]: s3FileDownloadUrl:", s3FileDownloadUrl);
      await redisHelper.setValueWithExpiry(`agm-${agmId}-voting-docs-link`, { s3Url: s3FileDownloadUrl }, 2 * 60 * 60);


      let sender = requestedBy;
      let receiver = requestedBy;

      let orgData = await knex('organisations').where({ id: orgId }).first();

      let notificationPayload = {
        payload: {
          title: 'AGM - Voting Document Generated',
          description: `AGM - Voting Document Generated for AGM: "${data.agmDetails.agmName}"`,
          url: `/admin/agm/agm-details/${data.agmDetails.id}`,
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

      console.error("[helpers][agm][generateVotingDocument]:  Error", err);
      if (err.list && Array.isArray(err.list)) {
        err.list.forEach(item => {
          console.error(`[helpers][agm][generateVotingDocument]: Each Error:`, item);

        });
      }
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };

    } finally {

    }

  },


  finalSubmit: async ({ agmId, data, orgId, requestedBy }) => {

    try {

      let agmDetails = await knex("agm_master")
        .leftJoin("companies", "agm_master.companyId", "companies.id")
        .leftJoin(
          "projects",
          "agm_master.projectId",
          "projects.id"
        )
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
        ])
        .where({
          "agm_master.id": agmId,
          "agm_master.orgId": req.orgId,
        })
        .first();

      let agmPropertyUnitOwners = await knex('agm_owner_master').where({ agmId: agmId, eligibility: true });
      console.log('[helpers][agm][finalSubmit]: AGM PU Owners:', agmPropertyUnitOwners);
      console.log('[helpers][agm][finalSubmit]: AGM PU Owners Length:', agmPropertyUnitOwners.length);


      let agendas = await knex('agenda_master').where({ agmId: agmId, eligibleForVoting: true });
      console.log('[helpers][agm][finalSubmit]: agendas:', agendas);

      const Parallel = require("async-parallel");

      agendas = await Parallel.map(agendas, async (ag) => {
        let choices = await knex('agenda_choice').where({ agendaId: ag.id });
        ag.choices = choices;
        return ag;
      });

      console.log('[helpers][agm][finalSubmit]: Agenda with choices:', agendas);
      console.log('[helpers][agm][finalSubmit]: Agenda (Length):', agendas.length);


      Parallel.setConcurrency(20);

      await Parallel.each(agmPropertyUnitOwners, async (pd) => {
        console.log("[helpers][agm][finalSubmit]: For Property Owner: ", pd);

        try {

          await Parallel.each(agendas, async (agenda) => {
            console.log("[helpers][agm][finalSubmit]: Preparing For Agenda: ", agenda);



          });

        } catch (err) {
          console.error("[helpers][agm][finalSubmit]: Inner Loop: Error", err);
          if (err.list && Array.isArray(err.list)) {
            err.list.forEach(item => {
              console.error(`[helpers][agm][finalSubmit]: Inner Loop Each Error:`, item.message);
            });
          }
          throw new Error(err);
        }

        console.log("[helpers][agm][finalSubmit]: All docs gen for Property Owner: ", pd);
      });


      console.log("[helpers][agm][finalSubmit]: Done default voting for all");
      console.log("============================== FNiSHED ======================================");



      // let sender = requestedBy;
      // let receiver = requestedBy;

      // let orgData = await knex('organisations').where({ id: orgId }).first();

      // let notificationPayload = {
      //   payload: {
      //     title: 'AGM - Final Submit Done',
      //     description: `AGM - Finale Submit Finished: "${agmDetails.agmName}"`,
      //     url: s3FileDownloadUrl,
      //     orgData: orgData
      //   }
      // };

      // const votingDocGeneratedNotification = require('../notifications/agm/voting-doc-generated');
      // await votingDocGeneratedNotification.send(
      //   sender,
      //   receiver,
      //   notificationPayload
      // );
      // console.log("[helpers][agm][generateVotingDocument]: Successfull Voting Doc Generated - Annoncement Send to:", receiver.email);

    } catch (err) {

      console.error("[helpers][agm][finalSubmit]:  Error", err);
      if (err.list && Array.isArray(err.list)) {
        err.list.forEach(item => {
          console.error(`[helpers][agm][finalSubmit]: Each Error:`, item.message);
        });
      }
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };

    } finally {

    }

  },

};

module.exports = agmHelper;
