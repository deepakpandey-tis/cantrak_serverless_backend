const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");
const chromium = require("chrome-aws-lambda");
const uuid = require("uuid/v4");
const PDFMerger = require("pdf-merger-js");
const merger = new PDFMerger();
const path = require("path");
const fs = require("fs-extra");

const redisHelper = require("../helpers/redis");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "ap-southeast-1",
});
const s3 = new AWS.S3();

const createPdfOnEFS = (
  document,
  requestId,
  browser,
  retries = 1
) => {
  return new Promise(async (res, rej) => {
    try {
      console.log(
        "Retries/ HTML To PRINT:",
        retries,
        document.html
      );

      const page = await browser.newPage();
      await page.setContent(document.html, {
        waitUntil: [
          "load",
          "domcontentloaded",
          "networkidle0",
        ],
      });

      const pdf = await page.pdf({
        path: document.s3BasePath + document.filename,
        format: "A4",
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: "1cm",
          right: "1cm",
          bottom: "1cm",
          left: "1cm",
        },
      });

      if (!pdf) {
        console.log("Unable to generate PDF...");
        rej(new Error("Unable to generate PDF..."));
      } else {
        console.log(
          "PDF generated, with filename:",
          document.s3BasePath + document.filename
        );
        await page.close();
        res(true);
      }
    } catch (err) {
      // rej(err);  // don't reject ... add a retry...

      if (!browser || wasBrowserKilled(browser)) {
        await chromium.font(
          "https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf"
        );
        browser = await chromium.puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
        });
      }

      retries++;
      // gfx: Org line if (retries > 5) {
      // gfx: retry up to 5 times
      if (retries <= 5) {
        console.log("Retrying after error:", err);
        await createPdf(document, requestId, browser, retries);
      } else {
        rej(err);
      }
    }
  });
};

const mergedPdf = (folder, pdfFileName) => {



  console.log("[helpers][plant-qrcode][mergePdfFiles]: folder: ", folder);
  console.log("[helpers][plant-qrcode][mergePdfFiles]: pdfFileName: ", pdfFileName);
  const path = require("path");



  console.log("[helpers][plant-qrcode][mergePdfFiles]: Going to store in S3 Bucket");

  return new Promise(async (res, rej) => {

    fs.readdirSync(folder).forEach((file) => {
      console.log("[helpers][plant-qrcode][mergePdfFiles]: Found:", file);
      merger.add(path.join(folder, file));
    });


    await merger.save(`${pdfFileName}`);
    let filename = path.parse(pdfFileName);
    filename = filename.base;
    console.log("[helpers][plant-qrcode][mergePdfFiles]: Parsed File name", filename);

    const fileUrl = await uploadFileToS3(pdfFileName, filename);

    console.log('[helpers][plant-qrcode][mergePdfFiles]:File Uploaded At Url:', fileUrl);


    res({ fileUrl, fileName: filename });

  });
};

const uploadFileToS3 = async (filePath, s3Path) => {

  let bucketName = process.env.S3_BUCKET_NAME;
  return new Promise((resolve, reject) => {

    fs.readFile(filePath, (err, file_buffer) => {
      let params = {
        Bucket: bucketName,
        Key: s3Path,
        Body: file_buffer,
        ACL: "public-read",
      };

      s3.putObject(params, (err, data) => {
        if (err) {
          console.log("Error at uploadPDFFileOnS3Bucket function", err);
          reject(err);
        } else {
          let fileUrl = process.env.S3_BUCKET_URL + s3Path;
          console.log("[helpers][plant-qrcode][mergePdfFiles]: PDF File uploaded Successfully on s3...", fileUrl);
          resolve(fileUrl);
        }
      });
    });

  });

};

const makeZippedFileOnEFS = (folder, zipFileKey) => {
  const fs = require("fs-extra");
  const archiver = require("archiver");
  let bucketName = process.env.S3_BUCKET_NAME;

  console.log(
    "[helpers][plant-qrcode][makeZippedFileOnEFS]: folder: ",
    folder
  );
  console.log(
    "[helpers][plant-qrcode][makeZippedFileOnEFS]: zipFileKey: ",
    zipFileKey
  );

  console.log(
    "[helpers][plant-qrcode][makeZippedFileOnEFS]: Lisiting ALL FILES: "
  );

  fs.readdirSync(folder).forEach((file) => {
    console.log(
      "[helpers][plant-qrcode][makeZippedFileOnEFS]: Found:",
      file
    );
  });

  return new Promise(async (res, rej) => {
    const output = fs.createWriteStream(zipFileKey);
    const archive = archiver("zip");

    output.on("close", async () => {
      console.log(archive.pointer() + " total bytes");
      console.log(
        "[helpers][plant-qrcode][makeZippedFileOnEFS]: archiver has been finalized and the output file descriptor has closed."
      );

      const fileContent = fs.readFileSync(zipFileKey);
      console.log(
        "[helpers][plant-qrcode][makeZippedFileOnEFS]: Zipped File Content Read Successfully for uploading to s3.",
        fileContent
      );


      const params = {
        Bucket: bucketName,
        Key: zipFileKey,
        Body: fileContent,
        ACL: "public-read",
      };
      let s3Res = await s3.putObject(params).promise();
      console.log(
        "[helpers][plant-qrcode][makeZippedFileOnEFS]: Zip File uploaded Successfully on s3...",
        s3Res
      );

      res(true);
    });

    archive.on("error", (err) => {
      rej(err);
    });

    archive.pipe(output);

    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(folder, false);
    archive.finalize();
  });
};

