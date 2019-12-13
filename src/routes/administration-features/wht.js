const express = require('express');
const router = express.Router();

const whtController = require('../../controllers/administration-features/wht');

const authMiddleware = require('../../middlewares/auth');


/* GET wht listing. */

router.post('/add-wht', authMiddleware.isAuthenticated,  whtController.addWht);
router.post('/update-wht', authMiddleware.isAuthenticated,  whtController.updateWht);
router.get('/get-wht-list', authMiddleware.isAuthenticated,  whtController.getWhtList);
router.post('/delete-wht', authMiddleware.isAuthenticated,  whtController.deleteWht);
router.post('/get-wht-details', authMiddleware.isAuthenticated,  whtController.viewWhtDetails);


module.exports = router;
 