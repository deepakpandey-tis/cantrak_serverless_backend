const XLSX = require("xlsx");
const moment = require("moment");
const fs = require('fs');
const knexReader = require("../../../db/knex-reader");

const exportSpecies = async (req, res) => {
    try {
        let reqData = req.query;
        let orgId = req.orgId;
        let rows = null;

        [rows] = await Promise.all([
            knexReader("species")
                .select([
                    "species.name as SPECIE_NAME",
                ])
                .where({
                    "species.orgId": orgId,
                })
        ]);

        let tempraryDirectory = null;
        let bucketName = null;
        if (process.env.IS_OFFLINE) {
            bucketName = process.env.S3_BUCKET_NAME;
            tempraryDirectory = "tmp/";
        } else {
            tempraryDirectory = "/tmp/";
            bucketName = process.env.S3_BUCKET_NAME;
        }

        var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
        var ws

        if (rows && rows.length) {
            var ws = XLSX.utils.json_to_sheet(rows);

        } else {
            ws = XLSX.utils.json_to_sheet([{ SPECIE_NAME: '' }]);
        }

        XLSX.utils.book_append_sheet(wb, ws, "pres");
        XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
        let filename = "SpeciesData-" + moment(Date.now()).format("YYYYMMDD") + ".csv";
        let filepath = tempraryDirectory + filename;
        let check = XLSX.writeFile(wb, filepath);
        const AWS = require("aws-sdk");

        fs.readFile(filepath, function (err, file_buffer) {
            var s3 = new AWS.S3();
            var params = {
                Bucket: bucketName,
                Key: "Export/Specie/" + filename,
                Body: file_buffer,
                ACL: "public-read"
            };
            s3.putObject(params, function (err, data) {
                if (err) {
                    console.log("Error at uploadCSVFileOnS3Bucket function", err);
                    res.status(500).json({
                        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
                    });
                } else {
                    console.log("File uploaded Successfully");
                    let url = process.env.S3_BUCKET_URL + "/Export/Specie/" +
                        filename;
                    // let url =
                    //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Specie/" +
                    //   filename;
                    res.status(200).json({
                        data: rows,
                        message: "Specie Data Exported Successfully!",
                        url: url
                    });
                }
            });
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][species][exportSpecies] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = exportSpecies;

/**
 */
