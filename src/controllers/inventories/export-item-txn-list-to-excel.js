const knexReader = require('../../db/knex-reader');
const excelHelper = require('../../helpers/excel');
const moment = require("moment");

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50
};

const exportItemTxnListToExcel = async (req, res) => {
    try {

        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        // let pageSize = reqData.per_page || 10;
        // let pageNumber = reqData.current_page || 1;

        let { itemCategoryId, lotNo, companyId, itemId, strainId, storageLocationId, supplierId, txnType, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"companyName" asc, "date" desc, "txnType" asc, "lotNo" desc`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = '';
        // }

        // if(pageNumber < 1){
        //     pageNumber = 1;
        // }

        // if(pageSize < 0){
        //     pageSize = 10;
        // }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT it.*, its.id "itemTxnSupplierId", its."supplierId", its."lotNo" "supplierLotNo"
        , its."licenseNo" "supplierLicenseNo", its."internalCode" "supplierInternalCode", its."quality" "supplierQuality", splr.name "supplierName"
        , s.name "strainName", s2.name "specieName", i2.name "itemName", i2.description "itemDescription", c."companyName"
        , sl.name "storageLocation", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        , l.number "licenseNumber", ln."permitNumber" "narPermitNumber", tt."nameEn" "txnTypeEn", tt."nameTh" "txnTypeTh"
        `;

        sqlFrom = ` FROM item_txns it LEFT OUTER JOIN licenses l on l.id = it."licenseId"
        LEFT OUTER JOIN license_nars ln on ln.id = it."licenseNarId"
        LEFT OUTER JOIN item_txn_suppliers its on its."itemTxnId" = it.id
        LEFT OUTER JOIN suppliers splr on splr.id = its."supplierId"
        LEFT OUTER JOIN txn_types tt on tt.id = it."txnType"
        , companies c, strains s, species s2, items i2, ums
        , storage_locations sl, item_categories ic, users u2
        `;

        sqlWhere = ` WHERE s."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND it."companyId" = ${companyId}`;
        }
        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }
        if(strainId){
            sqlWhere += ` AND it."strainId" = ${strainId}`;
        }
        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }
        if(supplierId){
            sqlWhere += ` AND its."supplierId" = ${supplierId}`;
        }
        if(lotNo){
            sqlWhere += ` AND it."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(txnType){
            sqlWhere += ` AND tt."id" = ${txnType}`;
        }
        if(fromDate){
            sqlWhere += ` AND it."date" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND it."date" <= ${new Date(toDate).getTime()}`;
        }

        sqlWhere += ` AND it."itemId" = i2.id AND it."strainId" = s.id AND it."specieId" = s2.id AND it."companyId" = c.id AND it."umId" = ums.id
          AND it."storageLocationId" = sl.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        console.log('getItemTxnList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        // sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        // sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getItemTxnList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        let data = selectedRecs.rows;

        let fileName = "Raw material";
        
        let header = {
            lotNo: "Lot No.",
            itemName: "Item",
            imported: "Imported?",
            quantity: "Quantity",
            itemUM: "UoM",
            strainName: "Strain",
            txnTypeEn: "Transaction Type",
            storageLocation: "Store",
            companyName: "Company",
            date:"Date",
            txnId: "Transaction ID",
            createdByName: "Created By"
        }

        let excelHeader = [
            { header: "Lot No.", key: "lotNo", width: 20 },
            { header: "Item", key: "itemName", width: 20 },
            { header: "Imported?", key: "imported", width: 20 },
            { header: "Quantity", key: "quantity", width: 20 },
            { header: "UoM", key: "itemUM", width: 20 },
            { header: "Strain", key: "strainName", width: 20 },
            { header: "Transaction Type", key: "txnTypeEn", width: 20 },
            { header: "Store", key: "storageLocation", width: 20 },
            { header: "Company", key: "companyName", width: 20 },
            { header: "Date", key: "date", width: 20 },
            { header: "Transaction ID", key: "txnId", width: 20 },
            { header: "Created By", key: "createdByName", width: 20 }
        ]

        // let header = excelHeader.filter(r => r.key);

        let headerKeys = Object.keys(header);
        let headerValue = Object.values(header);
        let excelData = [];

        if(headerKeys && headerKeys?.length > 0){
            data?.map(e =>{

                let tempData = {...header};
                
                headerKeys?.forEach(r => {
                    if(e[r] != null){
                        if(r == 'date'){
                            return tempData[r] = moment(Number(e[r])).format('DD/MM/YYYY');
                        }else if(r == 'imported'){
                            if(e[r] == true){
                                return tempData[r] = "Yes";
                            }
                            else{
                                return tempData[r] = "No";
                            }
                        }
                        else if(r == 'quantity'){
                            return tempData[r] = e[r].toFixed(4);
                        }
                        else{
                            return tempData[r] = e[r];
                        }
                    }
                    else{
                        return tempData[r] = "";
                    }
                });

                excelData.push(tempData);
                return tempData;

            });
        }

        console.log(header);

        
        var generatedExcelRes = await excelHelper.generateExcel(excelHeader, excelData, fileName, req.me);

        console.log("*********");
        console.log("*********");
        console.log("*********");
        console.log("*********");
        console.log("*********");
        console.log(generatedExcelRes);
        console.log("*********");
        console.log("*********");
        console.log("*********");
        console.log("*********");

          const result = {
            data: {
                ...generatedExcelRes,
                message: "Excel Generated Successfully !"
            }
        }
        //console.log(result.data)
        if(generatedExcelRes?.status){
            return res.status(200).json({
                data: result.data
            });
        }
        else{
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: "Something went wrong" }]
            });
        }
    } catch (err) {
        console.log("[controllers][administration-features][inventories][getItemTxnList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = exportItemTxnListToExcel;

/**
 */
