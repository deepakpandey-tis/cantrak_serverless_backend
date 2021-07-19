const generalDbCall = require('./general_db_call');
const paymentLogSave = require('./payment_log_save');
const scbPaymentBillInquiry = require('./scb_payment_bill_enquiry');
const scbPaymentCallback = require('./scb_payment_callback');
const getInvoice = require('./get-invoice');
const getInvoiceHistory = require('./get-invoice-history');
const saveImage = require('./save-image');

module.exports = {
    generalDbCall,  // Very Bad Practice, // TODO: Split this function into mu;ltiple and call DB functions seperately.
    paymentLogSave,
    scbPaymentBillInquiry,
    scbPaymentCallback,
    getInvoice,
    getInvoiceHistory,
    saveImage
};
