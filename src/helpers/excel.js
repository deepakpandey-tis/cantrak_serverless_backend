const excel = require("exceljs");
const AWS = require("aws-sdk");



const excelHelper = {
    generateExcel: async (header, data, fileName, requestedBy, environment = 'local') => {

        let bucketName = process.env.S3_BUCKET_NAME;
        // const mountPathRoot = process.env.MNT_DIR;
        const mountPathRoot = environment == 'production'? process.env.MNT_DIR :'./tmp';
        const fs = require('fs-extra');


        const basePath = mountPathRoot + "/Excel/";
        console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: Base Directory (For Docs)....", basePath);


        // First Clean all files from the base directory....
        await fs.remove(basePath);
        console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: basepath Directory cleaned....", basePath);
    
        //Ensure that directory is created...
        await fs.ensureDir(basePath);
        console.log("[helpers][plants][generatePlantsDocumentOnEFSv2]: basepath Directory Created/Ensured....", basePath);


        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet(fileName);

        worksheet.columns = header;

        worksheet.addRows(data);
        
        const excelFile = basePath +fileName +'-'+ new Date().getTime() +".xlsx";
        await workbook.xlsx.writeFile(excelFile);


        const s3 = new AWS.S3();
        
        let s3FileDownloadUrl = await new Promise((resolve, reject) => {
            s3.getSignedUrl('getObject', { Bucket: bucketName, Key: excelFile, Expires: 2 * 60 * 60 }, (err, url) => {
            if (err) reject(err)
            else resolve(url)
            });
        });

        return({url: s3FileDownloadUrl, status: true});
    },
}


module.exports = excelHelper;