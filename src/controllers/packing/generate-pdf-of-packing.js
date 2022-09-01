const knexReader = require('../../db/knex-reader');
const redisHelper = require('../../helpers/redis');
const queueHelper = require("../../helpers/queue");
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const generatePdfOfPacking = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let { id, pdfType } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT pl.id, pl."orgId", pl."companyId", pl."packingOn", pl."lotNo" "packingLotNo"
        , pl."isActive", pl."createdBy", pl."createdAt", pl."updatedBy", pl."updatedAt"
        , it."id" "itemTxnId", it."itemCategoryId", it."itemId", it."txnType", it.quantity, it.quality, it."expiryDate"
        , it."lotNo", it."umId", it."specieId", it."strainId", it."storageLocationId"
        , it."packingWeight", i."name" "itemName"
        , s.name "strainName"
        `;
        sqlFrom = ` FROM packing_lots pl, item_txns it, items i
        , strains s
        `;
        sqlWhere = ` WHERE pl.id = ${id} AND pl."orgId" = ${orgId}`;
        sqlWhere += ` AND pl.id = it."packingLotId" AND it."itemCategoryId" = i."itemCategoryId" AND it."itemId" = i.id
        AND it.quantity > 0 AND it."storageLocationId" != ${SystemStores.PackingLoss} AND it."strainId" = s.id
        `;
        sqlOrderBy = `ORDER BY pl.id ASC, it.id ASC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        await redisHelper.removeKey(`packing-${selectedRecs.rows[0].id}-lot-${selectedRecs.rows[0].packingLotNo}-qr-docs-link`);

        await queueHelper.addToQueue(
          {
            packingLotId: id,
            pdfType,
            data: {
              packedItems: selectedRecs.rows,
            },
            orgId: req.orgId,
            requestedBy: req.me,
          },
          "long-jobs",
          "PACKING_TO_SCAN"
        );

        return res.status(200).json({
            data: selectedRecs.rows[0],
            message:
              "System is preparing QR code for selected packing lot. Please wait for few minutes. Once prepared you will be notified via Email & App notifications.",
        });
    } catch (err) {
        console.log("[controllers][packing][generatePdfOfPacking] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = generatePdfOfPacking;

/**
 */
