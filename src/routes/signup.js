const { Router } = require("express");

const signupController = require("../controllers/signup");
const authMiddleware = require("../middlewares/auth")
const trimmerSpace = require('../middlewares/trimmerSpace');

const router = Router()

router.get('/get-companies-list', signupController.getCompaniesList)
router.get('/get-projects-list-by-company', signupController.getProjectsByCompany)
router.get('/get-buildings-list-by-project', signupController.getBuildingsByProject)
router.get('/get-floor-list-by-building', signupController.getFloorByBuilding)
router.get('/get-unit-list-by-floor', signupController.getUnitByFloor)
router.post('/sign-up-urls', authMiddleware.isAuthenticated, signupController.getSignUpUrls)
router.post(
  "/get-sign-up-form-data-by-uuid",
  signupController.getSignUpFormDataByUUID
);

router.post('/create-user', trimmerSpace.signUpTrimmer, signupController.createUser)

router.post("/addSignUpUrl", signupController.addSignUpUrl);
router.post("/updateSignUpUrl", signupController.updateSignUpUrl);
router.get('/verify-account/:token', signupController.verifyAccount)
router.post('/forgot-password', signupController.forgotPassword)
router.post('/reset-password', signupController.resetPassword)
router.get('/get-user-details', signupController.getUserDetails)
router.get('/reject-account/:token', signupController.rejectAccount)


module.exports = router;