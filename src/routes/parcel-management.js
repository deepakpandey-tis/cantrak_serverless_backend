const express = require('express');
const router = express.Router();

const parcelManageController = require('../controllers/parcel-management');
const authMiddleware = require('../middlewares/auth');


router.get('/companylist-having-property-units',authMiddleware.isAuthenticated,parcelManageController.getCompanyListHavingPropertyUnit)

router.post('/add-parcel',authMiddleware.isAuthenticated,parcelManageController.addParcelRequest)

router.post('/get-parcel-list',authMiddleware.isAuthenticated,parcelManageController.getParcelList)

router.post('/get-parcel-details',authMiddleware.isAuthenticated,parcelManageController.getParcelDetails)

module.exports = router