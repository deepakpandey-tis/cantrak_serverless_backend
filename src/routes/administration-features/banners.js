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

router.post(
  "/add-theme",
  authMiddleware.isAuthenticated,
  bannersController.addTheme
);

router.get(
  "/get-theme-list",
  authMiddleware.isAuthenticated,
  bannersController.getThemeList
);


module.exports = router;
