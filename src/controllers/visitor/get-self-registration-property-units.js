const knex = require('../../db/knex');

const getSelfRegistrationPropertyUnits = async (req, res) => {
    try {
        const visitorModule = 15;

        //let userId = req.me.id;
        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        // Returns only active Units ie. user_house_allocation.status = 1 and property_units.isActive
        sqlSelect = `SELECT pu."companyId", c."companyName" as "companyName"
        , pu."projectId", p."projectName", pu."buildingPhaseId", bap."buildingPhaseCode"
        , bap.description as "buildingDescription",pu."floorZoneId", faz."floorZoneCode", faz.description
        , pu."unitNumber", pu.id as "unitId"
        , u.id as "tenantId", u."name" as "tenantName", uha."id" as "userHouseAllocationId"`;

        sqlFrom = ` FROM companies c, projects p, buildings_and_phases bap, floor_and_zones faz, property_units pu, user_house_allocation uha , users u`;

        sqlWhere = ` WHERE pu."orgId" = ${payload.orgId} and pu."projectId" = ${payload.projectId}`;
        if(payload.buildingPhaseId){
            sqlWhere = sqlWhere + ` and pu."buildingPhaseId" = ${payload.buildingPhaseId}`;
        }

        sqlWhere = sqlWhere + ` and pu."unitNumber" ILIKE '%${payload.unitNumber}%' and pu."isActive"
         and pu."companyId" = c.id and c."isActive" and pu."projectId" = p.id and p."isActive" and pu."buildingPhaseId" = bap.id and bap."isActive" and pu."floorZoneId" = faz.id and faz."isActive"
         and pu.id = uha."houseId" and uha."userId" = u.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        //console.log("[controllers][Visitor][getSelfRegistrationPropertyUnits] sql: ", sqlStr);

        let units = await knex.raw(sqlStr);
        //console.log("[controllers][Visitor][getSelfRegistrationPropertyUnits] data: ", units);
        return res.status(200).json({
            data: {
                units: units.rows
            },
            message: 'Public property unit list!'
           });
           //console.log(data)
         } catch (err) {
        //console.log("[controllers][Visitor][getSelfRegistrationPropertyUnits] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = getSelfRegistrationPropertyUnits;
