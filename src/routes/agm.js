const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const agmController = require("../controllers/agm");
const roleMiddleware = require("../middlewares/role");
const resourceAccessMiddleware = require("../middlewares/resourceAccessMiddleware");

router.get(
  "/generate-agm-id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.generateAGMId
);
router.post(
  "/save-agm",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.addAgmPreparation
);
router.post(
  "/add-owner",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.addOwner
);

router.post(
  "/update-owner",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.updateOwner
);

router.post(
  "/delete-owner",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.deleteOwner
);
router.post(
  "/update-eligibility",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.updateEligibility
);
router.post(
  "/get-agm-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getAgmList
);
router.post(
  "/update-agenda",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.updateAgenda
);
router.post(
  "/get-owner-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getOwnerList
);
router.post(
  "/get-agm-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getAgmDetails
);
router.post(
  "/owner-proxy-registration",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.ownerProxyRegistration
);
router.post(
  "/get-owner-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getOwnerDetails
);
router.post(
  "/get-agenda-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getAgendaList
);
router.post(
  "/toggle-eligibility",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.toggleEligibility
);
router.post(
  "/get-units-for-agm",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getUnitList
);

router.post(
  "/get-proxy-document-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getProxyDocumentList
);

router.post(
  "/get-unit-by-project",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getUnitListByCompanyAndProject
);

router.post(
  "/get-ownerlist-by-filter",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getOwnerListByUnit
);

router.post(
  "/owner-registration",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.ownerRegistration
);

router.post(
  "/get-owner-signature",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getOwnerSignature
);

router.post(
  "/get-proxy-document-images",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getProxyDocumentImages
);

router.post(
  "/generate-pdf-of-voting-document",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.generatePdfOfVotingDocument
);

router.post(
  "/check-voting-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.checkVotingStatus
);

router.post(
  "/get-scanned-agenda-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getScannedAgendaDetail
);

router.post(
  "/save-voting-data",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.saveVotingData
);

router.get(
  "/get-owner-registration-list",
  agmController.getOwnerRegistrationList
);

router.post(
  "/get-agenda-summary",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getAgendaVoteSummary
);

router.post(
  "/get-registration-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getRegistrationStatus
);

router.post(
  "/get-vote-result-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getVotingResultList
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
  resourceAccessMiddleware.isAccessible,
  agmController.importOwnerData
);

router.get(
  "/get-dashboard-basic-data/:id",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getDashboardBasicData
);

router.post(
  "/get-ownerlist-by-ownerId",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getOwnerListbyId
);

router.post(
  "/get-unit-list-for-agenda",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getUnitListForVotingResult
);

router.post(
  "/get-voting-detail",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.agmVoteDetail
);

router.post(
  "/get-agenda-choice",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.agmAgendaChoice
);

router.post(
  "/cancle-owner-registration",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.cancleRegistration
);

router.post(
  "/adjust-voting",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.adjustAGMVoting
);

router.post(
  "/export-vote-result",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.exportVoteResult
)

router.post(
  "/get-Vote-result",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  agmController.getVoteRsult
)

module.exports = router;
