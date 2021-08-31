const { Router } = require("express");

const router = Router();
const authMiddleware = require("../../middlewares/auth");
const roleMiddleware = require("../../middlewares/role");
// const resourceAcessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const plantationController = require("../../controllers/administration-features/plantation");

router.post(
  "/add-plantation",
  authMiddleware.isAuthenticated,
  plantationController.addPlantation
);
router.post(
  "/update-plantation",
  authMiddleware.isAuthenticated,
  plantationController.updatePlantation
);
router.post(
  "/view-plantation",
  authMiddleware.isAuthenticated,
  plantationController.viewPlantation
);
router.post(
  "/delete-plantation",
  authMiddleware.isAuthenticated,
  plantationController.deletePlantation
);
router.post(
  "/get-plantation-list",
  authMiddleware.isAuthenticated,
  plantationController.getPlantationList
);
/// Export Plantation Data
router.get(
  "/export-plantation",
  authMiddleware.isAuthenticated,
  plantationController.exportPlantation
);
router.get(
  "/get-plantation-by-companies",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  plantationController.getPlantationByCompany
);
router.post(
  "/get-plantation-by-multiple-companies",
  authMiddleware.isAuthenticated,
  plantationController.getPlantationByMultipleCompany
);
router.get(
  "/get-plantation-all-list",
  authMiddleware.isAuthenticated,
  plantationController.getPlantationAllList
);

/**IMPORT Plantation DATA */
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
      cb(null, "PlantationData-" + time + ext);
    } else {
      return false;
    }
  },
});
var upload = multer({ storage: storage });
router.post(
  "/import-plantation-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  plantationController.importPlantationData
);
router.get(
  "/get-user-plantation-by-companies",
  authMiddleware.isAuthenticated,
  plantationController.getUserPlantationByCompany
);

router.get(
  "/plantation-lists-having-plant-containers",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  plantationController.getPlantationListHavingPlantContainers
);

router.post(
  "/get-plantation-by-Id",
  authMiddleware.isAuthenticated,
  plantationController.getPlantationById
);

module.exports = router;
