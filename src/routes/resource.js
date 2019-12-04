const Router = require('express').Router;

const router = Router()
const authMiddleware = require('../middlewares/auth')
const resourceController = require('../controllers/resource')

router.get("/get-resource-list",authMiddleware.isAuthenticated, resourceController.getResourceList);

module.exports = router;