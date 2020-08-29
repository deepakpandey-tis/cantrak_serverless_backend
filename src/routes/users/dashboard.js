const { Router } = require("express")
const authMiddleware = require("../../middlewares/auth")
const userMiddleware = require("../../middlewares/userMiddleware")
const dashboardController = require("../../controllers/users/dashboard");

const router = Router();

/*GET DASHBOARD CARD DATA */
router.get('/get-card-data', authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, dashboardController.getDashboardData)

/*GET BANNERS CARD DATA */
router.get('/get-banners', authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, dashboardController.getBannerList)

/*GET THEME DATA*/
router.get('/get-theme', authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, dashboardController.getThemeSetting);
module.exports = router;