const plantQRCodeHelper = {
  plantSNSNotification: async ({
    orgId,
    module,
    data,
    receiver,
  }) => {
    try {
      console.log(
        "[plant-qrcode][SNS][NOTIFICATION]",
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
          plantQRCodeDetail: data.plantQRCodeDetail,
        },
      };

      await snsHelper.sendSNSMessage(
        message,
        "THIRDPARTY_NOTIFICATIONS"
      );
    } catch (err) {
      return { failed: true, error: err };
    }
  },

  generatePlantQRCodeDocumentOnEFSv2: async ({
    requestId,
    data,
    orgId,
    plantQRCodeKey,
    requestedBy,
  }) => {
    let browser = null;
    let bucketName = process.env.S3_BUCKET_NAME;
    const mountPathRoot = process.env.MNT_DIR;
    const fs = require("fs-extra");
    const QRCODE = require("qrcode");
    const ejs = require("ejs");
    const path = require("path");

    const timezone = "Asia/Bangkok";
    moment.tz.setDefault(timezone);
    //const requestId = uuid();

    try {
      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Data:",
        data
      );

      const Parallel = require("async-parallel");

      let plantData = data.plantList;
      //let orgId = data.orgId;

      const basePath =
        mountPathRoot +
        "/PLANT/" +
        requestId +
        "/PlantQRCodeListDocuments/" +
        new Date().getTime() +
        "/";
      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Base Directory (For Docs)....",
        basePath
      );

      // First Clean all files from the base directory....
      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Cleaning basepath directory for Plant....",
        requestId
      );
      await fs.remove(basePath);
      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: basepath Directory cleaned....",
        basePath
      );

      //Ensure that directory is created...
      await fs.ensureDir(basePath);
      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: basepath Directory Created/Ensured....",
        basePath
      );

      // Write Logic to prepare all objects for generating parallely.........
      Parallel.setConcurrency(30);
      let sheetsToPrepare = [];

      // Read HTML Template
      const templatePath = path.join(
        __dirname,
        "..",
        "pdf-templates",
        "plant-qrcode-template.ejs"
      );
      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: PDF Template Path:",
        templatePath
      );

      let pData = [];
      let pId = [];
      let index = 0;
      plantData = await Parallel.map(
        plantData,
        async (data) => {
          try {
            if (pData.length < 8) {

                let qrCodeObj = {
                    qrName: QrCodeName,
                    orgId: pData.orgId,
                    plantId: pData.id
                };
                let qrString = JSON.stringify(qrCodeObj);
                // console.log("[helpers][plant-qrcode][generatePlantQRCodeDocument]: Qr String: ", qrString);
                let qrCodeDataURI = await QRCODE.toDataURL(
                qrString
                );
                data.qrCode = qrCodeDataURI;
                data.plantedOn = moment(
                +data.plantedOn
                ).format("d MMM yyyy");

                pData.push(data);
                pId.push(data.plantSerial);
            } else {
                pData = [];
                pId = [];

                let qrCodeObj = {
                    qrName: QrCodeName,
                    orgId: pData.orgId,
                    plantId: pData.id
                };
                let qrString = JSON.stringify(qrCodeObj);
                // console.log("[helpers][plant-qrcode][generatePlantQRCodeDocument]: Qr String: ", qrString);
                let qrCodeDataURI = await QRCODE.toDataURL(
                qrString
                );
                data.qrCode = qrCodeDataURI;
                data.plantedOn = moment(
                +data.plantedOn
                ).format("d MMM yyyy");

                pData.push(data);
                pId.push(data.plantSerial);

            }

            if (
              pData.length == 8
            ) {
              console.log("plantData", pData);

              let htmlContents = await ejs.renderFile(
                templatePath,
                { data: pData }
              );
              console.log(
                "[helpers][plant-qrcode][generatePlantQRCodeDocument]: htmlContents:",
                htmlContents
              );

              let filename = `plant-qrcode-list-${pId.join(
                ","
              )}.pdf`;

              const document = {
                html: htmlContents,
                data: {
                  plantData: pData,
                },
                s3BasePath: basePath,
                filename: filename,
              };

              console.log(
                "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Prepared Doc for Plant: ",
                document
              );
              sheetsToPrepare.push(document);
              pData = [];
              pId = [];
            } else if (!plantData[index + 1]) {
              let htmlContents = await ejs.renderFile(
                templatePath,
                { data: pData }
              );
              console.log(
                "[helpers][plant-qrcode][generatePlantQRCodeDocument]: htmlContents:",
                htmlContents
              );

              let filename = `plant-qrcode-list-${pId.join(
                ","
              )}.pdf`;

              const document = {
                html: htmlContents,
                data: {
                  plantData: pData,
                },
                s3BasePath: basePath,
                filename: filename,
              };

              console.log(
                "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Prepared Doc for Plant: ",
                document
              );
              sheetsToPrepare.push(document);
              pData = [];
              pId = [];
            }

            index++;
          } catch (err) {
            console.error(
              "[helpers][plant-qrcode][generatePdf]: Inner Loop: Error",
              err
            );
            if (err.list && Array.isArray(err.list)) {
              err.list.forEach((item) => {
                console.error(
                  `[helpers][plant-qrcode][generatePdf]: Inner Loop Each Error:`,
                  item.message
                );
              });
            }
            throw new Error(err);
          }
          return data;
        }
      );

      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Generation Finished. Going to PRiNT"
      );
      console.log(
        "============================== PRiNT ======================================"
      );

      await chromium.font(
        "https://servicemind-resources-dev.s3.amazonaws.com/fonts/Pattaya-Regular.otf"
      );
      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });

      Parallel.setConcurrency(5);
      await Parallel.each(
        sheetsToPrepare,
        async (document) => {
          console.log(
            "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Generating Doc for: ",
            document
          );
          await createPdfOnEFS(
            document,
            requestId,
            browser
          );
        }
      );

      console.log(
        "============================== PRiNT DONE ======================================"
      );

      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: All PDF documents created successfully. Going to create zip file.. "
      );

      if (browser !== null) {
        await browser.close();
        browser = null;
      }

      // Write Code to create Zip File...
      const mergePdfDir = path.join(mountPathRoot, 'PLANT', `${requestId}`, 'merged-files');
      await fs.ensureDir(mergePdfDir);
      console.log("[helpers][plant-qrcode][generatePlantQRCodeDocument]: ZipFile Directory Created/Ensured....");

      const mergedPdfName = path.join(mergePdfDir, `${new Date().getTime()}.pdf`);
      const { fileUrl, fileName } = await mergedPdf(basePath, mergedPdfName);
      console.log("[helpers][plant-qrcode][generatePlantQRCodeDocument]: merged File created successfully, Url/Name:", fileUrl, fileName);


      let s3FileDownloadUrl = await new Promise(
        (resolve, reject) => {
          s3.getSignedUrl(
            "getObject",
            {
              Bucket: bucketName,
              Key: fileName,
              Expires: 24 * 60 * 60,
            },
            (err, url) => {
              if (err) reject(err);
              else resolve(url);
            }
          );
        }
      );

      console.log("[helpers][plant-qrcode][generatePlantQRCodeDocument]: s3FileDownloadUrl:", s3FileDownloadUrl);

      let docGeneratedList = await redisHelper.getValue(plantQRCodeKey);
      if (docGeneratedList) {
        docGeneratedList.map((e) => {
          let s3Url = e.s3Url;
          if (e.requestId) {
            s3Url = s3FileDownloadUrl;
          }
          e.s3Url = s3Url;
        });

        await redisHelper.setValueWithExpiry(plantQRCodeKey, docGeneratedList, 24 * 60 * 60);
      } else {


        await redisHelper.setValueWithExpiry(plantQRCodeKey,
          [
            {
              requestId: requestId,
              generatedBy: requestedBy,
              orgId: orgId,
              s3Url: s3FileDownloadUrl,
              generatedAt: moment().format("MMMM DD, yyyy, hh:mm:ss A"),
            },
          ],
          24 * 60 * 60
        );
      }

      let sender = requestedBy;
      let receiver = requestedBy;

      let orgData = await knex("organisations")
        .where({ id: orgId })
        .first();

      let notificationPayload = {
        payload: {
          title: "Plant - Plant QRCode Document Generated",
          description: `Plant - Plant QRCode Document Generated`,
          url: `/admin/plants`,
          orgData: orgData,
        },
      };

      const plantQRCodeDocGeneratedNotification = require("../notifications/Plant/plant-qrcode-doc-generated");
      await plantQRCodeDocGeneratedNotification.send(
        sender,
        receiver,
        notificationPayload,
        ["IN_APP"]
      );
      console.log(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]: Successfull Plant List Doc Generated - Announcement Send to:",
        receiver.email
      );
    } catch (err) {
      console.error(
        "[helpers][plant-qrcode][generatePlantQRCodeDocument]:  Error",
        err
      );
      if (err.list && Array.isArray(err.list)) {
        err.list.forEach((item) => {
          console.error(
            `[helpers][plant-qrcode][generatePlantQRCodeDocument]: Each Error:`,
            item.message
          );
        });
      }
      return {
        code: "UNKNOWN_ERROR",
        message: err.message,
        error: err,
      };
    } finally {
    }
  },
};

module.exports = plantQRCodeHelper;
