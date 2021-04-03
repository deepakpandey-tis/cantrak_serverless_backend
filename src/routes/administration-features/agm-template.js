const {Router} = require('express');
const router = Router();
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const agmTemplateController = require('../../controllers/administration-features/agm-template');


router.post(
    '/create-agm-template',
    authMiddleware.isAuthenticated,
    agmTemplateController.createAGMTemplate
)

router.post(
    '/get-agm-template-list',
    authMiddleware.isAuthenticated,
    agmTemplateController.getAGMTemplateList
)

router.post(
    '/get-agm-template-details',
    authMiddleware.isAuthenticated,
    agmTemplateController.getAGMTemplateDetail
)

router.post(
    '/update-agm-proxy-template',
    authMiddleware.isAuthenticated,
    agmTemplateController.updateTemplate
)

module.exports = router;