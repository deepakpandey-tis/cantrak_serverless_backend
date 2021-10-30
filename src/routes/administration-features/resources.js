const express = require('express');
const router = express.Router();

const resourceController = require('../../controllers/administration-features/resources')

const authMiddleware = require('../../middlewares/auth');


router.post('/', authMiddleware.isAuthenticated, resourceController.list);
router.post('/create', authMiddleware.isAuthenticated, resourceController.createResource);

router.get('/get-resource-list', authMiddleware.isAuthenticated, resourceController.getResourceList);
router.get('/:id', authMiddleware.isAuthenticated, resourceController.resourceDetail);
router.get('/generate-resource-and-user-component/:id', authMiddleware.isAuthenticated, resourceController.generateResourceAndUserComponent);
router.post('/update/:id', authMiddleware.isAuthenticated, resourceController.updateResource);
router.post('/update-status/:id', authMiddleware.isAuthenticated, resourceController.updateResourceStatus);

module.exports = router