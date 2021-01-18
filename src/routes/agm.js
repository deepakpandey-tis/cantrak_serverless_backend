const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const agmController = require("../controllers/agm");

router.get("/generate-agm-id", authMiddleware.isAuthenticated, agmController.generateAGMId)
router.post("/save-agm", authMiddleware.isAuthenticated, agmController.addAGMPreparation)
router.post("/import-owner-data", authMiddleware.isAuthenticated, agmController.importOwnerData);
router.post("/add-owner", authMiddleware.isAuthenticated, agmController.addOwner);
router.post("/delete-owner", authMiddleware.isAuthenticated, agmController.deleteOwner);
router.post("/update-eligibility", authMiddleware.isAuthenticated, agmController.updateEligibility);
router.post("/get-agm-list", authMiddleware.isAuthenticated, agmController.getAgmList);
router.post("/get-owner-list", authMiddleware.isAuthenticated, agmController.getOwnerList);
router.post("/get-agm-details", authMiddleware.isAuthenticated, agmController.getAgmDetails);
router.post("/owner-proxy-registration", authMiddleware.isAuthenticated, agmController.ownerProxyRegistration);
router.post("/get-owner-details", authMiddleware.isAuthenticated, agmController.getOwnerDetails);
router.post("/get-agenda-list", authMiddleware.isAuthenticated, agmController.getAgendaList);


module.exports = router;
