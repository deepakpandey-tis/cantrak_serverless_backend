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
  
const getCultivationLicenseStatistics = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

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

        sqlSelect = `SELECT l.*, lt."name" "licenseType"
        , (SELECT count(distinct p."plantSerial")
        FROM plant_lots pl, plants p
        WHERE pl."licenseId" = l.id and pl."isActive" and p."plantLotId" = pl.id) "totalPlants"
        `;

        sqlFrom = ` FROM licenses l, license_types lt
        `;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."isActive"`;
        sqlWhere += ` AND l."companyId" = ${payload.companyId}`;

        sqlWhere += `  AND l."licenseTypeId" = ${LicenseType.ProductionCultivation} AND l."licenseTypeId" = lt.id`;

        sqlOrderBy  = ` ORDER BY l."number", lt."name"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Cultivation License Statistics!"
        });

    } catch (err) {
        console.log("[controllers][dashboard][getCultivationLicenseStatistics] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getCultivationLicenseStatistics;
