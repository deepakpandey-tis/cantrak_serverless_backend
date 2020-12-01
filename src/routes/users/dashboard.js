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

    /*GET ANNOUNCEMENT DATA*/
router.get('/get-announcements', authMiddleware.isAuthenticated,
userMiddleware.customerInfo, dashboardController.getAnnouncementList);

/*GET ANNOUNCEMENT DETAILS*/
router.post('/get-announcements-details', authMiddleware.isAuthenticated,
userMiddleware.customerInfo, dashboardController.getAnnouncementDetails);

/*GET BUILDING DATA*/
router.get('/get-building-info', authMiddleware.isAuthenticated,
userMiddleware.customerInfo, dashboardController.getBuildingList);

/*GET CONTACT DATA*/
router.get('/get-contact-info', authMiddleware.isAuthenticated,
userMiddleware.customerInfo, dashboardController.getContactList);

/*GET USER DATA*/
router.get('/get-user-info', authMiddleware.isAuthenticated,
userMiddleware.customerInfo, dashboardController.getUsersInfo);

/*GET USER DATA*/
router.get('/get-user-access-controls', authMiddleware.isAuthenticated,
userMiddleware.customerInfo, dashboardController.getUsersAccessControls);



module.exports = router;
