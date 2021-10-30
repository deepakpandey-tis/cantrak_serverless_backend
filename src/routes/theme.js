const { Router } = require('express')

const router = Router()
const authMiddleware = require('../middlewares/auth')
const themeController = require('../controllers/theme')



/*GET THEME DATA*/
router.get('/get-theme-config', authMiddleware.isAuthenticated, themeController.getOrganisationDetailsForTheme)


module.exports = router;

