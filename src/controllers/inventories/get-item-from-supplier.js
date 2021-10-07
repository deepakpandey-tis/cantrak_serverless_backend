const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getItemFromSupplier = async (req, res) => {
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

        sqlSelect = `SELECT it.*, its.id "itemTxnSupplierId", its."supplierId", its."lotNo" "supplierLotNo"
        , its."licenseNo" "supplierLicenseNo", its."internalCode" "supplierInternalCode", its."quality" "supplierQuality", splr.name "supplierName"
        , s.name "strainName", i2.name "itemName", i2.description "itemDescription", c."companyName"
        , sl.name "storageLocation", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        `;
        sqlFrom = ` FROM item_txns it, item_txn_suppliers its, companies c, strains s, items i2, ums, suppliers splr
        , storage_locations sl, item_categories ic, users u2
        `;
        sqlWhere = ` WHERE it.id = ${payload.id} AND it."orgId" = ${orgId} AND it.id = its."itemTxnId"`;
        sqlWhere += ` AND it."itemId" = i2.id AND it."strainId" = s.id AND it."companyId" = c.id AND it."umId" = ums.id
          AND its."supplierId" = splr.id AND it."storageLocationId" = sl.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."createdBy" = u2.id
        `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Raw material from supplier detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][inventories][getItemFromSupplier] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getItemFromSupplier;
