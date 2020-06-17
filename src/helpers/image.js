const _ = require('lodash');
const knex = require('../db/knex');
const uuidv4 = require('uuid/v4');
const AWS = require("aws-sdk");

AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION || "us-east-1"
});

const imageHelper = {

    getUploadURL: async (mimeType, fileName, type = "") => {

        let re = /(?:\.([^.]+))?$/;
        let ext = re.exec(fileName)[1];
        let uploadFolder = type + "/";
        const actionId = uuidv4();
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${uploadFolder}${actionId}.${ext}`,
            ContentType: mimeType,
            ACL: "public-read"
        };
        return new Promise(async (resolve, reject) => {
            const s3 = new AWS.S3({
                'signatureVersion':'v4'
            });
            let uploadURL = await s3.getSignedUrl("putObject", s3Params);
            if (Boolean(process.env.IS_OFFLINE)) {
                uploadURL = uploadURL
                    .replace("https://", "http://")
                    .replace(".com", ".com:8000");
            }

            let scheme = uploadURL.split("/")[0];
            let bucketUrl = uploadURL.split("/")[2];

            resolve({
                isBase64Encoded: false,
                headers: { "Access-Control-Allow-Origin": "*" },
                uploadURL: uploadURL,
                photoFilename: `${actionId}.${ext}`,
                fileName: fileName,
                uploadPath: "/" + s3Params.Key,
                resourceUrl: `${scheme}//${bucketUrl}/${uploadFolder}${actionId}.${ext}`
            });
        });
    },

    getImage: async (entityId, entityType) => {
        try {

            let image = await knex('images').where({ entityId, entityType }).orderBy('id', 'desc').select('*').first();
            if (image) {
                return { title: image.title, fileName: image.fileName, s3Url: image.uploadPath }
            } else {
                return null;
            }

        } catch (err) {
            console.log('[helpers][image][getImage]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    }

};

module.exports = imageHelper;