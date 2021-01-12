const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth");
const agmController = require("../controllers/agm");

router.get("/generate-agm-id",authMiddleware.isAuthenticated,agmController.generateAGMId)
router.post("/save-agm",authMiddleware.isAuthenticated,agmController.addAGMPreparation)


module.exports = router;