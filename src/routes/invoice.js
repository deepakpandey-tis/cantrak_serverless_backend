const express = require('express');
const router = express.Router();

const invoiceController = require('../controllers/invoice');

const authMiddleware = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');


/* GET invoice listing. */

router.get('/get-invoice', authMiddleware.isAuthenticated, invoiceController.getInvoiceDetails);
router.post('/update-invoice', authMiddleware.isAuthenticated, invoiceController.updateInvoice);
router.post('/get-service-order-invoice', authMiddleware.isAuthenticated, invoiceController.getServiceOrderInvoice);

module.exports = router;
