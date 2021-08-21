const { Router } = require("express");
const path = require("path");

const router = Router();
const authMiddleware = require("../../middlewares/auth");

const plantationPhaseController = require("../../controllers/administration-features/plantation-phase");
const roleMiddleware = require("../../middlewares/role");
const resourceAccessMiddleware = require("../../middlewares/resourceAccessMiddleware");

router.post(
  "/add-plantation-phase",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  plantationPhaseController.addPlantationPhase
);

router.post(
  "/update-plantation-phase",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  plantationPhaseController.updatePlantationPhase
);

router.post(
  "/view-plantation-phase",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  plantationPhaseController.viewPlantationPhase
);

router.post(
  "/delete-plantation-phase",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  plantationPhaseController.deletePlantationPhase
);

router.post(
  "/get-plantation-phase-by-project-id",
  authMiddleware.isAuthenticated,
  plantationPhaseController.getPlantationPhaseListByProjectId
);

router.post(
  "/get-plantation-by-multiple-project",
  authMiddleware.isAuthenticated,
  plantationPhaseController.getPlantationPhaseListByMultipleProjectId
);

router.post(
  "/get-plantation-phase-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  plantationPhaseController.getPlantationPhaseList
);
// Export Plantation Phase
router.get(
  "/export-plantation-phase",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  plantationPhaseController.exportPlantationPhase
);

router.get(
  "/get-plantations-phases-all-list",
  authMiddleware.isAuthenticated,
  plantationPhaseController.getPlantationPhaseAllList
);

router.get(
  "/get-plantation-phase",
  authMiddleware.isAuthenticated,
  plantationPhaseController.getPlantationPhase
);

/**IMPORT Plantation DATA */
let tempraryDirectory = null;
if (process.env.IS_OFFLINE) {
  tempraryDirectory = "tmp/";
} else {
  tempraryDirectory = "/tmp/";
}
var multer = require("multer");
var storage = multer.diskStorage({
  destination: tempraryDirectory,
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    if (ext == ".csv") {
      time = Date.now();
      cb(null, "PlantationPhaseData-" + time + ext);
    } else {
      return false;
    }
  },
});
var upload = multer({ storage: storage });
router.post(
  "/import-plantation-data",
  // upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isPropertySetupAccessible,
  plantationPhaseController.importPlantationData
);

router.get(
  "/get-plantation-phase-all-list-having-property-units",
  roleMiddleware.parseUserPermission,
  plantationPhaseController.getPlantationPhaseAllListHavingPropertyUnits
);

router.get(
  "/get-plantation-phase-all-list-having-property-units-and-without-units",
  roleMiddleware.parseUserPermission,
  plantationPhaseController.getPlantationPhaseAllListHavingPropertyUnitsAndWithoutUnits
);

router.post(
  "/get-plantation-phase-by-Id",
  authMiddleware.isAuthenticated,
  plantationPhaseController.getPlantationPhaseById
);

router.get(
  "/get-unit-list-by-plantation-id",
  roleMiddleware.parseUserPermission,
  plantationPhaseController.getUnitListByPlantationId
);

router.get(
  "/generate-plantation-id",
  authMiddleware.isAuthenticated,
  plantationPhaseController.generatePlantationId
)

router.post(
  "/add-plantation-info",
  authMiddleware.isAuthenticated,
  plantationPhaseController.addPlantationInfo
)

router.post(
  "/add-contact-info",
  authMiddleware.isAuthenticated,
  plantationPhaseController.addContactInfo
)

router.post(
  "/get-plantation-info",
  authMiddleware.isAuthenticated,
  plantationPhaseController.getPlantationInfoByPlantationId
)

router.post(
  "/get-contact-info",
  authMiddleware.isAuthenticated,
  plantationPhaseController.getContactInfoById
)

module.exports = router;
