const express = require('express');
const router = express.Router();

const commonAreaController = require('../../controllers/administration-features/common-area');

const authMiddleware = require('../../middlewares/auth');


/* GET users listing. */

router.post('/add-common-area', authMiddleware.isAuthenticated, authMiddleware.isAdmin, commonAreaController.addCommonArea);
router.post('/update-common-area', authMiddleware.isAuthenticated, authMiddleware.isAdmin, commonAreaController.updateCommonArea);
router.get('/get-common-area-list', authMiddleware.isAuthenticated, authMiddleware.isAdmin, commonAreaController.getCommonAreaList);
router.post('/delete-common-area', authMiddleware.isAuthenticated, authMiddleware.isAdmin, commonAreaController.deleteCommonArea);
router.post('/view-common-area', authMiddleware.isAuthenticated, authMiddleware.isAdmin, commonAreaController.getdetailsCommonArea);


module.exports = router;
 