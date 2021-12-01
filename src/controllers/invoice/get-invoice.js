const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getInvoice = async (req, res) => {
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

        sqlSelect = `SELECT inv.*
        , invi."itemCategoryId", invi."itemId", invi."umId", invi.quantity "quantity", invi."unitPrice", invi."chargeVAT", invi.amount "amount", invi.cost "cost", invi.vat "vat"
        , invi.gtin "gtin", invi."lotNos" "lotNos", i2.name "itemName", i2."description" "itemDescription"
        , c."companyName", c."companyAddressEng", c."companyAddressThai", c.telephone "companyTelephone", c."logoFile" "companyLogoFile", c."orgLogoFile" "companyOrgLogoFile"
        , lic.number "licenseNo", c2.name "customerName", c2."contactPerson" "customerContactPerson", c2."address" "customerAddress", c2."taxId" "customerTaxId"
        , ic.name "itemCategoryName", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        `;

        sqlFrom = ` FROM invoices inv, invoice_items invi, items i2, item_categories ic, companies c, licenses lic, customers c2
        , ums, users u2
        `;

        sqlWhere = ` WHERE inv.id = ${payload.id} AND inv."orgId" = ${orgId} AND inv."orgId" = invi."orgId" AND inv.id = invi."invoiceId"`;
        sqlWhere += ` AND invi."itemId" = i2.id AND invi."itemCategoryId" = ic.id AND inv."companyId" = c.id AND invi."umId" = ums.id
          AND inv."licenseId" = lic.id AND inv."customerId" = c2.id AND inv."createdBy" = u2.id
        `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Invoice detail!"
        });

    } catch (err) {
        console.log("[controllers][invoice][getInvoice] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getInvoice;
