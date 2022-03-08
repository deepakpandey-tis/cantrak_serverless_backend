const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getImages = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        const schema = Joi.object().keys({
            id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT i.*`;
        sqlFrom = ` FROM images i`;
        sqlWhere = ` WHERE i."entityId" = ${payload.id} AND i."orgId" = ${orgId}`;
        sqlOrderBy = ` ORDER BY i.id desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows,
            },
            message: "Plant Images List!"
        });

    } catch (err) {
        console.log("[controllers][plants][getImages] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getImages;