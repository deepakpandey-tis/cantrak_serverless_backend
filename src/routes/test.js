const { Router } = require("express")

const router = Router();
const testNotification = require('../notifications/test/test-notification');
const trimmer = require('../middlewares/trimmer');

const knex = require('../db/knex');

// const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SMS', 'SOCKET_NOTIFY'];
const ALLOWED_CHANNELS = ['IN_APP', 'SOCKET_NOTIFY'];


router.get('/', async (req, res) => {
    try {
        
            const path = require('path');
            const pdf = require("pdf-creator-node");
            const fs = require("fs");
            
            // Read HTML Template
            const templatePath = path.join(__dirname,'template.html');
            console.log('pdf');
            console.log(templatePath);
            const html = fs.readFileSync(templatePath, "utf8");
            
            let tempraryDirectory = null;
            if (process.env.IS_OFFLINE) {
                tempraryDirectory = "tmp/";
            } else {
                tempraryDirectory = "/tmp/";
            }
            let filename = "Vote-" + Date.now() + ".pdf";
            let filepath = tempraryDirectory + filename;

            const options = {
            format: "A5",
            orientation: "portrait",
            border: "5mm",
            header: {
                height: "1mm",
                contents: ''
                //contents: '<div style="text-align: center;">Author: Shyam Hajare</div>'
            },
            footer: {
                height: "1mm",
                contents: {
                    // first: 'Cover page',
                    // 2: 'Second page', // Any page number is working. 1-based index
                    // default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
                    // last: 'Last Page'
                }
            }
            };
            const datas = [
                {
                    pName:'PName',
                    date:'22/03/2021',
                    agenda:'Agenda',
                    unitNo:'',
                    oRatio:'',
                }
            ];
            const listDatas = [
            {
                enText: "Consent",
                thaiText: "เห็นชอบ",
                qrCode:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
            },
            {
                enText: "Dissent",
                thaiText: "ไม่เห็นชอบ",
                qrCode:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
            },
            {
                enText: "Abstention",
                thaiText: "งดออกเสียง",
                qrCode:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png'
            },
            ];
            const document = {
            html: html,
            data: {
                listDatas: listDatas,
                datas:datas

            },
            path: filepath,
            type: "",
            };


        // let sender = await knex.from('users').where({ id: 406 }).first();
        // let receiver = await knex.from('users').where({ id: 1121 }).first();
        // let receiver = await knex.from('users').where({ id: 406 }).first();    // Admin - TrainingAdmin
        // let receiver = await knex.from('users').where({ id: 1121 }).first();  // Tenant - daniel15@mailinator.com

        // let data = {
        //     payload: {
        //     }
        // };

        // await testNotification.send(sender, receiver, data);
        // await testNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

        // Trigger Daily Digest emails...
        // const dailyDigestHelper = require("../helpers/daily-digest");
        // await dailyDigestHelper.prepareDailyDigestForUsers();
        // await knex.raw(`ALTER TABLE public.users ADD "deactivationStatus" bool NULL DEFAULT false`)

        // let a;

        // if (process.env.IS_OFFLINE) {
        //     a = true;
        // } else {
        //     a = false;
        // }

        // res.json({
        //     IS_OFFLINE: process.env.IS_OFFLINE,
        //     ifCheck: a,
        //     typeOf: typeof process.env.IS_OFFLINE,
        //     typeof1: typeof true
        // });
        let success;

        pdf
        .create(document, options)
        .then((results) => {
            //res.json({results:results})
            let bucketName = process.env.S3_BUCKET_NAME;
            const AWS = require("aws-sdk");
            fs.readFile(results.filename, function (err, file_buffer) {
                var s3 = new AWS.S3();
                var params = {
                    Bucket: bucketName,
                    Key: "Export/Asset/" + filename,
                    Body: file_buffer,
                    ACL: "public-read"
                };
                s3.putObject(params, function (err, data) {
                    if (err) {
                        console.log("Error at uploadPDFFileOnS3Bucket function", err);
                        //next(err);
                        return res.status(500).json({
                            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
                        });
                    } else {
                        console.log("File uploaded Successfully");

                        //next(null, filePath);
                        // fs.unlink(filepath, err => {
                        //   console.log("File Deleting Error " + err);
                        // });
                        let url = process.env.S3_BUCKET_URL + "/Export/Asset/" + filename;

                        return res.status(200).json({
                            data: {},
                            message: "Asset Data Export Successfully!",
                            url: url,
                            // assetResult
                        });
                    }
                });
            });
        })
        .catch((error) => {
            console.error(error);
            res.json({error:error})
        });
        //res.send('pdf');

    } catch (err) {
        res.status(200).json({ failed: true, error: err });
    }
})

router.post('/', trimmer, (req, res) => {
    return res.status(200).json(req.body)
})

module.exports = router;