const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const companyController = require('../../controllers/administration-features/company')

router.post('/add-company', authMiddleware.isAuthenticated, companyController.addCompany)
router.post('/update-company', authMiddleware.isAuthenticated, companyController.updateCompany)
router.post('/view-company', authMiddleware.isAuthenticated, companyController.viewCompany)
router.post('/delete-company', authMiddleware.isAuthenticated, companyController.deleteCompany)
router.get('/get-company-list', authMiddleware.isAuthenticated, companyController.getCompanyList)
// Export Company Data
router.get('/export-company', authMiddleware.isAuthenticated, companyController.exportCompany)
router.get('/company-lists', authMiddleware.isAuthenticated, companyController.getCompanyListForProject)

module.exports = router