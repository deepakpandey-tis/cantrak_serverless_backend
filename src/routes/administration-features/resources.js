const express = require('express');
const router = express.Router();

const resourceController = require('../../controllers/administration-features/resources')

const authMiddleware = require('../../middlewares/auth');


router.post('/', authMiddleware.isAuthenticated, resourceController.list);
router.post('/create', authMiddleware.isAuthenticated, resourceController.createResource);

router.get('/get-resource-list', authMiddleware.isAuthenticated, resourceController.getResourceList);
router.get('/get-resource-accessible', authMiddleware.isAuthenticated, resourceController.getResourceAccessible);
router.get('/get-resource-list-with-sub-resource/:id', authMiddleware.isAuthenticated, resourceController.getResourceListWithSubResource);
router.get('/get-active-resource-list-with-sub-resource/:id', authMiddleware.isAuthenticated, resourceController.getActiveResourceListWithSubResource);
router.get('/get-active-resource-list-with-sub-resource', authMiddleware.isAuthenticated, resourceController.getActiveResourceListWithSubResource);
router.get('/get-active-resource-list-with-sub-resource-with-display/:id', authMiddleware.isAuthenticated, resourceController.getActiveResourceListWithSubResourceWithDisplay);
router.get('/get-active-resource-list-with-sub-resource-with-display', authMiddleware.isAuthenticated, resourceController.getActiveResourceListWithSubResourceWithDisplay);
router.get('/:id', authMiddleware.isAuthenticated, resourceController.resourceDetail);
router.get('/generate-resource-and-sub-resources/:id', authMiddleware.isAuthenticated, resourceController.generateResourceAndSubResource);
router.post('/update/:id', authMiddleware.isAuthenticated, resourceController.updateResource);
router.post('/update-status/:id', authMiddleware.isAuthenticated, resourceController.updateResourceStatus);

module.exports = router