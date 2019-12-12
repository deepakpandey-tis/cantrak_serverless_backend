const express = require('express');
const router = express.Router();

const taxesController = require('../../controllers/administration-features/taxes');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-taxes', authMiddleware.isAuthenticated, authMiddleware.isAdmin, taxesController.addTaxes);
router.post('/update-taxes', authMiddleware.isAuthenticated, authMiddleware.isAdmin, taxesController.updateTaxes);
router.get('/get-taxes-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, taxesController.getTaxesList);
router.post('/delete-taxes', authMiddleware.isAuthenticated, authMiddleware.isAdmin, taxesController.deleteTaxes);
router.post('/get-taxes-details', authMiddleware.isAuthenticated, authMiddleware.isAdmin, taxesController.viewTaxDetails);


module.exports = router;
 