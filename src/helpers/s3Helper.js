const AWS = require('aws-sdk');
const fs = require('fs');


const s3Uploader = {
    uploadLocalFile: (localFilePath, destinationFilePath) => {

        const bucketName = process.env.S3_BUCKET_NAME;
        console.log("[helpers][s3Helper][uploadLocalFile]: Bucket Name :", bucketName);

        const s3 = new AWS.S3();

        return new Promise(async (resolve, reject) => {

            try {
                const uploadBuffer = fs.readFileSync(localFilePath, 'utf8');

                const params = {
                    Bucket: bucketName,
                    Key: destinationFilePath,
                    Body: uploadBuffer,
                    ACL: "public-read"
                };

                let s3Res = await s3.putObject(params).promise();
                console.log("[helpers][s3Helper][uploadLocalFile]: File uploaded Successfully on s3...", s3Res);
                resolve(s3Res);
            } catch (err) {
                reject(err);
            }
        });
    },

    downloadFileToLocal: (s3FilePath, localFilePath) => {

        const bucketName = process.env.S3_BUCKET_NAME;
        console.log("[helpers][s3Helper][downloadFileToLocal]: Bucket Name :", bucketName);

        const s3 = new AWS.S3();

        return new Promise(async (resolve, reject) => {

            try {

                const params = {
                    Bucket: bucketName,
                    Key: s3FilePath,
                };

                const s3 = new AWS.S3({
                    'signatureVersion': 'v4'
                });

                const f = await s3.getObject(params).promise();
                fs.writeFileSync(localFilePath, f.Body);
                console.log("[helpers][s3Helper][downloadFileToLocal]: File Downloaded & Saved Locally:", localFilePath);
                resolve(localFilePath);

            } catch (err) {
                reject(err);
            }
        });
    }
}



module.exports = s3Uploader;