const knex = require('../../db/knex');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');
const billPaymentHelper = require('../../helpers/bill-payment');


const paymentLogSave = async (req, res) => {
    try {

        let pre_query_name = req.body.query_name;
        let pre_record_id = req.body.record_id;
        let pre_company = req.body.company;
        let pre_org_id = req.body.org_id;

        let queryData = {
            "query_name":"payment_log_save", 
            "record_id":null, 
            "org_id":req.me.orgId,
            "user_id" : req.me.id,
            "payment_log_ref_id":null, 
            "transaction_date":null,
            "unit_number":null,
            "status":"N",
            "status_text":"NEW",
            "bank_code":null,
            "bank_name":null,
            "payment_type":"QR",
            "payment_type_description":null,
            "last_status_code":null,
            "last_business_code":null,
            "actual_pay_amount":0.00,
            ...req.body
        };

        console.log("[][]][][][][][][][][][][]][][]][] JSON [][]][][][[][][][]]][][[]][]", queryData);

        let dbret = await execDbProcedure(queryData);
        console.log(dbret.return_value[0].payment_api_json);

        let scbPGDynamicConstants = dbret.return_value[0].payment_api_json // changes

        let payment_log_rid = dbret.return_value[0].record_id;
        let referenceId = dbret.return_value[0].payment_log_ref_id;
        let paymentAmount = dbret.return_value[0].estimate_pay_amount;
        let transactionDate = dbret.return_value[0].transaction_date_str;

        let accessToken;
        let scbtokendata = await billPaymentHelper.scbPaymentGeToken(scbPGDynamicConstants);

        console.log("[controllers][bill-payment][payment-log-save]: scbtokendata ",scbtokendata.data);
        if (scbtokendata.data.status.code == "1000") {
            accessToken = scbtokendata.data.data.accessToken;
        };

        queryData = {
            query_name: "payment_log_json_req_res_save",
            payment_log_rid: payment_log_rid,
            record_id: null,
            request_description: 'Request for SCB Token',
            actual_pay_amount: 0,
            request_json: { 
                status: scbtokendata.status, 
                statusText: scbtokendata.statusText,
                headers: scbtokendata.headers,
                config: scbtokendata.config
            },
            response_json: scbtokendata.data
        };
        //console.log(queryData);
        await execDbProcedure(queryData);


        //console.log(accessToken); 
        let scbQRCode = await billPaymentHelper.scbpaymentCreateThaiQRCode(accessToken, paymentAmount, referenceId, scbPGDynamicConstants);
        //console.log(scbQRCode.data);
        let qrImageSuccess = false;
        if (scbQRCode.data.status.code == "1000") {
            //console.log(scbQRCode.data.data.qrImage);
            if (scbQRCode.data.data.qrImage) qrImageSuccess = true;
        }

        if (qrImageSuccess) {
            queryData = {
                "query_name": "payment_log_json_req_res_save",
                payment_log_rid: payment_log_rid,
                record_id: null,
                request_description: 'Create SCB ThaiQRCode',
                actual_pay_amount: null,
                request_json: { 
                    status: scbQRCode.status, 
                    statusText: scbQRCode.statusText,
                    headers: scbQRCode.headers,
                    config: scbQRCode.config
                },
                response_json: scbQRCode.data
            };

            await execDbProcedure(queryData);

            queryData = {
                query_name: "payment_log_get",
                record_id: payment_log_rid,
                company: pre_company,
                org_id: pre_org_id,
                status: "N"
            };

            let get_final_pm_log = await execDbProcedure(queryData);
            
            console.log("[controllers][bill-payment][payment-log-save]: get_final_pm_log ", get_final_pm_log);
            return res.status(200).send(get_final_pm_log);
        }

        return res.status(200).send(dbret);

    } catch (err) {
        console.log("[controllers][bill-payment][paymentLogSave] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = paymentLogSave;