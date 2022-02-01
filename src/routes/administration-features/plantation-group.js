const { Router } = require("express");

const router = Router();
const authMiddleware = require("../../middlewares/auth");
const plantationGroupController = require("../../controllers/administration-features/plantation-group");
const roleMiddleware = require("../../middlewares/role");
const resourceAccessMiddleware = require("../../middlewares/resourceAccessMiddleware");

router.post(
  "/add-plantation-group",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.addPlantationGroup
);

router.post(
  "/update-plantation-group",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.updatePlantationGroup
);

router.post(
  "/view-plantation-group",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.viewPlantationGroup
);

router.post(
  "/delete-plantation-group",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.deletePlantationGroup
);

router.post(
  "/get-plantation-group-list-by-phase-id",
  authMiddleware.isAuthenticated,
  plantationGroupController.getPlantationGroupListByPhaseId
);

router.post(
  "/get-plantation-group-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.getPlantationGroupList
);

router.get(
  "/export-plantation-group",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.exportPlantationGroup
);

router.get(
  "/get-plantation-group-all-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.getPlantationGroupAllList
);

/**IMPORT DATA */
const path = require("path");
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
      cb(null, "PlantationGroupData-" + time + ext);
    } else {
      return false;
    }
  },
});
var upload = multer({ storage: storage });
router.post(
  "/import-plantation-group-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.importPlantationGroupData
);

router.post(
  "/get-plantation-group-list-by-phase-id-having-property-units",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  plantationGroupController.getPlantationGroupListByPhaseIdHavingPropertyUnits
);


router.post(
  "/get-plantation-group-list-by-phase-id-having-property-units-and-without-units",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  plantationGroupController.getPlantationGroupListByPhaseIdHavingPropertyUnitsAndWithoutUnits
);

router.post(
  "/get-plantation-group-by-multiple-phase",
  authMiddleware.isAuthenticated,
  plantationGroupController.getPlantationGroupByMultiplePhaseId
);

router.post(
  "/get-plantation-groups-for-company",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  plantationGroupController.getPlantationGroupsForCompany
);

module.exports = router;
