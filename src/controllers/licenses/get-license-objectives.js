const knexReader = require('../../db/knex-reader');

const getLicenseObjectives = async (req, res) => {
    try {
        let result;
        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT lo.*`;

        sqlFrom = ` FROM license_objectives lo`;

        sqlWhere = ` WHERE lo."licenseTypeId" = ${payload.licenseTypeId} AND lo."isActive"`;

        sqlOrderBy = ` ORDER BY lo.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "License Objectives!"
        });

    } catch (err) {
        console.log("[controllers][licenses][getLicenseObjectives] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenseObjectives;

/**
 */
