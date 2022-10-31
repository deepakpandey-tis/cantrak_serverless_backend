const knexReader = require('../../../db/knex-reader');

const getCharges = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        let sqlStr;
/* 
        sqlStr = `SELECT c.*, t.code "taxCode", t.percentage "taxPercentage"
        , CASE WHEN c."calculationUnit" = 1 THEN 'By Rate' ELSE 'By Hour' END "calculationUnitName"
        FROM charges c, taxes t
        WHERE c."orgId" = ${orgId} AND c."isActive" AND c."orgId" = t."orgId" AND c."taxId" = t.id
        ORDER BY c.code, c.rate
        `;
 */
        sqlStr = `SELECT c.*
        , CASE WHEN c."calculationUnit" = 1 THEN 'By Rate' ELSE 'By Hour' END "calculationUnitName"
        FROM charges c
        WHERE c."orgId" = ${orgId} AND c."isActive"
        ORDER BY c.code, c.rate
        `;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Charges!"
        });
    } catch (err) {
        console.log("[controllers][invocie][masters][getCharges] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getCharges;

/**
 */
