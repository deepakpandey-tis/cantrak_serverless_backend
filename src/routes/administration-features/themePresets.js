const { Router } = require("express");
const router = Router();
const authMiddleware = require("../../middlewares/auth");
const themePresetsController = require("../../controllers/administration-features/themePresets");


router.get(
    '/get-all-theme-presets-list',
    authMiddleware.isAuthenticated,
    themePresetsController.getAllThemePresetsList
)

router.post(
    '/get-theme-presets-list',
    authMiddleware.isAuthenticated,
    themePresetsController.getThemePresetsList
)

module.exports = router;