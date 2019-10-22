const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const sourceofRequestController = require('../../controllers/administration-features/source-of-request')

router.post('/add-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.addsourceofRequest)
router.post('/update-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.updatesourceofRequest)
router.post('/delete-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.deletesourceofRequest)
router.get('/get-source-of-request-list', authMiddleware.isAuthenticated, sourceofRequestController.getsourceofRequestList)
 //Export Source of Request
router.get('/export-source-of-request', authMiddleware.isAuthenticated, sourceofRequestController.exportsourceofRequest)

module.exports = router