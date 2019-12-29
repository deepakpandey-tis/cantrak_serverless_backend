const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const organisationsController = require('../../controllers/administration-features/organisations')

router.post('/add-organisation', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.addOrganisation);
router.post('/get-organisation-list', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.getOrganisationList);
router.get('/get-organisation-details', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.getOrganisationDetails);
router.post('/update-organisation', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.updateOrganisation);
router.post('/delete-organisation', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.deleteOrganisation);
module.exports = router;