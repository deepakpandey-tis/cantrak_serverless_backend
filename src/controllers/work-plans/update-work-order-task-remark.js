const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updateWorkOrderTaskRemark = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;

    const payload = req.body;

    let insertedRecord = [];

    const schema = Joi.object().keys({
        id: Joi.string().required(),
        remark: Joi.string().required(),
        // remark: Joi.string().allow(null).allow('').required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][work-plans]updateWorkOrderTaskRemark: JOi Result",
        result
    );

    if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
            errors: [
                { code: "VALIDATION_ERROR", message: result.error.message }
            ]
        });
    }

    try {
        let currentTime = new Date().getTime();

        let insertData = {
            description: payload.remark.trim(),
            updatedAt: currentTime,
        };
        console.log('work plan task observation update record: ', insertData);
    
        insertedRecord = await knex
        .update(insertData)
        .where({ id: payload.id, orgId: orgId })
        .returning(["*"])
        .into('remarks_master');

        return res.status(200).json({
            data: {
                record: insertedRecord,
            },
            message: 'Work order task remark updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][updateWorkOrderTaskRemark] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateWorkOrderTaskRemark;

/**
 */
