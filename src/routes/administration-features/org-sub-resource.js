const express = require('express');
const router = express.Router();

const subResourceController = require('../../controllers/administration-features/org-sub-resource')

const authMiddleware = require('../../middlewares/auth');


router.post('/', authMiddleware.isAuthenticated, subResourceController.list);
router.get('/:id', authMiddleware.isAuthenticated, subResourceController.subResourcesDetail);
router.post('/update/:id', authMiddleware.isAuthenticated, subResourceController.updateSubResources);
router.post('/reset-sub-resource-position', authMiddleware.isAuthenticated, subResourceController.resetSubResourcePosition);

module.exports = router