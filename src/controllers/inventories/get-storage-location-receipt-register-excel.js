const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");
const ExcelJS = require('exceljs');
const path = require('path');

const getStorageLocationReceiptRegisterExcel = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let ReceiveFromTxnType = 11;
        let ReceiveUptoTxnType = 50;

        let {companyId, itemCategoryId, itemId, storageLocationId, fromDate, toDate} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;

        sqlSelect = `SELECT ic."name" "itemCategory", sl."name" "storageLocation", i."name" "itemName", u.name "UoM"
        , tt."name" "txnTypeName", to_char(to_timestamp(it.date/1000), 'DD/MM/YYYY') date, it."txnId", it."lotNo", "quantity"
        `;

        sqlFrom = ` FROM item_txns it, item_categories ic, items i, storage_locations sl, txn_types tt, ums u`;

        sqlWhere = ` WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        AND it."txnType" >= ${ReceiveFromTxnType} AND it."txnType" <= ${ReceiveUptoTxnType}
        `;
        // AND it."date" >= ${new Date(fromDate).getTime()} AND it."date" <= ${new Date(toDate).getTime()}

        if(fromDate){
            sqlWhere += ` AND it."date" >= ${new Date(fromDate).getTime()}`;
        }

        if(toDate){
            sqlWhere += ` AND it."date" <= ${new Date(toDate).getTime()}`;
        }

        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }

        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }

        sqlWhere += ` AND it."itemCategoryId" = ic.id AND it."itemId" = i.id AND it."storageLocationId" = sl.id AND it."txnType" = tt.id AND tt."subId" = it."subId" AND it."umId" = u.id`;

        // sqlOrderBy = ` ORDER BY sl."name", ic."name", i."name", it."date", it."txnType" , it."txnId"`;
        sqlOrderBy = ` ORDER BY sl."name", it."date", it."txnId"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        selectedRecs = await knexReader.raw(sqlStr);

        let workbook = new ExcelJS.Workbook();
        let worksheet_issue_register = workbook.addWorksheet("Receipt Register");
        worksheet_issue_register.columns = [
            { header: "Storage Location", key: "storageLocation", width: 35 },
            { header: "Date", key: "date", width: 15 },
            { header: "Tracking ID", key: "txnId", width: 15 },
            { header: "Transaction Type", key: "txnTypeEn", width: 25 },
            { header: "Item Name", key: "itemName", width: 35 },
            { header: "Lot Number", key: "lotNo", width: 20 },
            { header: "Quantity", key: "quantity", width: 10 },
            { header: "UoM", key: "UoM", width: 35 },
        ];
        worksheet_issue_register.getRow(1).font = { bold: true };
        worksheet_issue_register.addRows(selectedRecs.rows);

        // var tempFilePath = path.join(global.appRoot, 'tmp', 'receipt_register' + '.xlsx');
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
            tempraryDirectory = path.join(global.appRoot, 'tmp/');
        } else {
            tempraryDirectory = "/tmp/";
        }

        var tempFilePath = tempraryDirectory + 'receipt_register.xlsx';

        await workbook.xlsx.writeFile(tempFilePath);
        console.log('File Created: ' + tempFilePath);
        // since we are using absolute path, no need to specify {root: path} res.sendFile(tempFilePath, { root: '.' }, function(err) {
        res.sendFile(tempFilePath, function(err) {
            if(err){
                console.log('Error downloading the file: ' + err);
            }
        });

/*         return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Storage Location Receipt register!"
        }); */

    } catch (err) {
        console.log("[controllers][inventories][getStorageLocationReceiptRegisterExcel] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStorageLocationReceiptRegisterExcel;
