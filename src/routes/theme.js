const { Router } = require('express')

const router = Router()
const authMiddleware = require('../middlewares/auth')
const themeController = require('../controllers/theme')
const themePresetsController = require('../controllers/administration-features/themePresets')



/*GET THEME DATA*/
router.get('/get-theme-config', authMiddleware.isAuthenticated, themeController.getOrganisationDetailsForTheme)
router.get(
    '/get-all-theme-presets-list',
    authMiddleware.isAuthenticated,
    themePresetsController.getAllThemePresetsList
)

module.exports = router;

