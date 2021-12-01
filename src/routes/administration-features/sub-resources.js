const Router = require('express').Router
const router = Router()
const subResourcesController = require('../../controllers/administration-features/sub-resources')
const authMiddleware = require('../../middlewares/auth')

router.post('/', authMiddleware.isAuthenticated, subResourcesController.list);
router.post('/create', authMiddleware.isAuthenticated, subResourcesController.createSubResources);

router.get('/:id', authMiddleware.isAuthenticated, subResourcesController.SubResourcesDetail);
router.post('/update/:id', authMiddleware.isAuthenticated, subResourcesController.updateSubResources);
router.post('/update-status/:id', authMiddleware.isAuthenticated, subResourcesController.updateSubResourcesStatus);

module.exports = router
