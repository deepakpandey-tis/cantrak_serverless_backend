const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const containerTypeController = require('../../controllers/administration-features/container-type')

router.post('/add-container-type', authMiddleware.isAuthenticated, containerTypeController.addContainerType)
router.post('/update-container-type', authMiddleware.isAuthenticated, containerTypeController.updateContainerType)
router.post('/toggle-container-type', authMiddleware.isAuthenticated, containerTypeController.toggleContainerType)
router.post('/get-container-type-list', authMiddleware.isAuthenticated, containerTypeController.getContainerTypeList)
router.get('/get-all-container-type', authMiddleware.isAuthenticated, containerTypeController.getAllContainerTypeList)
router.get('/get-container-type-details', authMiddleware.isAuthenticated, containerTypeController.getContainerTypeDetail)

module.exports = router