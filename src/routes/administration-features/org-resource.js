const express = require('express');
const router = express.Router();

const resourceController = require('../../controllers/administration-features/org-resource')

const authMiddleware = require('../../middlewares/auth');


router.post('/', authMiddleware.isAuthenticated, resourceController.list);
router.get('/:id', authMiddleware.isAuthenticated, resourceController.resourceDetail);
router.post('/update/:id', authMiddleware.isAuthenticated, resourceController.updateResource);

module.exports = router