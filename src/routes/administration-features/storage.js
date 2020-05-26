const { Router } = require("express");

const router = Router();
const authMiddleware = require("../../middlewares/auth");
const storageController = require("../../controllers/administration-features/storage");

router.post(
  "/add-storage",
  authMiddleware.isAuthenticated,
  storageController.addStorage
);
module.exports = router;
