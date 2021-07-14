const knex = require('../../db/knex');
const axios = require('axios');
const execDbProcedure = require('../../helpers/db/exec-db-procedure');
const scbPGConstants = require('./constants');



const scbPaymentGeToken = async () => {
    const data = JSON.stringify({
        "applicationKey": scbPGConstants.scbApplicationKey,
        "applicationSecret": scbPGConstants.scbApplicationSecret,
        "authCode": scbPGConstants.scbAuthCode
    });

    const config = {
        method: 'post',
        url: get_token_url,
        headers: {
            "Content-Type": "application/json",
            "resourceOwnerId": scbPGConstants.scbApplicationKey,
            "requestUId": scbPGConstants.scbRequestUId,
            "accept-language": scbPGConstants.scbAcceptLanguage,
            "Cookie": scbPGConstants.scbCookie
        },
        data: data
    };

    return axios(config);
};

const scbpaymentBillInquiryAPI = async (accessToken, transactionDate) => {
    let data = '';
    const config = {
        method: 'get',
        url: scbPGConstants.billInquiry_url + scbPGConstants.scbppId + '&reference1=' + scbPGConstants.reference1 + '&reference2=' + scbPGConstants.reference2 + '&transactionDate=' + transactionDate,
        headers: {
            'Content-Type': "application/json",
            'authorization': 'Bearer ' + accessToken,
            'requestUID': scbPGConstants.scbRequestUId,
            'resourceOwnerID': scbPGConstants.scbApplicationKey,
            'accept-language': scbPGConstants.scbAcceptLanguage,
            'Cookie': scbPGConstants.scbCookie
        },
        data: data
    };
    return axios(config);
}


const scbPaymentBillEnquiry = async (req, res) => {
    try {

        let check_transaction_date = req.body.check_transaction_date;
        let pre_record_id = req.body.record_id;

        let queryData = {
            ...req.body,
            query_name: 'payment_log_get',
        }
        let dbret = await execDbProcedure(queryData);

        let transactionDate = dbret.return_value[0].transaction_date_str;

        //in case a different date is sent from front end for checking
        if (check_transaction_date) {
            transactionDate = check_transaction_date;
        }
        reference1 = dbret.return_value[0].payment_log_ref_id;
        reference2 = dbret.return_value[0].payment_log_ref_id;
        PaymentAmount = dbret.return_value[0].actual_pay_amount;

        let reqstr = {};
        let resstr = {};
        //start token block, to fetch token and save to database
        {
            let scbtokendata = await scbPaymentGeToken();
            //console.log(scbtokendata);
            if (scbtokendata.data.status.code == "1000") {
                accessToken = scbtokendata.data.data.accessToken;
            };

            if (accessToken != 'test') {
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
        }      //end token block, to fetch token and save to database

        //start of block to do bill inquiry
        let payment_success_flag = false;
        reqstr = {};
        resstr = {};

        //console.log(accessToken);
        //return null;
        if (accessToken != 'test') {
            let scbBillInquiryRet;
            try {
                scbBillInquiryRet = await scbpaymentBillInquiryAPI(accessToken, transactionDate);
                if (scbBillInquiryRet.status == "200" && scbBillInquiryRet.data.status.code == "1000" && scbBillInquiryRet.data.data[0].billPaymentRef1 == reference1) {
                    //console.log("here");
                    payment_success_flag = true;
                    reqstr.status = scbBillInquiryRet.status;
                    reqstr.statusText = scbBillInquiryRet.statusText;
                    reqstr.headers = scbBillInquiryRet.headers;
                    reqstr.config = scbBillInquiryRet.config;

                    resstr.data = scbBillInquiryRet.data;
                    //console.log(scbBillInquiryRet.data);
                    //console.log(reqstr);
                }

            } catch (error) {
                //console.log(error.response);
                //resstr ={};
                reqstr.status = error.response.status;
                reqstr.statusText = error.response.statusText;
                reqstr.headers = error.response.headers;
                reqstr.config = error.response.config;

                resstr.data = error.response.data;
            }
            // console.log(scbBillInquiryRet.data.data);

            //start fetch bill inquiry block, save to database
            {
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
            }      //end fetch bill inquiry block, save to database     
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