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


        sqlStr = `SELECT i.*, c."companyName", c."companyAddressEng", c."companyAddressThai", c."taxId" "companyTaxId", c.telephone "companyTelephone", c."logoFile" "companyLogoFile", c."orgLogoFile" "companyOrgLogoFile"
        , lic.number "licenseNo", u2."name" "createdByName", t.percentage "taxPercentage"
        , c2.name "customerName", c2.type "customerType", c2."contactPerson" "customerContactPerson", c2."address" "customerAddress", c2."taxId" "customerTaxId", countries.name "customerCountry"
        , (SELECT json_agg(row_to_json(itm.*)) FROM
        (SELECT ii.*, ic.name "itemCategory", i2.name "item", i2."description" "itemDescription", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation"
        FROM invoice_items ii, items i2, item_categories ic, ums
        WHERE i."orgId" = ii."orgId" AND i.id = ii."invoiceId" AND ii."itemCategoryId" = ic.id AND ii."orgId" = i2."orgId" AND ii."itemId" = i2.id
        AND ii."umId" = ums.id) itm
        ) items
        , (SELECT json_agg(row_to_json(chrg.*)) FROM
        (SELECT ic2.*, case when ic2."calculationUnit" = 1 then 'By Rate' else 'By Hour' end "calculationUnitName", c3.code "code", c3.description "description"
        FROM invoice_charges ic2, charges c3
        WHERE i."orgId" = ic2."orgId" AND i.id = ic2."invoiceId" AND i."orgId" = c3."orgId" AND ic2."chargeId" = c3.id) chrg
        ) charges
        FROM invoices i LEFT JOIN licenses lic ON i."licenseId" = lic.id
        , companies c, users u2, taxes t, customers c2 LEFT JOIN countries ON c2."countryId" = countries.id
        WHERE i.id = ${payload.id} AND i."orgId" = ${orgId} AND i."companyId" = c.id AND i."customerId" = c2.id AND i."createdBy" = u2.id AND i."taxId" = t.id
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
