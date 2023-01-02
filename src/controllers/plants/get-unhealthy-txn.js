const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getUnhealthyTxn = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT pot.*, pl."lotNo" "plantLotNo", pl.name "plantLotName"
        , s."name" "strainName", s2."name" "specieName", c."companyName", l.name "locationName", sl2.name "subLocationName", gs."name" "growthStageName"
        , i."s3Url", i."s3Path", it."tagData", rm.description "reason"
        `;

        sqlFrom = ` FROM plant_observation_txns pot, plant_lots pl, locations l, sub_Locations sl2
        , strains s, species s2, companies c, growth_stages gs, images i, image_tags it, remarks_master rm
        `;

        sqlWhere = ` WHERE pot.id = ${payload.id} AND pot."orgId" = ${orgId}`;
        sqlWhere += ` AND pot."plantLotId" = pl.id`;
        sqlWhere += ` AND pot."growthStageId" = gs.id AND pl."strainId" = s.id AND pl."specieId" = s2.id AND pot."locationId" = l.id AND pot."subLocationId" = sl2.id AND pot."companyId" = c.id`;
        sqlWhere += ` AND pot."orgId" = i."orgId" AND i."entityType" = 'plant' AND i."record_id" = pot.id AND i."orgId" = it."orgId" AND i."entityType" = it."entityType" AND it."entityId" = i.id`;
        sqlWhere += ` AND i."orgId" = rm."orgId" AND rm."entityType" = 'plant_observation' AND rm."entityId" = i.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + ` LIMIT 1`;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant unhealthy txn detail!"
        });

    } catch (err) {
        console.log("[controllers][plants][getUnhealthyTxn] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getUnhealthyTxn;
