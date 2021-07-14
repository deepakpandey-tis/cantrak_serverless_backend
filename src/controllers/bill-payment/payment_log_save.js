const knex = require('../../db/knex');
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

const scbpaymentCreateThaiQRCode = async (accessToken, PaymentAmount) => {
    const data = JSON.stringify({
        "qrType": "PP",
        "ppType": scbPGConstants.scbppType,
        "ppId": scbPGConstants.scbppId,
        "amount": PaymentAmount,
        "ref1": scbPGConstants.reference1,
        "ref2": scbPGConstants.reference2,
        "ref3": "CIE" //"ref3": "XCT"
    });
    //console.log(accessToken);
    const config = {
        method: 'post',
        url: createQR_url,
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer " + accessToken,
            "resourceOwnerId": scbPGConstants.scbApplicationKey,
            "requestUId": scbPGConstants.scbRequestUId,
            "accept-language": scbPGConstants.scbAcceptLanguage,
            "Cookie": scbPGConstants.scbCookie
        },
        data: data
    };
    //console.log(config);
    return axios(config)
};

const paymentLogSave = async (req, res) => {
    try {

        let pre_query_name = req.body.query_name;
        let pre_record_id = req.body.record_id;
        let pre_company = req.body.company;
        let pre_org_id = req.body.org_id;

        let queryData = {
            query_name: 'payment_log_save',
            ...req.body
        };

        let dbret = await execDbProcedure(queryData);
        //console.log(dbret);

        let payment_log_rid = dbret.return_value[0].record_id;
        reference1 = dbret.return_value[0].payment_log_ref_id;
        reference2 = dbret.return_value[0].payment_log_ref_id;
        PaymentAmount = dbret.return_value[0].estimate_pay_amount;
        transactionDate = dbret.return_value[0].transaction_date_str;

        let scbtokendata = await scbPaymentGeToken();
        let accessToken = 'test';

        //console.log(scbtokendata);
        if (scbtokendata.data.status.code == "1000") {
            accessToken = scbtokendata.data.data.accessToken;
        };

        const paymentAmount = scbPGConstants.PaymentAmount;

        if (accessToken != 'test') {

            queryData = {
                query_name: "payment_log_json_req_res_save",
                payment_log_rid: payment_log_rid,
                record_id: null,
                request_description: 'Request for SCB Token',
                actual_pay_amount: 0,
                request_json: scbtokendata,
                response_json: data
            };
            //console.log(queryData);
            await execDbProcedure(queryData);


            //console.log(accessToken); 
            let scbQRCode = await scbpaymentCreateThaiQRCode(accessToken, paymentAmount);
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
                    request_json: scbQRCode,
                    response_json: scbQRCode.data
                };

                await  execDbProcedure(queryData);

                queryData = {
                    query_name:"payment_log_get",
                    record_id: payment_log_rid,
                    company: pre_company,
                    org_id: pre_org_id,
                    status: "N"
                };

                let get_final_pm_log = await execDbProcedure(queryData);

                return res.status(200).send(get_final_pm_log);
            }
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