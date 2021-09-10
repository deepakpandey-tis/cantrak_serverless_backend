const _ = require("lodash");
const knex = require("../../../db/knex");
const knexReader = require("../../../db/knex-reader");

const importSpecies = async (req, res) => {
    try {
        let data = req.body;
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        let result = null;
        let currentTime = new Date().getTime();
        let errors = []
        let header = Object.values(data[0]);
        header.unshift('Error');
        errors.push(header)

        if (
            data[0].A == "Ã¯Â»Â¿SPECIE_NAME" ||
            (data[0].A == "SPECIE_NAME")
        ) {
            if (data.length > 0) {
                let i = 0;
                console.log("Data[0]", data[0]);
                for (let rec of data) {
                    i++;
                    if (i > 1) {
                        if (!rec.A) {
                            let values = _.values(rec)
                            values.unshift('Specie name can not empty!')
                            errors.push(values);
                            fail++;
                            continue;
                        }

                        let checkExist = await knexReader("species")
                            .select("name")
                            .where('name', 'iLIKE', rec.A)
                            .where({ orgId: req.orgId })
                        if (checkExist.length < 1 && rec.A) {
                            success++;
                            let insertData = {
                                orgId: req.orgId,
                                name: rec.A,
                                isActive: true,
                                createdBy: req.me.id,
                                createdAt: currentTime,
                                updatedBy: req.me.id,
                                updatedAt: currentTime
                            };

                            resultData = await knex
                                .insert(insertData)
                                .returning(["*"])
                                .into("species");
                        } else {
                            let values = _.values(rec)
                            values.unshift('Specie name already exists')
                            errors.push(values);
                            fail++;
                        }
                    }
                }

                let message = null;
                if (totalData == success) {
                    message =
                        "System have processed ( " +
                        totalData +
                        " ) entries and added them successfully!";
                } else {
                    message =
                        "System have processed ( " +
                        totalData +
                        " ) entries out of which only ( " +
                        success +
                        " ) are added and others are failed ( " +
                        fail +
                        " ) due to validation!";
                }

                return res.status(200).json({
                    message: message,
                    errors: errors
                });
            }
        } else {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Please choose a valid file!" }
                ]
            });
        }
    } catch (err) {
        console.log(
            "[controllers][administrationFeatures][species][importSpecies] :  Error",
            err
        );
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
};

module.exports = importSpecies;

/**
 */
