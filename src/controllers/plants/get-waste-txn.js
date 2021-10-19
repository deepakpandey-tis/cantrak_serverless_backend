const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getWasteTxn = async (req, res) => {
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

        sqlSelect = `SELECT pwt.*, pl."lotNo" "plantLotNo", i.name "itemName", it.quantity, it."umId" "itemUMId", um.name "itemUM", um."abbreviation" "itemUMAbbreviation"
        , s."name" "strainName", s2."name" "specieName", sl.name "storageLocation", c."companyName", l.name "locationName", gs."name" "growthStageName"
        , rm.description "reason"
        `;

        sqlFrom = ` FROM plant_waste_txns pwt, plant_lots pl, item_txns it, items i, ums um, locations l
        , strains s, species s2, companies c, growth_stages gs, storage_locations sl, remarks_master rm
        `;

        sqlWhere = ` WHERE pwt.id = ${payload.id} AND pwt."orgId" = ${orgId}`;
        sqlWhere += ` AND pwt."plantLotId" = pl.id`;
        sqlWhere += ` AND pwt."orgId" = it."orgId" AND pwt."companyId" = it."companyId" AND pwt."plantLotId" = it."plantLotId" AND pwt."id" = it."plantWasteTxnId"`;
        sqlWhere += ` AND pwt."growthStageId" = gs.id AND pl."strainId" = s.id AND pl."specieId" = s2.id AND pl."locationId" = l.id AND pwt."companyId" = c.id`;
        sqlWhere += ` AND it."itemId" = i.id AND it."umId" = um.id AND it."storageLocationId" = sl.id`;
        sqlWhere += ` AND pwt."orgId" = rm."orgId" AND rm."entityId" = pwt.id AND rm."entityType" = 'plant_waste_txn_entry'`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant waste txn detail!"
        });

    } catch (err) {
        console.log("[controllers][plants][getWasteTxn] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getWasteTxn;
