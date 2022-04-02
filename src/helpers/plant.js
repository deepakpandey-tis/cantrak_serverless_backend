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

const createPdf = (document, plantId, browser, retries = 1) => {

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
          await createPdf(document, plantId, browser, retries);
        } else {
          rej(err);
        }
  
      }
  
    });
  
}
  
  
const createPdfOnEFS = (document, plantId, browser, retries = 1) => {
  
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
          await createPdf(document, plantId, browser, retries);
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




const plantsHelper = {
    generatePlantsDocumentOnEFSv2: async ({ plantId, pdfType, data, orgId, requestedBy }) => {

        let browser = null;
        let bucketName = process.env.S3_BUCKET_NAME;
        const mountPathRoot = process.env.MNT_DIR;
        const fs = require('fs-extra');
        const QRCODE = require("qrcode");
        const ejs = require('ejs');
        const path = require('path');
    
        try {
    
            console.log('[helpers][plants][generatePlantsDocumentOnEFSv2]: Data:', data);
    
            // let orgId = orgId;
            let userId = requestedBy.id;

            let payload;
            let sortCol = null;
            let sortOrder = null;

            let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

            // Setting default values, if not passed
            if(!sortCol || sortCol === ''){
                sortCol = `"plantSerial" desc`;
                sortOrder = '';
            }
            
            // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
            sqlSelect = `SELECT pl.*, p.id "plantId", p."plantSerial", p."isActive" "plantIsActive", p."isWaste" "plantIsWaste", p."isDestroy" "plantIsDestroy", p."isEndOfLife" "plantIsEndOfLife"
            , ploc.id "plantLocationId", l.name "plantLocationName", sl.name "plantSubLocationName", pgs."growthStageId" "plantGrowthStageId", pgs."startDate" "plantGrowthStageDate", gs.name "plantGrowthStageName"
            , s.name "strainName", s2.name "specieName"
            `;

            sqlFrom = ` FROM plant_lots pl, plants p, plant_locations ploc, plant_growth_stages pgs, locations l, sub_locations sl, growth_stages gs
            , strains s, species s2
            `;

            sqlWhere = ` WHERE pl.id = ${plantId} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive"`;
            sqlWhere += ` AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."plantId" = p.id order by id desc limit 1)`;
            sqlWhere += ` AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."plantId" = p.id order by id desc limit 1)`;
            sqlWhere += ` AND ploc."locationId" = l.id AND ploc."subLocationId" = sl.id AND pgs."growthStageId" = gs.id`;
            sqlWhere += ` AND pl."strainId" = s.id AND pl."specieId" = s2.id`;

            // if(locationId && locationId != ''){
            //     sqlWhere += ` AND ploc."locationId" = ${locationId}`;
            // }
            // if(subLocationId){
            //     sqlWhere += ` AND ploc."subLocationId" = ${subLocationId}`;
            // }

            // if(plantSerial && plantSerial != ''){
            //     sqlWhere += ` AND p."plantSerial" iLIKE '%${plantSerial}%'`;
            // }

            sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
            //console.log('getLotPlantList sql: ', sqlSelect + sqlFrom + sqlWhere);

            sqlStr  = `WITH Main_CTE AS (`;
            sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
            sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
            sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
            sqlStr += sqlOrderBy;

            //console.log('getLotPlantList: ', sqlStr);
            
            var selectedRecs = await knexReader.raw(sqlStr);
            //console.log('selectedRecs: ', selectedRecs);

            let plantsData = selectedRecs.rows;
    
            const Parallel = require("async-parallel");
    
            console.log('[helpers][plants][generatePlantsDocumentOnEFSv2]: Plants :', plantsData);
            console.log('[helpers][plants][generatePlantsDocumentOnEFSv2]: Plants (Length):', plantsData.length);
        
            // let agmDetails = data.agmDetails;
            // agmDetails.formattedDate = moment(+agmDetails.agmDate).format('LL');
            // console.log('[helpers][plants][generatePlantsDocumentOnEFSv2]: Formatted Date:', agmDetails.formattedDate);
        
        
            const basePath = mountPathRoot + "/Plants/" + plantId + "/PlantsLotDocuments/" + new Date().getTime() + "/";
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Base Directory (For Docs)....", basePath);
        
            // First Clean all files from the base directory....
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Cleaning basepath directory for Plants....", plantId);
            await fs.remove(basePath);
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: basepath Directory cleaned....", basePath);
        
            //Ensure that directory is created...
            await fs.ensureDir(basePath);
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: basepath Directory Created/Ensured....", basePath);
        
        
            // Write Logic to prepare all objects for generating parallely.........
            Parallel.setConcurrency(30);
            let sheetsToPrepare = [];
        
            // Read HTML Template
            const templatePath = path.join(__dirname, '..', 'pdf-templates', 'plants-qr-template.ejs');
            console.log('[helpers][plants][generatePlantsDocumentOnEFSv2]: PDF Template Path:', templatePath);

            try {
                
    
                await Parallel.each(data.plantsLot, async (plantsLot) => {
                    console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Preparing For Plants: ", plantsLot);
        
                    plantsData = await Parallel.map(plantsData, async (plant) => {
                        let qrCodeObj = {
                            qn: 'CT:PLANT:ID',     // For now commenting ownerIds
                            oid: orgId,
                            id: plant.plantId
                        };
                        let qrString = JSON.stringify(qrCodeObj);
                        // console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Qr String: ", qrString);
                        let qrCodeDataURI = await QRCODE.toDataURL(qrString);
                        plant.qrCode = qrCodeDataURI;
                        // console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Qr Generated....");
                        return plant;
                    });

                    let plantsLots = {...plantsLot, plants: plantsData}
        
                    console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: lot pdf data", plantsLots)
        
                    let htmlContents = await ejs.renderFile(templatePath, { moment, plantsLot: plantsLots, pdfType });
        
                    let filename = `plant-${plantId}-lot-${plantsLot.lotNo}.pdf`;
        
                    const document = {
                    html: htmlContents,
                    data: {
                        moment, 
                        plantsLots,
                        pdfType
                    },
                    s3BasePath: basePath,
                    filename: filename,
                    };
        
                    console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Prepared Doc for Plants: ", document);
                    sheetsToPrepare.push(document);
        
                });
    
            } catch (err) {
                console.error("[helpers][plants][generatePlantsDocumentOnEFSv2]: Inner Loop: Error", err);
                if (err.list && Array.isArray(err.list)) {
                    err.list.forEach(item => {
                    console.error(`[helpers][plants][generatePlantsDocumentOnEFSv2]: Inner Loop Each Error:`, item);
                    for (var it of item.list) {
                        console.error(`[helpers][plants][generatePlantsDocumentOnEFSv2]: Inner Loop Each Error:`, it.message);
                    }
                    });
                }
                throw new Error(err);
            }
        
        
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Generation Finished. Going to PRiNT");
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
                console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Generating Doc for: ", document);
                await createPdfOnEFS(document, plantId, browser);
            });
        
            console.log("============================== PRiNT DONE ======================================");
        
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: All PDF documents created successfully. Going to create zip file.. ");
        
            if (browser !== null) {
                await browser.close();
                browser = null;
            }
        
            // Write Code to create Zip File...
            await fs.ensureDir(mountPathRoot + "/PLANT/" + plantId + "/zipped-files");
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: ZipFile Directory Created/Ensured....");
        
            const zipFileName = mountPathRoot + "/PLANT/" + plantId + "/zipped-files/" + `${new Date().getTime()}.zip`;
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Going To Create Zip file with name:", zipFileName);
            const uploadedZippedFileDetails = await makeZippedFileOnEFS(basePath, zipFileName);
        
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Zip File created successfully, Name:", zipFileName, uploadedZippedFileDetails);
        
            const s3 = new AWS.S3();
        
            let s3FileDownloadUrl = await new Promise((resolve, reject) => {
                s3.getSignedUrl('getObject', { Bucket: bucketName, Key: zipFileName, Expires: 2 * 60 * 60 }, (err, url) => {
                if (err) reject(err)
                else resolve(url)
                });
            });
        
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: s3FileDownloadUrl:", s3FileDownloadUrl);
            await redisHelper.setValueWithExpiry(`plant-${plantId}-lot-${data.plantsLot[0].lotNo}-qr-docs-link`, { s3Url: s3FileDownloadUrl, requestedBy, requestedAt: new Date().getTime() }, 2 * 60 * 60);
        
        
            let sender = requestedBy;
            let receiver = requestedBy;
        
            let orgData = await knex('organisations').where({ id: orgId }).first();
        
            let notificationPayload = {
                payload: {
                    title: 'Plants Lot - QR Generated',
                    description: `Plants Lot - QR Generated for Plants: "${data.plantsLot[0].lotNo}"`,
                    url: `/admin/plants/lot-plant-list/${data.plantsLot[0].id}`,
                    orgData: orgData,
                    s3Url: s3FileDownloadUrl,
                    requestedBy,
                    requestedAt: new Date().getTime()
                }
            };
        
            const plantsDocGeneratedNotification = require('../notifications/plants/plants-doc-generated');
            await plantsDocGeneratedNotification.send(
                sender,
                receiver,
                notificationPayload,
                ['IN_APP', 'WEB_PUSH', 'SOCKET_NOTIFY']
            );
            console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Successfull QR Doc Generated - Pdf Send to:", receiver.email);
    
        } catch (err) {
    
          console.error("[helpers][plants][generatePlantsDocumentOnEFSv2]:  Error", err);
          if (err.list && Array.isArray(err.list)) {
            err.list.forEach(item => {
              console.error(`[helpers][plants][generatePlantsDocumentOnEFSv2]: Each Error:`, item);
    
            });
          }
          return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    
        } finally {
    
        }
    
    },
}

module.exports = plantsHelper;