const knex = require('../../db/knex');

const organisationHasVisitorModule = async (req, res) => {
    try {
        const VisitorModule = 15;

        let sqlStr = '';

        let orgId = req.query.orgId;

        let organisationResources = null;

        sqlStr = `SELECT *
        FROM organisation_resources_master orm
        WHERE orm."orgId" = ${orgId} and orm."resourceId" = ${VisitorModule} and orm."userStatus"`;
        sqlStr = sqlStr + ` limit 1`;
        //console.log('Org has Visitor Module sql: ', sqlStr);

        var selectedRecs = await knex.raw(sqlStr);

        //console.log(selectedRecs.rows);
        selectedRecs.rows.length > 0 ? organisationResources = {hasVisitorModule: 1} : organisationResources = {hasVisitorModule: 0};
        //console.log(organisationResources);

          const result = {
            data: {
                hasVisitorModule: organisationResources.hasVisitorModule,
                message: "Has visitor Module!"
            }
        }
        //  console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][Visitor][organisationHasVisitorModule] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = organisationHasVisitorModule;
