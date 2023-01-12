const knexReader = require('../../../db/knex-reader');

const getLotPlantList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let sdt, edt;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { id, locationId, subLocationId, fromPlantSerial, uptoPlantSerial, getAllPlants } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"plantSerial" desc`;
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
        
        //  getting plant ids which are final harvested

        sqlStr = `SELECT hpl."plantIds" FROM harvest_plant_lots hpl
        WHERE hpl."orgId" = ${orgId} AND hpl."plantLotId" = ${id} AND hpl."locationId" = ${locationId} AND hpl."subLocationId" = ${subLocationId}
        AND hpl."isFinalHarvest" AND not hpl."isEntireLot"
        `;

        var selectedIds = await knexReader.raw(sqlStr);
        var finalHarvestedPlantIds = [{id: 0}];
        var plantLotHarvested = false;
        selectedIds.rows.forEach((el, ndx) => {
            if(el.plantIds){
                plantLotHarvested = true;
                finalHarvestedPlantIds = (ndx == 0) ? [...el.plantIds] : [...finalHarvestedPlantIds, ...el.plantIds];
            }
        });

        var finalHarvestedPlantIdsString = finalHarvestedPlantIds.map(r => r?.id);
        // console.log('finalHarvestedPlantIds: ', finalHarvestedPlantIds);
        // console.log('finalHarvestedPlantIdsString: ', finalHarvestedPlantIdsString);

        var entireLot = false;
        if(plantLotHarvested && finalHarvestedPlantIdsString.length == 1 && finalHarvestedPlantIdsString == 0)
        {
            entireLot = true;
        }

        sqlSelect = `SELECT DISTINCT ON (p.id) pl.*, p.id "plantId", p."plantSerial", p."isActive" "plantIsActive", p."isWaste" "plantIsWaste", p."isDestroy" "plantIsDestroy", p."isEndOfLife" "plantIsEndOfLife"
        , ploc.id "plantLocationId", ploc."locationId" "plantCurrentLocationId", l.name "plantLocationName", ploc."subLocationId" "plantCurrentSubLocationId", sl.name "plantSubLocationName", pgs."growthStageId" "plantGrowthStageId", pgs."startDate" "plantGrowthStageDate", gs.name "plantGrowthStageName"
        , s.name "strainName", s2.name "specieName"
        `;
        sqlSelect += `, observation.*`

        sqlFrom = ` FROM plant_lots pl, plant_locations ploc, plant_growth_stages pgs, locations l, sub_locations sl, growth_stages gs
        , strains s, species s2, plants p
        `;

        sqlObservation = `(SELECT DISTINCT ON (i."entityId") it."tagData", i."entityId" FROM images i, image_tags it WHERE i."orgId" = ${orgId} AND i."orgId" = it."orgId" AND i."entityType" = it."entityType" AND i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC) observation`;
        sqlFrom += ` LEFT JOIN ${sqlObservation} ON p.id = observation."entityId"`;

        sqlWhere = ` WHERE pl.id = ${id} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive" AND NOT p."isWaste"`;
        if(entireLot){
            // entire lot harvested; show no plant
            sqlWhere +=  ` AND p.id <= 0`;
        } else {
            sqlWhere += ` AND p.id NOT IN (${finalHarvestedPlantIdsString})`;
        }

        sqlWhere += ` AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."orgId" = ${orgId} AND ploc2."plantId" = p.id order by id desc limit 1)`;
        sqlWhere += ` AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."orgId" = ${orgId} AND pgs2."plantId" = p.id order by id desc limit 1)`;
        sqlWhere += ` AND ploc."locationId" = l.id AND ploc."subLocationId" = sl.id AND pgs."growthStageId" = gs.id`;
        sqlWhere += ` AND pl."strainId" = s.id AND pl."specieId" = s2.id`;

        if(locationId && locationId != ''){
            sqlWhere += ` AND ploc."locationId" = ${locationId}`;
        }
        if(subLocationId){
            sqlWhere += ` AND ploc."subLocationId" = ${subLocationId}`;
        }

        if(uptoPlantSerial && uptoPlantSerial != ''){
            if(fromPlantSerial && fromPlantSerial != ''){
                sqlWhere += ` AND p."plantSerial" >= '${fromPlantSerial}'`;
            }
            sqlWhere += ` AND p."plantSerial" <= '${uptoPlantSerial}'`;
        }
        else if(fromPlantSerial && fromPlantSerial != ''){
            sqlWhere += ` AND p."plantSerial" iLIKE '%${fromPlantSerial}%'`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;

        if(getAllPlants){
            sqlStr = sqlSelect + sqlFrom + sqlWhere + " ORDER BY p.id desc";
        }
        else {
            //  Paging used

            sqlStr  = `WITH Main_CTE AS (`;
            sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
            sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
            sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
            sqlStr += sqlOrderBy;
            sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
            sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        }

        console.log('harvest getLotPlantList: ', sqlStr);



/*
        sqlStr = `SELECT hpl."plantIds" FROM harvest_plant_lots hpl
        WHERE hpl."plantLotId" = ${id} AND hpl."orgId" = ${orgId} AND hpl."locationId" = ${locationId} AND hpl."subLocationId" = ${subLocationId}
        AND hpl."isFinalHarvest" AND not hpl."isEntireLot"
        `;
        
        var selectedIds = await knexReader.raw(sqlStr);
        var finalHarvestedPlantIds = [{id: 0}];
        selectedIds.rows.forEach(el => {
            if(el.plantIds){
                finalHarvestedPlantIds = [...finalHarvestedPlantIds, ...el.plantIds];
            }
        });
        var finalHarvestedPlantIdsString = finalHarvestedPlantIds.map(r => r?.id);
        console.log('finalHarvestedPlantIdsString: ', finalHarvestedPlantIdsString);

        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT pl.*, p.id "plantId", p."plantSerial", p."isActive" "plantIsActive", p."isWaste" "plantIsWaste", p."isDestroy" "plantIsDestroy", p."isEndOfLife" "plantIsEndOfLife"
        , ploc.id "plantLocationId", l.name "plantLocationName", sl.name "plantSubLocationName", pgs."growthStageId" "plantGrowthStageId", pgs."startDate" "plantGrowthStageDate", gs.name "plantGrowthStageName"
        , s.name "strainName", s2.name "specieName"
        `;

        sqlFrom = ` FROM plant_lots pl, plants p, plant_locations ploc, plant_growth_stages pgs, locations l, sub_locations sl, growth_stages gs
        , strains s, species s2
        `;

        sqlWhere = ` WHERE pl.id = ${id} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive" AND NOT p."isWaste"`;
        sqlWhere += ` AND p.id NOT IN (${finalHarvestedPlantIdsString})`;
        sqlWhere += ` AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."plantId" = p.id order by id desc limit 1)`;
        sqlWhere += ` AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."plantId" = p.id order by id desc limit 1)`;
        sqlWhere += ` AND ploc."locationId" = l.id AND ploc."subLocationId" = sl.id AND pgs."growthStageId" = gs.id`;
        sqlWhere += ` AND pl."strainId" = s.id AND pl."specieId" = s2.id`;

        if(locationId && locationId != ''){
            sqlWhere += ` AND ploc."locationId" = ${locationId}`;
        }
        if(subLocationId){
            sqlWhere += ` AND ploc."subLocationId" = ${subLocationId}`;
        }

        if(uptoPlantSerial && uptoPlantSerial != ''){
            if(fromPlantSerial && fromPlantSerial != ''){
                sqlWhere += ` AND p."plantSerial" >= '${fromPlantSerial}'`;
            }
            sqlWhere += ` AND p."plantSerial" <= '${uptoPlantSerial}'`;
        }
        else if(fromPlantSerial && fromPlantSerial != ''){
            sqlWhere += ` AND p."plantSerial" iLIKE '%${fromPlantSerial}%'`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getLotPlantList sql: ', sqlSelect + sqlFrom + sqlWhere);

        if(getAllPlants){
            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        }
        else {
            //  Paging used

            sqlStr  = `WITH Main_CTE AS (`;
            sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
            sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
            sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
            sqlStr += sqlOrderBy;
            sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
            sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        }
        */
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Lot Plants list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getLotPlantList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLotPlantList;

/**
 */
