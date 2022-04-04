const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const LicenseType = {
    Import: 1,
    Possession: 2,
    ProductionCultivation: 3,
    Export: 4,
    Distribution: 5,
    ProductionExtraction: 6,
  };
  
const getImportLicenseStatistics = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy;

        const schema = Joi.object().keys({
            companyId: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT l."number", lt."name" "licenseType", coalesce(sum(li.quantity), 0) "totalItemsQuantity"
        , (SELECT json_agg(row_to_json(o.*)) nars
        FROM (SELECT ln2."permitNumber" , coalesce(sum(lni.quantity), 0) "totalNarQuantity"
        FROM license_nar_items lni , license_nars ln2 , licenses l2
        WHERE l2.number = l."number" and ln2."licenseId" = l2.id and l2."isActive" and ln2."isActive" and ln2."id" = lni."licenseNarId" and lni."licenseItemId" = li.id
        GROUP BY l2."number", ln2."permitNumber") o
        )
        `;

        sqlFrom = ` FROM licenses l, license_items li, license_types lt
        `;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."isActive"`;
        sqlWhere += ` AND l."companyId" = ${payload.companyId}`;

        sqlWhere += `  AND li."licenseId" = l.id AND l."licenseTypeId" = ${LicenseType.Import} AND l."licenseTypeId" = lt.id`;

        sqlGroupBy  = ` GROUP BY l."number", lt."name", li."id"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlGroupBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Import License Statistics!"
        });

    } catch (err) {
        console.log("[controllers][dashboard][getImportLicenseStatistics] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getImportLicenseStatistics;
