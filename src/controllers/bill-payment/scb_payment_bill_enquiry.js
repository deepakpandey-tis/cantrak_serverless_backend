const knex = require('../../db/knex');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');
const billPaymentHelper = require('../../helpers/bill-payment');


const scbPaymentBillEnquiry = async (req, res) => {
    try {

        let check_transaction_date = req.body.check_transaction_date;
        let pre_record_id = req.body.record_id;

        let queryData = {
            ...req.body,
            query_name: 'payment_log_get',
        }
        let dbret = await execDbProcedure(queryData);

        let scbPGDynamicConstants = dbret.return_value[0].payment_api_json // changes
        // scbApplicationKey = scbPGDynamicConstants.scbApplicationKey;
        // scbApplicationSecret = scbPGDynamicConstants.scbApplicationSecret;
        // get_token_url = scbPGDynamicConstants.get_token_url;
        createQR_url = scbPGDynamicConstants.createQR_url;
        billInquiry_url = scbPGDynamicConstants.billInquiry_url;
        transactionPull_url = scbPGDynamicConstants.transactionPull_url;
        scbppType = scbPGDynamicConstants.scbppType;
        scbppId = scbPGDynamicConstants.scbppId;
        sendingBank = scbPGDynamicConstants.sendingBank;
        scb_reference3 = scbPGDynamicConstants.scb_reference3;


        let transactionDate = dbret.return_value[0].transaction_date_str;

        //in case a different date is sent from front end for checking
        if (check_transaction_date) {
            transactionDate = check_transaction_date;
        }
        let referenceId = dbret.return_value[0].payment_log_ref_id;
        let reference2 = dbret.return_value[0].payment_log_ref_id;
        let PaymentAmount = dbret.return_value[0].actual_pay_amount;

        let reqstr = {};
        let resstr = {};
        let accessToken;


        //start token block, to fetch token and save to database
        let scbtokendata = await billPaymentHelper.scbPaymentGeToken(scbPGDynamicConstants);
        //console.log(scbtokendata);
        if (scbtokendata.data.status.code == "1000") {
            accessToken = scbtokendata.data.data.accessToken;
        };

        if (accessToken) {
            let qrystr = { "query_name": "payment_log_json_req_res_save" };
            qrystr.payment_log_rid = pre_record_id;
            qrystr.record_id = null;
            qrystr.request_description = 'Request for SCB Token';
            qrystr.actual_pay_amount = PaymentAmount; //replace with actual later

            //grab the request json
            reqstr.status = scbtokendata.status;
            reqstr.statusText = scbtokendata.statusText;
            reqstr.headers = scbtokendata.headers;
            reqstr.config = scbtokendata.config;
            qrystr.request_json = reqstr;
            // console.log(reqstr);

            //grab the response json
            resstr.data = scbtokendata.data;
            qrystr.response_json = resstr;

            await execDbProcedure(qrystr);
        }
        //end token block, to fetch token and save to database


        //start of block to do bill inquiry
        let payment_success_flag = false;
        reqstr = {};
        resstr = {};

       
        if (accessToken) {
            try {
                let scbBillInquiryRet = await billPaymentHelper.scbpaymentBillInquiryAPI(accessToken, transactionDate, referenceId, scbPGDynamicConstants);
                if (scbBillInquiryRet.data.status.code == "1000" && scbBillInquiryRet.data.data[0].billPaymentRef1 == referenceId) {
                    //console.log("here");
                    payment_success_flag = true;
                    reqstr = {
                        ...scbBillInquiryRet,
                    };
                    //console.log(reqstr);
                }
            } catch (error) {
                //console.log(error.response);
                reqstr = {
                    ...error.response,
                };
            }

            //start fetch bill inquiry block, save to database
            queryData = {
                query_name: "payment_log_json_req_res_save",
                "payment_success_flag": payment_success_flag,
                payment_log_rid: pre_record_id,
                record_id: null,
                request_description: 'Bill Payment Inquiry',
                actual_pay_amount: PaymentAmount,
                request_json: reqstr,
                response_json: resstr,
            };

            await execDbProcedure(qrystr);
            //end fetch bill inquiry block, save to database     
        }
        res.status(200).send(dbret);

    } catch (err) {
        console.log("[controllers][bill-payment][paymentLogSave] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });
    }
}

module.exports = scbPaymentBillEnquiry;