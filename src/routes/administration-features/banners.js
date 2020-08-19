const { Router } = require("express");

const router = Router();

const authMiddleware = require("../../middlewares/auth");
const bannersController = require("../../controllers/administration-features/banners");
router.post(
  "/add-banner",
  authMiddleware.isAuthenticated,
  bannersController.addBanner
);
router.get(
  "/get-banner-list",
  authMiddleware.isAuthenticated,
  bannersController.getBannerList
);

router.post(
  "/toggle-banner",
  authMiddleware.isAuthenticated,
  bannersController.toggleBanners
);


module.exports = router;
