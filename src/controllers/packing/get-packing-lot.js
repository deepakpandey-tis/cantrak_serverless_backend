const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const redisHelper = require('../../helpers/redis');

// for qr pdf testing: delete after testing
// const Parallel = require("async-parallel");
// const QRCODE = require("qrcode");
// const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');
// for qr pdf testing: delete after testing

const getPackingLot = async (req, res) => {
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

        sqlSelect = `SELECT pl.id, pl."orgId", pl."companyId", pl."packingOn", pl."lotNo" "packingLotNo"
        , pl."isActive", pl."createdBy", pl."createdAt", pl."updatedBy", pl."updatedAt"
        , ic."name" "itemCategoryName", i."name" "itemName", i."gtin" "itemGtin", u."name" "itemUM", sl."name" "storageLocation"
        , it."id" "itemTxnId", it."itemCategoryId", it."itemId", it."txnType", it.quantity, it.quality, it."expiryDate", it."lotNo", it."umId", it."specieId", it."strainId", it."storageLocationId"
        , it."packingWeight", c."companyName"
        , (SELECT jsonb_agg(i.*) FROM images i WHERE i."entityId" = pl.id AND i.record_id = it.id) files
        `;
        sqlFrom = ` FROM packing_lots pl, item_txns it, item_categories ic, items i, ums u
        , storage_locations sl , companies c
        `;
        sqlWhere = ` WHERE pl.id = ${payload.id} AND pl."orgId" = ${orgId}`;
        sqlWhere += ` AND pl.id = it."packingLotId" AND it."itemCategoryId" = ic.id AND it."itemCategoryId" = i."itemCategoryId" AND it."itemId" = i.id
        AND it."umId" = u.id AND it."storageLocationId" = sl.id AND pl."companyId" = c.id
        `;

//  for qr pdf testing: delete after testing
//         , s.name "strainName"
//  for qr pdf testing: delete after testing
//  for qr pdf testing: delete after testing
//         , strains s
//  for qr pdf testing: delete after testing
//  for qr pdf testing: delete after testing
//         AND it.quantity > 0 AND it."storageLocationId" != ${SystemStores.PackingLoss} AND it."strainId" = s.id
//  for qr pdf testing: delete after testing

        sqlOrderBy = `ORDER BY pl.id ASC, it.id ASC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        // console.log("selectedRecs: ", selectedRecs.rows);

// for qr pdf testing: delete after testing
/*         let packedItemsWithQrCode = [];
        let recs = [];
        selectedRecs.rows.map(packedItem => {
            for(let ndx = 1; ndx <= packedItem.quantity; ndx++){
                let qrCodeObj = {
                    qn: 'CT:PACK:ID',
                    oid: orgId,
                    cid: packedItem.companyId,
                    id: packedItem.id + "-" + packedItem.itemId + "-" + String(ndx).padStart(3, '0')    //  PackingLotId + ItemId + RunningNumber
                };

                recs.push(Object.assign({}, packedItem, {bagSerial: packedItem.packingLotNo + '-' + packedItem.itemId + '-' + String(ndx).padStart(3, '0'), qrCodeString: JSON.stringify(qrCodeObj)}));
            }
        });
        console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: Packed Items: ", recs);

        packedItemsWithQrCode = await Parallel.map(recs, async (rec) => {

            let qrCodeDataURI = await QRCODE.toDataURL(rec.qrCodeString);
            let packedItemWithQrCode = {...rec, qrCode: qrCodeDataURI};

            return packedItemWithQrCode;
        });
        console.log("[helpers][generatePackingQRCodeDocumentOnEFSv2]: packed items pdf data: ", packedItemsWithQrCode);
 */
// for qr pdf testing: delete after testing

        let qrDocDownloadUrl = await redisHelper.getValue(`packing-${selectedRecs.rows[0].id}-lot-${selectedRecs.rows[0].packingLotNo}-qr-docs-link`);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
                qrDocDownloadUrl: qrDocDownloadUrl
            },
            message: "Packing lot detail!"
        });

    } catch (err) {
        console.log("[controllers][packing][getPackingLot] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPackingLot;
