const knexReader = require('../../db/knex-reader');

const getLicenses = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let { companyId, licenseTypeId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT l.*, lt.name "licenseType"`;

        sqlFrom = ` FROM licenses l, license_types lt `;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."isActive" AND l."licenseTypeId" = lt.id
         AND l."companyId" = ${companyId}
        `;

        if(licenseTypeId){
            sqlWhere += ` AND l."licenseTypeId" = ${licenseTypeId}`;
        }

        sqlOrderBy = ` ORDER BY l.number desc, l."revisionNumber" desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Licenses!"
        });

    } catch (err) {
        console.log("[controllers][licenses][getLicenses] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenses;

/**
 */


/*
const knexReader = require('../../../db/knex-reader');

const getLicenses = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('licenses')
            .select("id", "number", "assignedPerson")
            .where({ isActive: true, orgId: orgId })
            .orderBy([{ column: 'number', order: 'desc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Licenses!"
        });
    } catch (err) {
        console.log("[controllers][licenses][getLicenses] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenses;

 */
