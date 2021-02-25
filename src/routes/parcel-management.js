const express = require('express');
const router = express.Router();

const parcelManageController = require('../controllers/parcel-management');
const authMiddleware = require('../middlewares/auth');
const parcelManagementController = require('../controllers/parcel-management');
const roleMiddleware = require('../middlewares/role');


router.get('/companylist-having-property-units',authMiddleware.isAuthenticated,parcelManageController.getCompanyListHavingPropertyUnit)

router.post('/add-parcel',authMiddleware.isAuthenticated,parcelManageController.addParcelRequest)

router.get('/generate-parcel-id', authMiddleware.isAuthenticated, parcelManageController.generateParcelId)

router.post('/get-parcel-list',authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,parcelManageController.getParcelList)

router.post('/get-parcel-details',authMiddleware.isAuthenticated,parcelManageController.getParcelDetails)

router.post('/get-pending-parcel-list',authMiddleware.isAuthenticated,roleMiddleware.parseUserPermission,parcelManageController.getPendingParcelList)

router.get('/get-tracking-number-list',authMiddleware.isAuthenticated,parcelManageController.getTrackingNumberList)

router.post('/update-parcel-status',authMiddleware.isAuthenticated,parcelManageController.updateParcel)

router.post('/update-parcel-details',authMiddleware.isAuthenticated,parcelManagementController.updateParcelDetails)

router.post('/get-parcel-status',authMiddleware.isAuthenticated,parcelManageController.getParcelStatusForCheckOut)

router.post('/get-qr-code-url',authMiddleware.isAuthenticated,parcelManageController.getQrCodeImageUrl)

router.post('/dispatch-outgoing-parcel',authMiddleware.isAuthenticated,parcelManageController.dispatchOutgoingParcel)

router.post('/approve-pending-status',authMiddleware.isAuthenticated,parcelManageController.approvePendingStatus)

module.exports = router