const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getProductionLot = async (req, res) => {
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

        sqlSelect = `SELECT pl.id, pl."orgId", pl."companyId", pl."processId", pl."productionOn", pl."lotNo" "productionLotNo"
        , pl."refNo", pl."refDate", pl."additionalAttributes", pl."isActive", pl."createdBy", pl."createdAt", pl."updatedBy", pl."updatedAt"
        , p."name" "processName", ic."name" "itemCategoryName", i."name" "itemName", i."gtin" "itemGtin", u."name" "itemUM", sl."name" "storageLocation"
        , it."id" "itemTxnId", it."itemCategoryId", it."itemId", it."txnType", it.quantity, it.quality, it."expiryDate", it."lotNo", it."umId", it."specieId", it."strainId", it."storageLocationId"
        , c."companyName", pl2."name" "plantLotName", s.name "strainName"
        , (SELECT jsonb_agg(i.*) FROM images i WHERE i."entityId" = pl.id AND i.record_id = it.id) files
        `;
        sqlFrom = ` FROM production_lots pl, processes p, item_categories ic, items i, ums u
        , storage_locations sl , companies c, item_txns it
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = it."orgId" AND hpl."companyId" = it."companyId" AND hpl."lotNo" = it."lotNo"
        LEFT JOIN plant_lots pl2 ON pl2.id = hpl."plantLotId"
        , strains s
        `;
        sqlWhere = ` WHERE pl.id = ${payload.id} AND pl."orgId" = ${orgId}`;
        sqlWhere += ` AND pl.id = it."productionLotId" AND pl."processId" = p.id AND it."itemCategoryId" = ic.id AND it."itemCategoryId" = i."itemCategoryId" AND it."itemId" = i.id
        AND it."umId" = u.id AND it."storageLocationId" = sl.id AND pl."companyId" = c.id AND it."strainId" = s.id
        `;
        sqlOrderBy = `ORDER BY pl.id ASC, it.id ASC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Production lot detail!"
        });

    } catch (err) {
        console.log("[controllers][production][getProductionLot] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getProductionLot;
