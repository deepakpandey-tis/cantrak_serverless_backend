const _ = require("lodash");
const AWS = require("aws-sdk");
const chromium = require('chrome-aws-lambda');

const knex = require("../db/knex");
const knexReader = require('../db/knex-reader');

const redisHelper = require('../helpers/redis');

const moment = require("moment-timezone");
const timezone = 'Asia/Bangkok';
moment.tz.setDefault(timezone);


AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "ap-southeast-1",
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

const createPdf = (document, packingLotId, browser, retries = 1) => {

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
          await createPdf(document, packingLotId, browser, retries);
        } else {
          rej(err);
        }
  
      }
  
    });
  
}
  
  
const createPdfOnEFS = (document, packingLotId, browser, retries = 1) => {
  
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
          await createPdf(document, packingLotId, browser, retries);
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


const packingQRCodeHelper = {
    generatePackingQRCodeDocumentOnEFSv2: async ({ packingLotId, pdfType, data, orgId, requestedBy }) => {

        let browser = null;
        let bucketName = process.env.S3_BUCKET_NAME;
        const mountPathRoot = process.env.MNT_DIR;
        const fs = require('fs-extra');
        const QRCODE = require("qrcode");
        const ejs = require('ejs');
        const path = require('path');
    
        try {
    
            console.log('[helpers][generatePackingQRCodeDocumentOnEFSv2]: Data:', data);
    
            // let orgId = orgId;
            let userId = requestedBy.id;

            //  if required, execute sql to get extra data
    
            const Parallel = require("async-parallel");

            const basePath = mountPathRoot + "/Packing/" + packingLotId + "/PackingLotDocuments/" + new Date().getTime() + "/";
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Base Directory (For Docs)....", basePath);
        
            // First Clean all files from the base directory....
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Cleaning basepath directory for Packing Lot Id....", packingLotId);
            await fs.remove(basePath);
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: basepath Directory cleaned....", basePath);
        
            //Ensure that directory is created...
            await fs.ensureDir(basePath);
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: basepath Directory Created/Ensured....", basePath);
        
        
            // Write Logic to prepare all objects for generating parallely.........
            Parallel.setConcurrency(30);
            let sheetsToPrepare = [];
        
            // Read HTML Template
            const templatePath = path.join(__dirname, '..', 'pdf-templates', 'packing-qr-template.ejs');
            console.log('[helpers][generatePackingQRCodeDocumentOnEFSv2]: PDF Template Path:', templatePath);

            try {
    
                let packedItemsWithQrCode = [];
                let recs = [];
                selectedRecs.rows.map(packedItem => {
                    for(let ndx = 1; ndx <= packedItem.quantity; ndx++){
                        let qrCodeObj = {
                            qn: 'CT:PACK:ID',
                            oid: orgId,
                            cid: packedItem.companyId,
                            id: packedItem.id + "-" + packedItem.itemId + "-" + String(ndx).padStart(3, '0')    //  PackingLotId + ItemId + RunningNumber
                        };
        
                        recs.push(Object.assign({}, packedItem, {bagSerial: packedItem.packingLotNo + '-' + packedItem.itemId + '-' + String(ndx).padStart(3, '0'), qrCodeString: JSON.stringify(qrCodeObj)}));
                    }
                });
                console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Packed Items: ", recs);
        
                packedItemsWithQrCode = await Parallel.map(recs, async (rec) => {
        
                    let qrCodeDataURI = await QRCODE.toDataURL(rec.qrCodeString);
                    let packedItemWithQrCode = {...rec, qrCode: qrCodeDataURI};
        
                    return packedItemWithQrCode;
                });
                console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: packed items pdf data: ", packedItemsWithQrCode);
                            
                let htmlContents = await ejs.renderFile(templatePath, { moment, packedItems: packedItemsWithQrCode, pdfType });
        
                let filename = `packing-${packingLotId}-lot-${packedItemsWithQrCode[0].packingLotNo}.pdf`;
    
                const document = {
                html: htmlContents,
                data: {
                    moment, 
                    packedItems,
                    pdfType
                },
                s3BasePath: basePath,
                filename: filename,
                };
    
                console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Prepared Doc for Packing Lot: ", document);
                sheetsToPrepare.push(document);

            } catch (err) {
                console.error("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Inner Loop: Error", err);
                if (err.list && Array.isArray(err.list)) {
                    err.list.forEach(item => {
                    console.error(`[helpers][generatePackingQRCodeDocumentOnEFSv2]: Inner Loop Each Error:`, item);
                    for (var it of item.list) {
                        console.error(`[helpers][generatePackingQRCodeDocumentOnEFSv2]: Inner Loop Each Error:`, it.message);
                    }
                    });
                }
                throw new Error(err);
            }
        
        
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Generation Finished. Going to PRiNT");
            console.log("============================== PRiNT ======================================");
        
        
            // await chromium.font('https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf');
            await chromium.font('https://servicemind-resources-staging.s3.ap-southeast-1.amazonaws.com/fonts/TAHOMA.otf')
            browser = await chromium.puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath,
                headless: chromium.headless,
            });
        
            Parallel.setConcurrency(5);
            await Parallel.each(sheetsToPrepare, async (document) => {
                console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Generating Doc for: ", document);
                await createPdfOnEFS(document, packingLotId, browser);
            });
        
            console.log("============================== PRiNT DONE ======================================");
        
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: All PDF documents created successfully. Going to create zip file.. ");
        
            if (browser !== null) {
                await browser.close();
                browser = null;
            }
        
            // Write Code to create Zip File...
            await fs.ensureDir(mountPathRoot + "/Packing/" + packingLotId + "/zipped-files");
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: ZipFile Directory Created/Ensured....");
        
            const zipFileName = mountPathRoot + "/Packing/" + packingLotId + "/zipped-files/" + `${new Date().getTime()}.zip`;
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Going To Create Zip file with name:", zipFileName);
            const uploadedZippedFileDetails = await makeZippedFileOnEFS(basePath, zipFileName);
        
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Zip File created successfully, Name:", zipFileName, uploadedZippedFileDetails);
        
            const s3 = new AWS.S3();
        
            let s3FileDownloadUrl = await new Promise((resolve, reject) => {
                s3.getSignedUrl('getObject', { Bucket: bucketName, Key: zipFileName, Expires: 2 * 60 * 60 }, (err, url) => {
                if (err) reject(err)
                else resolve(url)
                });
            });
        
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: s3FileDownloadUrl:", s3FileDownloadUrl);
            await redisHelper.setValueWithExpiry(`packing-${packingLotId}-lot-${data.packedItems[0].packingLotNo}-qr-docs-link`, { s3Url: s3FileDownloadUrl, requestedBy, requestedAt: new Date().getTime() }, 2 * 60 * 60);
        
        
            let sender = requestedBy;
            let receiver = requestedBy;
        
            let orgData = await knex('organisations').where({ id: orgId }).first();
        
            let notificationPayload = {
                payload: {
                    title: 'Packing Lot - QR Generated',
                    description: `Packing Lot - QR Generated for Lot No.: "${data.packedItems[0].packingLotNo}"`,
                    url: `/admin/packing/packing-detail/${data.packedItems[0].id}`,
                    orgData: orgData,
                    s3Url: s3FileDownloadUrl,
                    requestedBy,
                    requestedAt: new Date().getTime()
                }
            };
        
            const packingDocGeneratedNotification = require('../notifications/packing/packing-qr-doc-generated');
            await packingDocGeneratedNotification.send(
                sender,
                receiver,
                notificationPayload,
                ['IN_APP', 'WEB_PUSH', 'SOCKET_NOTIFY']
            );
            console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Successfull QR Doc Generated - Pdf Send to:", receiver.email);
    
        } catch (err) {
    
          console.error("[helpers][generatePackingQRCodeDocumentOnEFSv2]:  Error", err);
          if (err.list && Array.isArray(err.list)) {
            err.list.forEach(item => {
              console.error(`[helpers][generatePackingQRCodeDocumentOnEFSv2]: Each Error:`, item);
    
            });
          }
          return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    
        } finally {
    
        }
    
    },
}

module.exports = packingQRCodeHelper;