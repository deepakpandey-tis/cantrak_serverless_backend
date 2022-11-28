const knexReader = require('../../db/knex-reader');
const excelHelper = require('../../helpers/excel');
const moment = require("moment");

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50
};

const exportInvoicesToExcel = async (req, res) => {
    try {

        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;

        let { fileName, companyId, customerId, invoiceNo, fromDate, toDate, dueFromDate, dueToDate } = req.body;

        let sqlStr, sqlStrItems, sqlStrCharges;

        sqlStrItems = `SELECT c."companyName", lic.number "licenseNo", to_char(to_timestamp(inv."invoiceOn"/1000 )::date, 'yyyy/mm/dd') "invoiceDate", inv."invoiceNo", inv."invoiceCost" "invoiceSubTotal", inv."invoiceVat" "invoiceVAT", inv."invoiceAmount" "invoiceTotal", case when inv."isCancelled" then 'Yes' else 'No' end "isCancelled", inv."cancelReason", c2."name" "customerName", inv."creditDays", to_char(to_timestamp(inv."dueDate"/1000 )::date, 'yyyy/mm/dd') "dueDate"
        , 'Item' "recType", ic."name" "itemCategoryName", i2."name" "itemName", ii.quantity, ums.abbreviation "itemUMAbbreviation"
        , ii."unitPrice", ii.amount, t.percentage "taxPercentage", ((ii.amount * t.percentage) / 100) "taxValue", (((ii.amount * t.percentage) / 100) + ii.amount) "total"
        , u2."name" "createdByName", to_char(to_timestamp(inv."createdAt"/1000 )::date, 'yyyy-mm-dd HH:MM:SS') "createdAt"
        FROM invoices inv LEFT JOIN licenses lic ON inv."licenseId" = lic.id
        , invoice_items ii, taxes t, items i2, item_categories ic, ums, companies c, customers c2, users u2
        WHERE inv."orgId" = ${orgId}
        `;

        if(companyId){
            sqlStrItems += ` AND inv."companyId" = ${companyId}`;
        }
        if(customerId){
            sqlStrItems += ` AND inv."customerId" = ${customerId}`;
        }
        if(invoiceNo){
            sqlStrItems += ` AND inv."invoiceNo" iLIKE '%${invoiceNo}%'`;
        }
        if(fromDate){
            sqlStrItems += ` AND inv."invoiceOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlStrItems += ` AND inv."invoiceOn" <= ${new Date(toDate).getTime()}`;
        }
        if(dueFromDate){
            sqlStrItems += ` AND inv."dueDate" >= ${new Date(dueFromDate).getTime()}`;
        }
        if(dueToDate){
            sqlStrItems += ` AND inv."dueDate" <= ${new Date(dueToDate).getTime()}`;
        }

        sqlStrItems += ` AND inv."companyId" = c.id AND inv."customerId" = c2.id AND inv."createdBy" = u2.id AND inv."taxId" = t.id
        AND ii."orgId" = inv."orgId" AND ii."invoiceId" = inv.id AND ii."itemCategoryId" = ic.id AND ii."itemId" = i2.id AND ii."umId" = ums.id
        `;

        // sqlStrItems = ` ORDER BY "companyName", "invoiceOn", "invoiceNo"`;

        console.log('exportInvoicesToExcel sql items: ', sqlStrItems);

        sqlStrCharges = `SELECT c."companyName", lic.number "licenseNo", to_char(to_timestamp(inv."invoiceOn"/1000 )::date, 'yyyy/mm/dd') "invoiceDate", inv."invoiceNo", inv."invoiceCost" "invoiceSubTotal", inv."invoiceVat" "invoiceVAT", inv."invoiceAmount" "invoiceTotal", case when inv."isCancelled" then 'Yes' else 'No' end "isCancelled", inv."cancelReason", c2."name" "customerName", inv."creditDays", to_char(to_timestamp(inv."dueDate"/1000 )::date, 'yyyy/mm/dd') "dueDate"
        , 'Charge' "recType", '' "itemCategoryName", ch.code "itemName", ich."totalHours" quantity, case when ich."calculationUnit" = 1 then 'By Rate' else 'By Hour' end "itemUMAbbreviation"
        , ich."rate" "unitPrice", ich.amount, t.percentage "taxPercentage", ((ich.amount * t.percentage) / 100) "taxValue", (((ich.amount * t.percentage) / 100) + ich.amount) "total"
        , u2."name" "createdByName", to_char(to_timestamp(inv."createdAt"/1000 )::date, 'yyyy-mm-dd HH:MM:SS') "createdAt"
        FROM invoices inv LEFT JOIN licenses lic ON inv."licenseId" = lic.id
        , invoice_charges ich, taxes t, charges ch, companies c, customers c2, users u2
        WHERE inv."orgId" = ${orgId}
        `;

        if(companyId){
            sqlStrCharges += ` AND inv."companyId" = ${companyId}`;
        }
        if(customerId){
            sqlStrCharges += ` AND inv."customerId" = ${customerId}`;
        }
        if(invoiceNo){
            sqlStrCharges += ` AND inv."invoiceNo" iLIKE '%${invoiceNo}%'`;
        }
        if(fromDate){
            sqlStrCharges += ` AND inv."invoiceOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlStrCharges += ` AND inv."invoiceOn" <= ${new Date(toDate).getTime()}`;
        }
        if(dueFromDate){
            sqlStrCharges += ` AND inv."dueDate" >= ${new Date(dueFromDate).getTime()}`;
        }
        if(dueToDate){
            sqlStrCharges += ` AND inv."dueDate" <= ${new Date(dueToDate).getTime()}`;
        }

        sqlStrCharges += ` AND inv."companyId" = c.id AND inv."customerId" = c2.id AND inv."createdBy" = u2.id and inv."taxId" = t.id
        AND ich."orgId" = inv."orgId" AND ich."invoiceId" = inv.id AND ich."chargeId" = ch.id
        `;

        console.log('exportInvoicesToExcel sql charges: ', sqlStrCharges);


        sqlStr = sqlStrItems + ` UNION ` + sqlStrCharges + ` ORDER BY "companyName", "invoiceDate", "invoiceNo", "recType" DESC, "itemName"`;
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

        let data = selectedRecs.rows;

        let excelHeader = [
            { header: "Company Name", key: "companyName", width: 20 },
            { header: "License No.", key: "licenseNo", width: 20 },
            { header: "Invoice Date", key: "invoiceDate", width: 15 },
            { header: "Invoice No.", key: "invoiceNo", width: 15 },
            { header: "Invoice Sub Total", key: "invoiceSubTotal", width: 20 },
            { header: "Invoice VAT", key: "invoiceVAT", width: 15 },
            { header: "Invoice Total", key: "invoiceTotal", width: 20 },
            { header: "Invoice Cancelled", key: "isCancelled", width: 20 },
            { header: "Cancel Reason", key: "cancelReason", width: 20 },
            { header: "Customer Name", key: "customerName", width: 25 },
            { header: "Credit Days", key: "creditDays", width: 15 },
            { header: "Due Date", key: "dueDate", width: 15 },
            { header: "Record Type", key: "recType", width: 15 },
            { header: "Item Category", key: "itemCategoryName", width: 20 },
            { header: "Item Name", key: "itemName", width: 20 },
            { header: "Quantity", key: "quantity", width: 10 },
            { header: "UoM", key: "itemUMAbbreviation", width: 15 },
            { header: "Unit Price", key: "unitPrice", width: 10 },
            { header: "Amount", key: "amount", width: 10 },
            { header: "VAT Percentage", key: "taxPercentage", width: 15 },
            { header: "VAT Value", key: "taxValue", width: 15 },
            { header: "Total", key: "total", width: 15 },
            { header: "Created By", key: "createdByName", width: 20 },
            { header: "Created Date", key: "createdAt", width: 20 },
        ]
/* 
        let tmpData = {};
        let keys = [...excelHeader];
        keys = keys?.map(r => { tmpData[r.key] = ""; return r.key});
        console.log("==== keys ===", keys, tmpData);



        // let header = excelHeader.filter(r => r.key);

        let excelData = [];

        if(keys && keys?.length > 0){
            data?.map(e =>{

                let tempData = {...tmpData};
                
                keys?.forEach(r => {

                    // return tempData[r] = e[r];

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
                        else if(r == 'strainName'){
                            return tempData[r] = e[r] +' ('+ e?.specieName+')';
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

        var generatedExcelRes = await excelHelper.generateExcel(excelHeader, excelData, fileName, req.me);
 */
        
        var generatedExcelRes = await excelHelper.generateExcel(excelHeader, data, fileName, req.me);

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
                ...result.data
            });
        }
        else{
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: "Something went wrong" }]
            });
        }
    } catch (err) {
        console.log("[controllers][invoice][exportInvoicesToExcel] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = exportInvoicesToExcel;

/**
 */
