const excel = require("exceljs");
const AWS = require("aws-sdk");



const excelHelper = {
    generateExcel: async (header, data, fileName, requestedBy) => {
        const environment = process.env.ENV;
        console.log("=== environment ===",environment);

        let bucketName = process.env.S3_BUCKET_NAME;
        // const mountPathRoot = process.env.MNT_DIR;
        const mountPathRoot = environment != 'dev'? '/tmp' :'./tmp';
        const fs = require('fs-extra');


        const basePath = mountPathRoot + "/exports/excel/";
        console.log("[helpers][excel][generateExcel]: Base Directory (For Docs)....", basePath);


        //Ensure that directory is created...
        await fs.ensureDir(basePath);
        console.log("[helpers][excel][generateExcel]: basepath Directory Created/Ensured....", basePath);


        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet(fileName);

        worksheet.columns = header;

        worksheet.addRows(data);
        worksheet.getRow(1).font = {
            bold: true
        }
        const newFileName = fileName +'-'+ new Date().getTime() +".xlsx";
        const excelFile = basePath + newFileName;
        await workbook.xlsx.writeFile(excelFile);


        const s3Helper = require('./s3Helper');
        const s3FilePath = 'exports/excel/' + newFileName;

        await s3Helper.uploadLocalFile(excelFile, s3FilePath);
        
        let s3FileDownloadUrl = await s3Helper.getSignedUrl(s3FilePath);

        return({url: s3FileDownloadUrl, status: true});
    },
}


module.exports = excelHelper;