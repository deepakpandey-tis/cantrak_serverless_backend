const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const organisationsController = require('../../controllers/administration-features/organisations');
const trimmerSpace = require('../../middlewares/trimmerSpace');


router.post('/add-organisation', authMiddleware.isAuthenticated, trimmerSpace.signUpTrimmer, authMiddleware.isSuperAdmin, organisationsController.addOrganisation);
router.post('/get-organisation-list', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.getOrganisationList);
router.get('/get-organisation-details', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.getOrganisationDetails);
router.get('/get-organisation-details-admin', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.getOrganisationDetailsForAdmin);
router.get('/get-organisation-details-user', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.getOrganisationDetailsForUser);
router.post('/update-organisation', authMiddleware.isAuthenticated, trimmerSpace.signUpTrimmer, authMiddleware.isSuperAdmin, organisationsController.updateOrganisation);
router.post('/delete-organisation', authMiddleware.isAuthenticated, authMiddleware.isSuperAdmin, organisationsController.deleteOrganisation);
/*GET ALL ORGANISATION LIST FOR DROP DOWN */
router.get('/get-organisation-all-list', authMiddleware.isAuthenticated, organisationsController.getOrganisationAllList);
module.exports = router;