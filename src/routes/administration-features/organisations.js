const { Router } = require("express")

const router = Router()
const authMiddleware = require('../../middlewares/auth')
const applicationRoleMiddleware = require('../../middlewares/applicationRoleMiddleware')
const organisationsController = require('../../controllers/administration-features/organisations')

router.post('/add-organisation', authMiddleware.isAuthenticated,authMiddleware.isAdmin, organisationsController.addOrganisation)
router.post(
  "/get-organisation-list",
  authMiddleware.isAuthenticated,
  applicationRoleMiddleware.isSuperAdmin,
  organisationsController.getOrganisationList
);
router.get('/get-organisation-details', authMiddleware.isAuthenticated,authMiddleware.isAdmin,organisationsController.getOrganisationDetails)
router.post('/update-organisation', authMiddleware.isAuthenticated,authMiddleware.isAdmin, organisationsController.updateOrganisation)
router.post('/delete-organisation',authMiddleware.isAuthenticated,authMiddleware.isAdmin, organisationsController.deleteOrganisation)
module.exports = router