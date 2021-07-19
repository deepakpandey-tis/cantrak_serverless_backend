const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const axios = require("axios");

const scbRequestUId = 'b341d8ef-0d19-4156-aef7-9c2542bad9f2'; //user device Unique ID
const scbAcceptLanguage = 'EN'; // based on frontend selection EN/TH
const scbCookie = 'TS01e7ba6b=01e76b033c9b0793ae51650c67e5d1645c08795b5f3a8f814509ab2916a9e1c0b638e1b73c769866f7c81592242f1bd0dda4c6d043';
const scbAuthCode = "";


const billPaymentHelper = {

  scbPaymentGeToken: async ({ scbApplicationKey, scbApplicationSecret, getTokenUrl }) => {

    const data = JSON.stringify({
      "applicationKey": scbApplicationKey,
      "applicationSecret": scbApplicationSecret,
      "authCode": scbAuthCode
    });

    const config = {
      method: 'post',
      url: getTokenUrl,
      headers: {
        "Content-Type": "application/json",
        "resourceOwnerId": scbApplicationKey,
        "requestUId": scbRequestUId,
        "accept-language": scbAcceptLanguage,
        "Cookie": scbCookie
      },
      data: data
    };

    return axios(config);
  },


  scbpaymentCreateThaiQRCode: async (accessToken, PaymentAmount, referenceId, { scbApplicationKey, scbppType, scbppId, createQrUrl }) => {
    const data = JSON.stringify({
      "qrType": "PP",
      "ppType": scbppType,
      "ppId": scbppId,
      "amount": PaymentAmount,
      "ref1": referenceId,
      "ref2": referenceId,
      "ref3": "CIE" //"ref3": "XCT"
    });
    //console.log(accessToken);
    const config = {
      method: 'post',
      url: createQrUrl,
      headers: {
        "Content-Type": "application/json",
        "authorization": "Bearer " + accessToken,
        "resourceOwnerId": scbApplicationKey,
        "requestUId": scbRequestUId,
        "accept-language": scbAcceptLanguage,
        "Cookie": scbCookie
      },
      data: data
    };
    //console.log(config);
    return axios(config)
  },


  scbpaymentBillInquiryAPI: async (accessToken, transactionDate, referenceId, {scbApplicationKey, billInquiry_url, scbppId }) => {
    let data = '';
    const config = {
      method: 'get',
      url: billInquiry_url + scbppId + '&reference1=' + referenceId + '&reference2=' + referenceId + '&transactionDate=' + transactionDate,
      headers: {
        'Content-Type': "application/json",
        'authorization': 'Bearer ' + accessToken,
        'resourceOwnerID': scbApplicationKey,
        "requestUId": scbRequestUId,
        "accept-language": scbAcceptLanguage,
        "Cookie": scbCookie
      },
      data: data
    };
    return axios(config);
  }

};

module.exports = billPaymentHelper;
