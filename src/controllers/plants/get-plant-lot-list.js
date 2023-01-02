const knexReader = require('../../db/knex-reader');

const getPlantLotList = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, name, locationId, subLocationId, strainId, licenseId, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"lotNo" desc`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'desc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }

        //  plant lot list is derived from plant lot's plants' current location
        let sqlPlantLotCurrentLocations, sqlPlantLotList;
        sqlPlantLotCurrentLocations = `WITH plant_lot_current_locations AS (
        SELECT pl.id, pl."lotNo", pl."name", pl2."locationId", pl2."subLocationId"
        , coalesce(hpl."isFinalHarvest", false) "isFinalHarvest",  coalesce(hpl."isEntireLot" , false) "isEntireLot", coalesce(hpl."plantsCount", 0) "harvestedPlantsCount"
        , count(p."isActive") "plantsCount", sum(p."isWaste"::int) "wastePlants"
        FROM plant_lots pl, plants p, plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest"
        WHERE pl."orgId" = ${orgId}`;
        if(companyId){
            sqlPlantLotCurrentLocations += ` AND pl."companyId" = ${companyId}`;
        }
        if(strainId){
            sqlPlantLotCurrentLocations += ` AND pl."strainId" = ${strainId}`;
        }
        if(licenseId){
            sqlPlantLotCurrentLocations += ` AND pl."licenseId" = ${licenseId}`;
        }
        if(lotNo){
            sqlPlantLotCurrentLocations += ` AND pl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(name){
            sqlPlantLotCurrentLocations += ` AND pl."name" iLIKE '%${name}%'`;
        }
        if(fromDate){
            sqlPlantLotCurrentLocations += ` AND pl."plantedOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlPlantLotCurrentLocations += ` AND pl."plantedOn" <= ${new Date(toDate).getTime()}`;
        }
        if(locationId){
            sqlPlantLotCurrentLocations += ` AND pl2."locationId" = ${locationId}`;
        }
        if(subLocationId){
            sqlPlantLotCurrentLocations += ` AND pl2."subLocationId" = ${subLocationId}`;
        }

        sqlPlantLotCurrentLocations += ` AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id IN (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false)))
        `;

        sqlPlantLotCurrentLocations += ` AND pl2."locationId" IN (${req.GROWINGLOCATION})`;

        sqlPlantLotCurrentLocations += ` GROUP BY pl.id, pl."lotNo", pl2."locationId", pl2."subLocationId" , coalesce(hpl."isFinalHarvest", false),  coalesce(hpl."isEntireLot" , false), coalesce(hpl."plantsCount", 0)
        )
        , plant_lot_current_locations_sum AS
        (select id, "lotNo", name, "locationId", "subLocationId", "plantsCount", "wastePlants", "isFinalHarvest", "isEntireLot", sum("harvestedPlantsCount") "harvestedPlantsCount"
        from plant_lot_current_locations plcl
        group by id, "lotNo", name, "locationId", "subLocationId", "plantsCount", "wastePlants", "isFinalHarvest", "isEntireLot"
        )
        `;

        sqlPlantLotList = sqlPlantLotCurrentLocations + `, plant_lot_list as
        (
            SELECT plcls.*, pl4."companyId", pl4."plantedOn", pl4."refCode", s.name "strainName", s2.name "specieName", c."companyName", lic.number "licenseNo"
            , l.name "locationName", sl.name "subLocationName", u2."name" "createdByName"
            FROM plant_lot_current_locations_sum plcls, plant_lots pl4
            LEFT JOIN licenses lic ON pl4."licenseId" = lic.id
            , companies c, strains s, species s2, locations l, sub_locations sl, users u2
            WHERE plcls.id = pl4.id AND pl4."strainId" = s.id AND pl4."specieId" = s2.id AND pl4."companyId" = c.id
            AND plcls."locationId" = l.id  AND plcls."subLocationId" = sl.id AND pl4."createdBy" = u2.id
        )
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;

        sqlStr  = sqlPlantLotList;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM plant_lot_list)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM plant_lot_list, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        console.log('getPlantLotList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Plant lot list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLotList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getPlantLotList;

/**
 */
