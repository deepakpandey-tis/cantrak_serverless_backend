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

/* 
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
 */

        sqlStr = `SELECT i.*, c."companyName", c."companyAddressEng", c."companyAddressThai", c."taxId" "companyTaxId", c.telephone "companyTelephone", c."logoFile" "companyLogoFile", c."orgLogoFile" "companyOrgLogoFile"
        , lic.number "licenseNo", u2."name" "createdByName", t.percentage "taxPercentage"
        , c2.name "customerName", c2."contactPerson" "customerContactPerson", c2."address" "customerAddress", c2."taxId" "customerTaxId"
        , (SELECT json_agg(row_to_json(itm.*)) FROM
        (SELECT ii.*, ic.name "itemCategoryName", i2.name "itemName", i2."description" "itemDescription", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation"
        FROM invoice_items ii, items i2, item_categories ic, ums
        WHERE i."orgId" = ii."orgId" AND i.id = ii."invoiceId" AND ii."itemCategoryId" = ic.id AND ii."orgId" = i2."orgId" AND ii."itemId" = i2.id
        AND ii."umId" = ums.id) itm
        ) items
        , (SELECT json_agg(row_to_json(chrg.*)) FROM
        (SELECT ic2.*, case when ic2."calculationUnit" = 1 then 'By Rate' else 'By Hour' end "calculationUnitName", c3.code "chargeCode", c3.description "chargeDescription"
        FROM invoice_charges ic2, charges c3
        WHERE i."orgId" = ic2."orgId" AND i.id = ic2."invoiceId" AND i."orgId" = c3."orgId" AND ic2."chargeId" = c3.id) chrg
        ) charges
        FROM invoices i, companies c, licenses lic, customers c2, users u2, taxes t
        WHERE i.id = ${payload.id} AND i."orgId" = ${orgId} AND i."companyId" = c.id AND i."customerId" = c2.id AND i."licenseId" = lic.id AND i."createdBy" = u2.id AND i."taxId" = t.id
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows[0],
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
