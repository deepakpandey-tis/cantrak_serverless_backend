const Router = require('express').Router
const router = Router()
const customerMiddleware = require('../../controllers/administration-features/customers')
const authMiddleware = require('../../middlewares/auth')

router.get('/get-customers',authMiddleware.isAuthenticated,customerMiddleware.getCustomers)
router.get('/reset-password',authMiddleware.isAuthenticated,customerMiddleware.resetPassword)
router.post('/disassociate-house',authMiddleware.isAuthenticated,customerMiddleware.disassociateHouse)

module.exports = router