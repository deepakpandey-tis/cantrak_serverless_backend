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

module.exports = router;
