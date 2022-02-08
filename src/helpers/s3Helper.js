const AWS = require('aws-sdk');
const fs = require('fs');


const s3Uploader = {
    uploadLocalFile: (localFilePath, destinationFilePath) => {

        const bucketName = process.env.S3_BUCKET_NAME;
        console.log("[helpers][s3Helper][uploadLocalFile]: Bucket Name :", bucketName);

        const s3 = new AWS.S3();

        return new Promise(async (resolve, reject) => {

            try {
                const uploadBuffer = fs.readFileSync(localFilePath);

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
    },

    getSignedUrl: (s3FilePath, expiryTime = (8 * 60 * 60)) =>{
        const bucketName = process.env.S3_BUCKET_NAME;
        console.log("[helpers][s3Helper][getSignedUrl]: Bucket Name :", bucketName);

        const s3 = new AWS.S3();

        return new Promise((resolve, reject) => {
            s3.getSignedUrl('getObject', { Bucket: bucketName, Key: s3FilePath, Expires: expiryTime }, (err, url) => {
            if (err) reject(err)
            else resolve(url)
            });
        });
    }
}



module.exports = s3Uploader;