const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const agmController = require("../controllers/agm");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");

router.get("/generate-agm-id", authMiddleware.isAuthenticated, roleMiddleware.parseUserPermission, resourceAccessMiddleware.isAGMAccessible, agmController.generateAGMId );
router.post(
  "/save-agm",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.addAgmPreparation
);
router.post(
  "/add-owner",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.addOwner
);

router.post(
  "/update-owner",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.updateOwner
);


router.post(
  "/delete-owner",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.deleteOwner
);
router.post(
  "/update-eligibility",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.updateEligibility
);
router.post(
  "/get-agm-list",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getAgmList
);
router.post(
  "/get-owner-list",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getOwnerList
);
router.post(
  "/get-agm-details",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getAgmDetails
);
router.post(
  "/owner-proxy-registration",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.ownerProxyRegistration
);
router.post(
  "/get-owner-details",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getOwnerDetails
);
router.post(
  "/get-agenda-list",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getAgendaList
);
router.post(
  "/toggle-eligibility",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.toggleEligibility
);
router.post(
  "/get-units-for-agm",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getUnitList
);

router.post(
  "/get-proxy-document-list",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getProxyDocumentList
);

router.post(
  "/get-unit-by-project",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getUnitListByCompanyAndProject
);

router.post(
  "/get-ownerlist-by-filter",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getOwnerListByUnit
);

router.post(
  "/owner-registration",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.ownerRegistration
);

router.post(
  "/get-owner-signature",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getOwnerSignature
);

router.post(
  "/get-proxy-document-images",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getProxyDocumentImages
)

router.post(
  "/generate-pdf-of-voting-document",
  authMiddleware.isAuthenticated, 
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.generatePdfOfVotingDocument
);

router.post(
  "/check-voting-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.checkVotingStatus
)

router.post(
  "/get-scanned-agenda-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.getScannedAgendaDetail

)

router.post(
  "/save-voting-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.saveVotingData
)

router.get(
  "/get-owner-registration-list",
  // authMiddleware.isAuthenticated,
  // roleMiddleware.parseUserPermission,
  // resourceAccessMiddleware.isAGMAccessible,
  agmController.getOwnerRegistrationList
)

/**IMPORT AGM OWNER DATA */
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
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAGMAccessible,
  agmController.importOwnerData
);

module.exports = router;
