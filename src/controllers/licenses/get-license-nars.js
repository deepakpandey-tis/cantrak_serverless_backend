const knexReader = require('../../db/knex-reader');

const getLicenseNars = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT l2.*, lt.name "licenseType"
        , (SELECT json_agg(row_to_json(nar.*)) "nars" 
        FROM (
        SELECT ln.id::text, ln."orgId"::text, ln."licenseId"::text, ln."permitNumber", ln."supplierId"::text, ln."issuedOn"
        , ln."expiredOn", ln."isActive", ln."createdBy", ln."createdAt", ln."updatedBy", ln."updatedAt", s.name "supplierName"
        FROM license_nars ln, suppliers s
        WHERE ln."licenseId" = l2.id AND ln."supplierId" = s.id
        ORDER BY ln."permitNumber" asc
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
        console.log("[controllers][licenses][getLicenseNars] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenseNars;

/**
 */
