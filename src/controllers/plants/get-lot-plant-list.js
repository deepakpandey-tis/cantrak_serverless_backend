const knexReader = require('../../db/knex-reader');

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

        let { id, locationId, subLocationId, fromPlantSerial, uptoPlantSerial, includeWaste, plantTypeId, currentGrowthStageId, notIncludeSelectedFinalHarvestedPlants } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy, sqlObservation;

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
        
        //  getting selected plant ids which are final harvested
        if(notIncludeSelectedFinalHarvestedPlants || (plantTypeId != null && (plantTypeId == 1 || plantTypeId == 4))){
            // do not include harvested plants in list || get only (healthy || harvested plants)
            sqlStr = `SELECT hpl."plantIds" FROM harvest_plant_lots hpl
            WHERE hpl."plantLotId" = ${id} AND hpl."orgId" = ${orgId} AND hpl."locationId" = ${locationId} AND hpl."subLocationId" = ${subLocationId}
            AND hpl."isFinalHarvest" AND not hpl."isEntireLot"
            `;
            
            var selectedIds = await knexReader.raw(sqlStr);
            var finalHarvestedPlantIds = [{id: 0}];
            selectedIds.rows.forEach((el, ndx) => {
                if(el.plantIds){
                    finalHarvestedPlantIds = (ndx == 0) ? [...el.plantIds] : [...finalHarvestedPlantIds, ...el.plantIds];
                }
            });

            var finalHarvestedPlantIdsString = finalHarvestedPlantIds.map(r => r?.id);
            // console.log('finalHarvestedPlantIds: ', finalHarvestedPlantIds);
            // console.log('finalHarvestedPlantIdsString: ', finalHarvestedPlantIdsString);

            var entireLot = false;
            if(finalHarvestedPlantIdsString.length == 1 && finalHarvestedPlantIdsString == 0)
            {
                entireLot = true;
            }
        }




        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT DISTINCT ON (p.id) pl.*, p.id "plantId", p."plantSerial", p."isActive" "plantIsActive", p."isWaste" "plantIsWaste", p."isDestroy" "plantIsDestroy", p."isEndOfLife" "plantIsEndOfLife"
        , ploc.id "plantLocationId", l.name "plantLocationName", sl.name "plantSubLocationName", pgs."growthStageId" "plantGrowthStageId", pgs."startDate" "plantGrowthStageDate", gs.name "plantGrowthStageName"
        , s.name "strainName", s2.name "specieName"
        `;

        if(plantTypeId == undefined || plantTypeId != null && (plantTypeId == 1 || plantTypeId == 3 || plantTypeId == 4)){
            //  1: Healthy Plants || 3: Waste Plants || 4: Harvested Plants
            sqlSelect += `, null observation`
        }
        else {
            sqlSelect += `, observation.*`
        }

        sqlFrom = ` FROM plant_lots pl, plant_locations ploc, plant_growth_stages pgs, locations l, sub_locations sl, growth_stages gs
        , strains s, species s2, plants p
        `;

        // sqlObservation = `(SELECT DISTINCT ON (i."entityId") it."tagData", i."entityId" FROM images i, image_tags it WHERE i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC) observation`;
        // sqlFrom += ` LEFT JOIN ${sqlObservation} ON p.id = observation."entityId"`;
        if(plantTypeId != null && plantTypeId == 0){
            //  0: All Plants
            sqlObservation = `(SELECT DISTINCT ON (i."entityId") it."tagData", i."entityId" FROM images i, image_tags it WHERE i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC) observation`;
            sqlFrom += ` LEFT JOIN ${sqlObservation} ON p.id = observation."entityId"`;
        }
        else
        if(plantTypeId && plantTypeId == 2){
            //  2: Ill Plants
            sqlObservation = `(SELECT DISTINCT ON (i."entityId") it."tagData", i."entityId" FROM images i, image_tags it WHERE i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC) observation`;
            sqlFrom += ` JOIN ${sqlObservation} ON p.id = observation."entityId" AND (observation."tagData"->'plantCondition'->>'appearsIll')::boolean is true`;
        }

        sqlWhere = ` WHERE pl.id = ${id} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive"`;
        if(!includeWaste){
            sqlWhere += ` AND NOT p."isWaste"`;
        }
        if(plantTypeId && (plantTypeId == 1 || plantTypeId == 2)){
            //  1: Healthy || 2: Ill Plants
            sqlWhere += ` AND NOT p."isWaste"`;
        }
        else
        if(plantTypeId && plantTypeId == 3){
            //  3: Waste Plants
            sqlWhere += ` AND p."isWaste"`;
        }

        if(notIncludeSelectedFinalHarvestedPlants){
            // do not include harvested plants
            sqlWhere += ` AND p.id NOT IN (${finalHarvestedPlantIdsString})`;
        }
        else if(plantTypeId != null && plantTypeId == 1){
            // only healthy plants
            if(entireLot){
            // entire lot harvested; show no plant
            sqlWhere +=  ` AND p.id <= 0`;
            }
            else {
            // selected plants harvested, plants not part of selected harvested plants
            sqlWhere +=  ` AND p.id NOT IN (${finalHarvestedPlantIdsString})`;
            }
        }
        else if(!entireLot && plantTypeId != null && plantTypeId == 4){
            if(entireLot){
                // All plants
                sqlWhere +=  ` AND p.id > 0`;
            }
            else {
                // harvested: selected plants (in case of entire lot get all plants)
            sqlWhere += ` AND p.id IN (${finalHarvestedPlantIdsString})`;
            }
        }

        if(plantTypeId && plantTypeId == 1){
            //  1: Healthy Plants - Plants for which no observation entered or observtion entered as appears fine
            //  therefore to get healthy plants: plants which are not ill
            sqlWhere += ` AND p.id NOT IN `;
            sqlWhere += ` (SELECT "entityId" FROM`;
            sqlWhere += ` (SELECT DISTINCT ON (i."entityId") i."entityId", it."tagData" FROM images i, image_tags it WHERE p.id = i."entityId" AND i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC)`;
            sqlWhere += ` illPlants WHERE (illPlants."tagData"->'plantCondition'->>'appearsIll')::boolean is true)`;
        }

        sqlWhere += ` AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."orgId" = ${orgId} and ploc2."plantId" = p.id order by id desc limit 1)`;
        sqlWhere += ` AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."orgId" = ${orgId} and pgs2."plantId" = p.id order by id desc limit 1)`;
        if(currentGrowthStageId != undefined && currentGrowthStageId){
            //  to get plants of growth stage
            sqlWhere += ` AND pgs."growthStageId" = ${currentGrowthStageId}`;
        }
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


/*         if(fromDate && fromDate != ''){
            sdt = new Date(fromDate).getTime()
            sqlWhere += ` AND p2."plantedOn" >= ${sdt}`;
        }

        if(endDate && endDate != ''){
            edt = new Date(endDate).getTime()
            sqlWhere += ` AND p2."plantedOn" <= ${edt}`;
        }
 */
        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getLotPlantList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        console.log('getLotPlantList: ', sqlStr);
        
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
