const knexReader = require('../../db/knex-reader');

const getHarvestList = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, itemId, storageLocationId, lotNo, plantLotNo, locationId, fromDate, toDate, expiryFromDate, expiryToDate, harvestTypeId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"harvestedOn" DESC, "lotNo" desc`;
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
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
/*  Below SQL to return data harvest detail, json of output items 
        sqlSelect = `select hpl.*, pl."lotNo" "plantLotNo", l."name" "plantLocation", c."companyName", u."name" "createdByName"
        , (SELECT json_agg(row_to_json(o.*)) "outItems" 
        FROM (SELECT it.*, i.name "itemName", i.gtin, ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation" FROM item_txns it, items i, ums, storage_locations sl 
        WHERE it."harvestPlantLotId" = hpl.id AND it."itemId" = i.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id
        ORDER BY "itemName") o
        )`;

        sqlFrom = ` FROM harvest_plant_lots hpl, plant_lots pl, locations l, companies c, users u
        `;

        sqlWhere = ` WHERE hpl."orgId" = ${orgId}`;
        sqlWhere += ` AND hpl."plantLotId" = pl.id and pl."locationId" = l.id AND hpl."companyId" = c.id AND hpl."createdBy" = u.id`;
 */

        sqlSelect = `select hpl.*, pl."lotNo" "plantLotNo", pl.name "plantLotName", l."name" "plantLocation"
        , it.quantity, it."plantsCount" "itemPlantsCount", it.quality, it."expiryDate", i.name "itemName", i.gtin, ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "storageLocationName"
        , c."companyName", u."name" "createdByName", s.name "strainName"
        `;

        sqlFrom = ` FROM harvest_plant_lots hpl, plant_lots pl, locations l
        , item_txns it, items i, ums, storage_locations sl
        , companies c, users u, strains s
        `;

        sqlWhere = ` WHERE hpl."orgId" = ${orgId}`;
        sqlWhere += ` AND hpl."plantLotId" = pl.id and pl."locationId" = l.id AND hpl."companyId" = c.id AND hpl."createdBy" = u.id AND hpl."strainId" = s.id`;
        sqlWhere += ` AND it."harvestPlantLotId" = hpl.id AND it."itemId" = i.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id`;


        if(companyId){
            sqlWhere += ` AND hpl."companyId" = ${companyId}`;
        }
        if(lotNo){
            sqlWhere += ` AND hpl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND hpl."harvestedOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND hpl."harvestedOn" <= ${new Date(toDate).getTime()}`;
        }
        if(harvestTypeId){
            if(harvestTypeId == 1){
                sqlWhere += ` AND hpl."isFinalHarvest"`;
            }
            else if(harvestTypeId == 2){
                sqlWhere += ` AND NOT hpl."isFinalHarvest"`;
            }
        }
        if(plantLotNo){
            sqlWhere += ` AND pl."lotNo" iLIKE '%${plantLotNo}%'`;
        }
        if(locationId){
            sqlWhere += ` AND pl."locationId" = ${locationId}`;
        }

        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }
        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }
        if(expiryFromDate){
            sqlWhere += ` AND it."expiryDate" >= ${new Date(expiryFromDate).getTime()}`;
        }
        if(expiryToDate){
            sqlWhere += ` AND it."expiryDate" <= ${new Date(expiryToDate).getTime()}`;
        }


        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getHarvestList sql: ', sqlSelect + sqlFrom + sqlWhere + sqlOrderBy);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getHarvestList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Harvest list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][harvest][getHarvestList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getHarvestList;

/**
 */
