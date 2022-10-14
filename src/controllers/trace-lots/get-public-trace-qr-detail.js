const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPublicTraceQrDetail = async (req, res) => {
    try {
        let orgId = req.me?.orgId;
        let userId = req.me?.id;

        let payload = req.body;

        let sqlStr;

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

        if(orgId == undefined){
            orgId = null;
        }
        sqlStr = `SELECT tl.*, case when c."companyName" is null then tl."cultivatedBy" else c."companyName" end "cultivatedBy"
        , s.name "specieName", s2.name "strainName"
        , u."name" "createdByName", ums.name "umName", ums.abbreviation "umAbbreviation"
        FROM trace_lots tl
        LEFT JOIN companies c ON c."orgId" = ${orgId} AND c.id = tl."companyId"
        , species s, strains s2, users u, ums
        WHERE tl.id = ${payload.id}
        AND tl."createdBy" = u.id AND tl."umId" = ums.id
        AND tl."orgId" = s."orgId" AND tl."specieId" = s.id AND tl."orgId" = s2."orgId" AND tl."specieId" = s2."specieId" AND tl."strainId" = s2.id
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        // console.log("selectedRecs: ", selectedRecs.rows);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Trace QR detail!"
        });

    } catch (err) {
        console.log("[controllers][trace-lots][getPublicTraceQrDetail] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPublicTraceQrDetail;
