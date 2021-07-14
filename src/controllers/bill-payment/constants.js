
module.exports = {
    accessToken: 'test',

    scbApplicationKey: 'l78b9f0f31a4d8416da1a17f2fc9d29f79',//senses key //environment specific
    scbApplicationSecret: '8a125befbc624f52b3a55b93f199b50c',//senses key/ /environment specific

    scbRequestUId: 'b341d8ef-0d19-4156-aef7-9c2542bad9f2', //user device Unique ID
    scbAcceptLanguage: 'EN', // based on frontend selection EN/TH

    scbCookie: 'TS01e7ba6b=01e76b033c9b0793ae51650c67e5d1645c08795b5f3a8f814509ab2916a9e1c0b638e1b73c769866f7c81592242f1bd0dda4c6d043',

    scbAuthCode: "",
    PaymentAmount: "1.00",
    reference1: "",
    reference2: "",
    transactionDate: "", //formatted as:> yyyy-mm-dd
    sendingBank: '014', //environment specific

    //'https://api-sandbox.partners.scb/partners/sandbox/v1/oauth/token', //environment specific
    get_token_url: 'https://api-uat.partners.scb/partners/v1/oauth/token', //environment specific

    //'https://api-sandbox.partners.scb/partners/sandbox/v1/payment/qrcode/create' //environment specific
    createQR_url: 'https://api-uat.partners.scb/partners/v1/payment/qrcode/create', //environment specific

    //url: 'https://api-sandbox.partners.scb/partners/sandbox/v1/payment/billpayment/inquiry?eventCode=00300100&billerId=' //environment specific
    billInquiry_url:'https://api-uat.partners.scb/partners/v1/payment/billpayment/inquiry?eventCode=00300100&billerId=', //environment specific

    transactionPull_url: 'https://api-uat.partners.scb/partners/v2/transactions/', // environment specific

    scbppType: "BILLERID", //environment specific 
    //scbppId: "914345872218689", //kkSensed //environment specific 
    scbppId: "311040039475180", //environment specific 

};

