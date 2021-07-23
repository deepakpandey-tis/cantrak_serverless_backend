const knexReader = require('../../db/knex-reader');

const getAdminPropertyUnits = async (req, res) => {
    try {
        const visitorModule = 15;

        let userId = req.me.id;
        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        // Get logged-in user authorised / accessible projects
        let authorisedProjectIds = [];
        let authorisedProjects = req.userProjectResources.find(rec => rec.id == visitorModule)
        authorisedProjectIds = authorisedProjects.projects;

        // Returns only active Units ie. user_house_allocation.status = 1 and property_units.isActive
        sqlSelect = `SELECT pu."companyId", c."companyName" as "companyName"
        , pu."projectId", p."projectName", pu."buildingPhaseId", bap."buildingPhaseCode"
        , bap.description as "buildingDescription",pu."floorZoneId", faz."floorZoneCode", faz.description
        , pu."unitNumber", pu.id as "unitId"`;

        sqlFrom = ` FROM companies c, projects p, buildings_and_phases bap, floor_and_zones faz, property_units pu`;

        sqlWhere = ` WHERE pu."orgId" = ${req.orgId} and pu."unitNumber" ILIKE '%${payload.unitNumber}%' and pu."isActive" and pu."projectId" in (${authorisedProjectIds})
         and pu."companyId" = c.id and c."isActive" and pu."projectId" = p.id and p."isActive" and pu."buildingPhaseId" = bap.id and bap."isActive" and pu."floorZoneId" = faz.id and faz."isActive"`;

         sqlStr = sqlSelect + sqlFrom + sqlWhere;

         let units = await knexReader.raw(sqlStr);
        return res.status(200).json({
            data: {
                units: units.rows
            },
            message: 'Property unit list!'
           });
           //console.log(data)
         } catch (err) {
        console.log("[controllers][Visitor][getAdminPropertyUnits] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = getAdminPropertyUnits;
