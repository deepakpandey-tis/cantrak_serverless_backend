const express = require('express');
const router = express.Router();

const whtController = require('../../controllers/administration-features/wht');

const authMiddleware = require('../../middlewares/auth');


/* GET wht listing. */

router.post('/add-wht', authMiddleware.isAuthenticated, authMiddleware.isAdmin, whtController.addWht);
router.post('/update-wht', authMiddleware.isAuthenticated, authMiddleware.isAdmin, whtController.updateWht);
router.get('/get-wht-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, whtController.getWhtList);
router.post('/delete-wht', authMiddleware.isAuthenticated, authMiddleware.isAdmin, whtController.deleteWht);
router.post('/get-wht-details', authMiddleware.isAuthenticated, authMiddleware.isAdmin, whtController.viewWhtDetails);


module.exports = router;
 