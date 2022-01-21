const knexReader = require('../../../db/knex-reader');

const getLicenseNars = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT l2.*, lt.name "licenseType"
        , (SELECT json_agg(row_to_json(nar.*)) "nars" 
        FROM (
        SELECT ln.*
        FROM license_nars ln
        WHERE ln."licenseId" = l2.id
        ORDER BY ln.name asc
        ) nar
        )`;

        sqlFrom = ` FROM licenses l2, license_types lt `;
        sqlWhere = ` WHERE l2.id = ${payload.id} AND l2."orgId" = ${orgId} AND l2."licenseTypeId" = lt.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0]
            },
            message: "License NARs!"
        });

    } catch (err) {
        console.log("[controllers][administrationFeatures][licenses][getLicenseNars] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenseNars;

/**
 */
