const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getHarvestLot = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

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

        sqlSelect = `select hpl.*, pl."lotNo" "plantLotNo", l."name" "plantLocation"
        , it.id "itemTxnId", it.quantity, it."plantsCount" "itemPlantsCount", it.quality, it."expiryDate", ic."name" "itemCategoryName", i.name "itemName", i.gtin, ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "storageLocationName"
        , c."companyName", u."name" "createdByName"
        `;

        sqlFrom = ` FROM harvest_plant_lots hpl, plant_lots pl, locations l
        , item_txns it, items i, ums, storage_locations sl, item_categories ic
        , companies c, users u
        `;

        sqlWhere = ` WHERE hpl."id" = ${payload.id} AND hpl."orgId" = ${orgId}`;
        sqlWhere += ` AND hpl."plantLotId" = pl.id and pl."locationId" = l.id AND hpl."companyId" = c.id AND hpl."createdBy" = u.id`;
        sqlWhere += ` AND it."harvestPlantLotId" = hpl.id AND it."itemId" = i.id AND it."umId" = ums.id AND it."itemCategoryId" = ic.id AND it."storageLocationId" = sl.id`;
        sqlWhere += ` AND hpl."companyId" = c.id AND hpl."createdBy" = u.id`;

        sqlOrderBy = ` ORDER BY hpl.id ASC, it.id ASC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Harvest lot detail!"
        });

    } catch (err) {
        console.log("[controllers][harvest][getHarvestLot] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getHarvestLot;
