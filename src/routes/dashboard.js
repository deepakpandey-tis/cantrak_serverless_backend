const { Router } = require('express')

const router = Router()
const authMiddleware = require('../middlewares/auth')
const dashboardController = require('../controllers/dashboard')

router.get('/top-asset-problem', dashboardController.getTopAssetProblem)
router.get('/get-card-data', authMiddleware.isAuthenticated, dashboardController.getDashboardData)

module.exports = router;

