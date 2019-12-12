const express = require('express');
const router = express.Router();

const taxesController = require('../../controllers/administration-features/taxes');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-taxes', authMiddleware.isAuthenticated,  taxesController.addTaxes);
router.post('/update-taxes', authMiddleware.isAuthenticated,  taxesController.updateTaxes);
router.get('/get-taxes-list', authMiddleware.isAuthenticated,  taxesController.getTaxesList);
router.post('/delete-taxes', authMiddleware.isAuthenticated,  taxesController.deleteTaxes);
router.post('/get-taxes-details', authMiddleware.isAuthenticated,taxesController.viewTaxDetails);


module.exports = router;
 