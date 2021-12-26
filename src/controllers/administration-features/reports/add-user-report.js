const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const addUserReport = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            moduleName: Joi.string().required(),
            reportName: Joi.string().required(),
            mainReportId: Joi.number().required(),
            filterJson: Joi.object().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][reports][addUserReport]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('User report insert record: ', insertData);

        const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .into('report_master');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'User report added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][reports][addUserReport] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addUserReport;

/**
 */
