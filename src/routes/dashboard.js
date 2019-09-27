const { Router } = require('express')

const router = Router()
const authMiddleware = require('../middlewares/auth')
const dashboardController = require('../controllers/dashboard')

//router.get('/dashboard', authMiddleware.isAuthenticated, dashboardController.getDashboardData)
router.get('/top-asset-problem', dashboardController.getTopAssetProblem)

module.exports = router;

