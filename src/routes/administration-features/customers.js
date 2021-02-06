const Router = require('express').Router
const router = Router()
const customerMiddleware = require('../../controllers/administration-features/customers')
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const trimmerSpace = require('../../middlewares/trimmerSpace');


router.post('/get-customers',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    customerMiddleware.getCustomers)
router.get('/reset-password', authMiddleware.isAuthenticated, customerMiddleware.resetPassword)
router.post('/disassociate-house', authMiddleware.isAuthenticated, customerMiddleware.disassociateHouse)

router.post('/create-customer', authMiddleware.isAuthenticated, trimmerSpace.signUpTrimmer, customerMiddleware.createCustomer)
router.post('/update-customer', authMiddleware.isAuthenticated, trimmerSpace.signUpTrimmer, customerMiddleware.updateCustomer)

router.get('/export-tenant-data',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    customerMiddleware.exportTenantData)

router.post('/import-tenant-data',
    authMiddleware.isAuthenticated,
    roleMiddleware.parseUserPermission,
    customerMiddleware.importTenantData)

router.post('/get-tenant-list-by-multiple-unit', authMiddleware.isAuthenticated, customerMiddleware.getTenantListByMultiplePropertyUnits)
router.post('/get-inactive-customers', authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, customerMiddleware.getInactiveCustomers)
router.post('/get-tenant-list-by-projects',authMiddleware.isAuthenticated,customerMiddleware.getTenantListByProject)

module.exports = router