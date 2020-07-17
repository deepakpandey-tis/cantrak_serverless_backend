const { Router } = require("express")

const router = Router()
const authMiddleware = require("../../middlewares/auth");
// const facilityTypeController = require("../../controllers/administration-features/facility-type");
const FacilityTypeController = require("../../controllers/administration-features/facility-type");

router.post("/add-facility-type",authMiddleware.isAuthenticated,FacilityTypeController.addFacilityType)

router.post("/get-facility-type-list",authMiddleware.isAuthenticated,FacilityTypeController.getFacilityTypeList)

router.post("/update-facility-type",authMiddleware.isAuthenticated,FacilityTypeController.updateFacilityType)

router.post("/get-facility-type-detail",authMiddleware.isAuthenticated,FacilityTypeController.getFacilityTypeDetail)

router.post("/toggle-facility-type",authMiddleware.isAuthenticated,FacilityTypeController.toggleFacilityType)

router.get("/get-facility-type",authMiddleware.isAuthenticated,FacilityTypeController.getFacilityTypeListForDropdown)

// router.post("/get-facility-type-detail",authMiddleware.isAuthenticated,FacilityTypeController.get)

module.exports = router;

