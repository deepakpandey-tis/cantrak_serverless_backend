const { Router } = require("express")
const path = require("path");


const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role');
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');

const chargeController = require("../controllers/charge")


router.post('/add-charge',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.addCharge)
router.post('/update-charge',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.updateCharge)

router.post('/delete-charge',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.deleteCharges)

router.post('/get-charges-list',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.getChargesList)

router.post('/add-service-order-fix-charge', authMiddleware.isAuthenticated, chargeController.addServiceOrderFixCharge)
router.post('/add-quotation-fix-charge', authMiddleware.isAuthenticated, chargeController.addQuotationFixCharge)
router.post('/add-service-request-fix-charge', authMiddleware.isAuthenticated, chargeController.addServiceRequestFixCharge)

// Export Charge Data
router.get('/export-charge',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.exportCharge)

router.get('/get-vat-code-list',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.getVatCodeList)

router.get('/get-wht-code-list',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.getWhtCodeList)

router.post('/charges-details',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isBillingAccessible,
    chargeController.getChargesDetails)




/**IMPORT Building DATA */
let tempraryDirectory = null;
if (process.env.IS_OFFLINE) {
    tempraryDirectory = 'tmp/';
} else {
    tempraryDirectory = '/tmp/';
}

var multer = require('multer');
var storage = multer.diskStorage({
    destination: tempraryDirectory,
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname)
        if (ext == '.csv') {
            time = Date.now();
            cb(null, 'buildingPhaseData-' + time + ext);
        } else {
            return false
        }
    }
});

var upload = multer({ storage: storage });
router.post("/import-charge-data", upload.single("file"), authMiddleware.isAuthenticated,
    chargeController.importChargeData);

router.post("/get-quotation-assigned-charges", authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible,
    chargeController.getQuotationAssignedCharges)

router.post("/get-service-order-assigned-charges", authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible,
    chargeController.getServiceOrderAssignedCharges)

router.post("/get-service-request-assigned-charges",
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible,
    chargeController.getServiceRequestAssignedCharges)

router.post("/delete-quotations-assigned-charges/", authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    resourceAccessMiddleware.isCMAccessible,
    chargeController.deleteQuotationAssignedCharges);

module.exports = router;