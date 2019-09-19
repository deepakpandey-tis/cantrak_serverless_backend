const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const companyController = require('../../controllers/administration-features/company')

router.post('/add-company', authMiddleware.isAuthenticated, companyController.addCompany)
router.post('/update-company', authMiddleware.isAuthenticated, companyController.updateCompany)

module.exports = router