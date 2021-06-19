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
  region: process.env.REGION || "us-east-1",
});
const s3 = new AWS.S3();

const createPdfOnEFS = (
  document,
  agmId,
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
      if (retries > 5) {
        console.log("Retrying after error:", err);
        await createPdf(document, agmId, browser, retries);
      } else {
        rej(err);
      }
    }
  });
};

const mergedPdf = (folder, pdfFileName) => {



  console.log("[helpers][agm][mergePdfFiles]: folder: ", folder);
  console.log("[helpers][agm][mergePdfFiles]: pdfFileName: ", pdfFileName);
  const path = require("path");



  console.log("[helpers][Parcel][mergePdfFiles]: Going to store in S3 Bucket");

  return new Promise(async (res, rej) => {

    fs.readdirSync(folder).forEach((file) => {
      console.log("[helpers][agm][mergePdfFiles]: Found:", file);
      merger.add(path.join(folder, file));
    });


    await merger.save(`${pdfFileName}`);
    let filename = path.parse(pdfFileName);
    filename = filename.base;
    console.log("[helpers][Parcel][mergePdfFiles]: Parsed File name", filename);

    const fileUrl = await uploadFileToS3(pdfFileName, filename);

    console.log('[helpers][Parcel][mergePdfFiles]:File Uploaded At Url:', fileUrl);


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
          console.log("[helpers][Parcel][mergePdfFiles]: PDF File uploaded Successfully on s3...", fileUrl);
          resolve(fileUrl);
        }
      });
    });

  });

}
const makeZippedFileOnEFS = (folder, zipFileKey) => {
  const fs = require("fs-extra");
  const archiver = require("archiver");
  let bucketName = process.env.S3_BUCKET_NAME;

  console.log(
    "[helpers][agm][makeZippedFileOnEFS]: folder: ",
    folder
  );
  console.log(
    "[helpers][agm][makeZippedFileOnEFS]: zipFileKey: ",
    zipFileKey
  );

  console.log(
    "[helpers][agm][makeZippedFileOnEFS]: Lisiting ALL FILES: "
  );

  fs.readdirSync(folder).forEach((file) => {
    console.log(
      "[helpers][agm][makeZippedFileOnEFS]: Found:",
      file
    );
  });

  return new Promise(async (res, rej) => {
    const output = fs.createWriteStream(zipFileKey);
    const archive = archiver("zip");

    output.on("close", async () => {
      console.log(archive.pointer() + " total bytes");
      console.log(
        "[helpers][agm][makeZippedFileOnEFS]: archiver has been finalized and the output file descriptor has closed."
      );

      const fileContent = fs.readFileSync(zipFileKey);
      console.log(
        "[helpers][agm][makeZippedFileOnEFS]: Zipped File Content Read Successfully for uploading to s3.",
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
        "[helpers][agm][makeZippedFileOnEFS]: Zip File uploaded Successfully on s3...",
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
          parcelDetail: data.parcelDetail,
          receiverData: data.receiverData,
          senderData: data.senderData,
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

  generateParcelSlipDocumentOnEFSv2: async ({
    requestId,
    data,
    orgId,
    requestedBy,
  }) => {
    let browser = null;
    let bucketName = process.env.S3_BUCKET_NAME;
    const mountPathRoot = process.env.MNT_DIR;
    const fs = require("fs-extra");
    const QRCODE = require("qrcode");
    const ejs = require("ejs");
    const path = require("path");

    //const requestId = uuid();

    try {
      console.log(
        "[helpers][parcel][generatePendingParcel]: Data:",
        data
      );

      const Parallel = require("async-parallel");

      let parcelData = data.parcelList;
      //let orgId = data.orgId;

      const basePath =
        mountPathRoot +
        "/PARCEL/" +
        requestId +
        "/PendingListDocuments/" +
        new Date().getTime() +
        "/";
      console.log(
        "[helpers][parcel][generatePendingParcel]: Base Directory (For Docs)....",
        basePath
      );

      // First Clean all files from the base directory....
      console.log(
        "[helpers][parcel][generatePendingParcel]: Cleaning basepath directory for AGM....",
        requestId
      );
      await fs.remove(basePath);
      console.log(
        "[helpers][parcel][generatePendingParcel]: basepath Directory cleaned....",
        basePath
      );

      //Ensure that directory is created...
      await fs.ensureDir(basePath);
      console.log(
        "[helpers][parcel][generatePendingParcel]: basepath Directory Created/Ensured....",
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
        "parcel-template.ejs"
      );
      console.log(
        "[helpers][parcel][generatePendingParcel]: PDF Template Path:",
        templatePath
      );

      let pData = [];
      let pId = [];
      let index = 0;
      parcelData = await Parallel.map(
        parcelData,
        async (data) => {
          try {
            if (pData.length < 8) {
              let qrString = JSON.stringify(
                `org~${data.orgId}~unitNumber~${data.unitNumber}~parcel~${data.id}`
              );
              // console.log("[helpers][parcel][generatePendingParcel]: Qr String: ", qrString);
              let qrCodeDataURI = await QRCODE.toDataURL(
                qrString
              );
              data.qrCode = qrCodeDataURI;
              data.createdAt = moment(
                +data.createdAt
              ).format("MMMM DD, yyyy, hh:mm:ss A");

              pData.push(data);
              pId.push(data.id);
            }
            else {
              pData = [];
              pId = [];

              let qrString = JSON.stringify(
                `org~${data.orgId}~unitNumber~${data.unitNumber}~parcel~${data.id}`
              );
              let qrCodeDataURI = await QRCODE.toDataURL(
                qrString
              );
              data.qrCode = qrCodeDataURI;
              data.createdAt = moment(
                +data.createdAt
              ).format("MMMM DD, yyyy, hh:mm:ss A");

              pData.push(data);
            }

            if (
              pData.length == 8
            ) {
              console.log("parcelData", pData);

              let htmlContents = await ejs.renderFile(
                templatePath,
                { data: pData }
              );
              console.log(
                "[helpers][parcel][generatePendingParcel]: htmlContents:",
                htmlContents
              );

              let filename = `pending-parcel-list-${pId.join(
                ","
              )}.pdf`;

              const document = {
                html: htmlContents,
                data: {
                  parcelData: pData,
                },
                s3BasePath: basePath,
                filename: filename,
              };

              console.log(
                "[helpers][parcel][generatePendingParcel]: Prepared Doc for Parcel: ",
                document
              );
              sheetsToPrepare.push(document);
              let pData = [];
              let pId = [];

            } else if (!parcelData[index + 1]) {
              let htmlContents = await ejs.renderFile(
                templatePath,
                { data: pData }
              );
              console.log(
                "[helpers][parcel][generatePendingParcel]: htmlContents:",
                htmlContents
              );

              let filename = `pending-parcel-list-${pId.join(
                ","
              )}.pdf`;

              const document = {
                html: htmlContents,
                data: {
                  parcelData: pData,
                },
                s3BasePath: basePath,
                filename: filename,
              };

              console.log(
                "[helpers][parcel][generatePendingParcel]: Prepared Doc for Parcel: ",
                document
              );
              sheetsToPrepare.push(document);
            }

            index++;
          } catch (err) {
            console.error(
              "[helpers][parcel][generatePdf]: Inner Loop: Error",
              err
            );
            if (err.list && Array.isArray(err.list)) {
              err.list.forEach((item) => {
                console.error(
                  `[helpers][parcel][generatePdf]: Inner Loop Each Error:`,
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
        "[helpers][parcel][generatePendingParcel]: Generation Finished. Going to PRiNT"
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
            "[helpers][parcel][generatePendingParcel]: Generating Doc for: ",
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
        "[helpers][parcel][generatePendingParcel]: All PDF documents created successfully. Going to create zip file.. "
      );

      if (browser !== null) {
        await browser.close();
        browser = null;
      }

      // Write Code to create Zip File...
      const mergePdfDir = path.join(mountPathRoot, 'PARCEL', `${requestId}`, 'merged-files');
      await fs.ensureDir(mergePdfDir);
      console.log("[helpers][parcel][generatePendingParcel]: ZipFile Directory Created/Ensured....");

      const mergedPdfName = path.join(mergePdfDir, `${new Date().getTime()}.pdf`);
      const { fileUrl, fileName } = await mergedPdf(basePath, mergedPdfName);
      console.log("[helpers][parcel][generatePendingParcel]: merged File created successfully, Url/Name:", fileUrl, fileName);


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

      console.log("[helpers][parcel][generatePendingParcel]: s3FileDownloadUrl:", s3FileDownloadUrl);

      let parcelSlipDocGeneratedList = await redisHelper.getValue(`parcel-docs-link`);
      if (parcelSlipDocGeneratedList) {
        parcelSlipDocGeneratedList.map((e) => {
          let s3Url = e.s3Url;
          if (e.requestId) {
            s3Url = s3FileDownloadUrl;
          }
          e.s3Url = s3Url;
        });
        //parcelSlipDocGeneratedList.push({ requestId: requestId, generatedBy: requestedBy, orgId: orgId, s3Url: s3FileDownloadUrl, generatedAt: moment().format("MMMM DD, yyyy, hh:mm:ss A") });
        await redisHelper.setValueWithExpiry(`parcel-docs-link`, parcelSlipDocGeneratedList, 24 * 60 * 60);
      } else {
        await redisHelper.setValueWithExpiry(`parcel-docs-link`,
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
          title: "PARCEL - Pending Slip Document Generated",
          description: `PARCEL - Pending Slip Document Generated`,
          url: `/admin/parcel-management/manage-parcel?tab=parcel_slip`,
          orgData: orgData,
        },
      };

      const parcelSlipDocGeneratedNotification = require("../notifications/parcel/parcel-slip-doc-generated");
      await parcelSlipDocGeneratedNotification.send(
        sender,
        receiver,
        notificationPayload,
        ["IN_APP"]
      );
      console.log(
        "[helpers][parcel][generatePendingParcel]: Successfull Parcel List Doc Generated - Annoncement Send to:",
        receiver.email
      );
    } catch (err) {
      console.error(
        "[helpers][parcel][generatePendingParcel]:  Error",
        err
      );
      if (err.list && Array.isArray(err.list)) {
        err.list.forEach((item) => {
          console.error(
            `[helpers][parcel][generatePendingParcel]: Each Error:`,
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

module.exports = parcelHelper;
