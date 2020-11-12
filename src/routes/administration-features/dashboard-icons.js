const Router = require('express').Router
const router = Router()
const dashboardIconsController = require('../../controllers/administration-features/dashboard-icons')
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')

router.get('/get-dashboard-item-list',authMiddleware.isAuthenticated, dashboardIconsController.getDashboardItemsList)

router.post('/add-dashboard-icons',authMiddleware.isAuthenticated,dashboardIconsController.addDashboardIcons)

router.post('/get-dashboard-icons-list',authMiddleware.isAuthenticated,dashboardIconsController.getDashboardIconsList)

router.post('/get-dashboard-icon-details',authMiddleware.isAuthenticated,dashboardIconsController.getDashboardIconDetails)

router.post('/toggle-dashboard-icon',authMiddleware.isAuthenticated,dashboardIconsController.toggleDashboardIconData)

router.post('/update-dashboard-icon-detail',authMiddleware.isAuthenticated,dashboardIconsController.updateDashboardIconDetail)

module.exports = router
