const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const agmController = require("../controllers/agm");

router.get(
  "/generate-agm-id",
  authMiddleware.isAuthenticated,
  agmController.generateAGMId
);
router.post(
  "/save-agm",
  authMiddleware.isAuthenticated,
  agmController.addAgmPreparation
);
router.post(
  "/add-owner",
  authMiddleware.isAuthenticated,
  agmController.addOwner
);
router.post(
  "/delete-owner",
  authMiddleware.isAuthenticated,
  agmController.deleteOwner
);
router.post(
  "/update-eligibility",
  authMiddleware.isAuthenticated,
  agmController.updateEligibility
);
router.post(
  "/get-agm-list",
  authMiddleware.isAuthenticated,
  agmController.getAgmList
);
router.post(
  "/get-owner-list",
  authMiddleware.isAuthenticated,
  agmController.getOwnerList
);
router.post(
  "/get-agm-details",
  authMiddleware.isAuthenticated,
  agmController.getAgmDetails
);
router.post(
  "/owner-proxy-registration",
  authMiddleware.isAuthenticated,
  agmController.ownerProxyRegistration
);
router.post(
  "/get-owner-details",
  authMiddleware.isAuthenticated,
  agmController.getOwnerDetails
);
router.post(
  "/get-agenda-list",
  authMiddleware.isAuthenticated,
  agmController.getAgendaList
);
router.post(
  "/toggle-eligibility",
  authMiddleware.isAuthenticated,
  agmController.toggleEligibility
);
router.get(
  "/get-units-for-agm",
  authMiddleware.isAuthenticated,
  // roleMiddleware.parseUserPermission,
  agmController.getUnitList
);

router.post(
  "/get-proxy-document-list",
  authMiddleware.isAuthenticated,
  agmController.getProxyDocumentList
);

router.post(
  "/get-unit-by-project",
  authMiddleware.isAuthenticated,
  agmController.getUnitListByCompanyAndProject
);

router.post(
  "/get-ownerlist-by-filter",
  authMiddleware.isAuthenticated,
  agmController.getOwnerListByUnit
);

/**IMPORT AGM OWNER DATA */
const path = require("path");
let tempraryDirectory = null;
if (process.env.IS_OFFLINE) {
  tempraryDirectory = "tmp/";
} else {
  tempraryDirectory = "/tmp/";
}
var multer = require("multer");
const roleMiddleware = require("../middlewares/role");
var storage = multer.diskStorage({
  destination: tempraryDirectory,
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    if (ext === ".csv" || ext === ".xlsx") {
      time = Date.now();
      cb(null, "ownerData-" + time + ext);
    } else {
      return false;
    }
  },
});
var upload = multer({ storage: storage });
router.post(
  "/import-owner-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  agmController.importOwnerData
);

module.exports = router;
