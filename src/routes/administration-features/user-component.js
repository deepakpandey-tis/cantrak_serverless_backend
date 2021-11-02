const Router = require('express').Router
const router = Router()
const userComponentController = require('../../controllers/administration-features/user-component')
const authMiddleware = require('../../middlewares/auth')

router.post('/', authMiddleware.isAuthenticated, userComponentController.list);
router.post('/create', authMiddleware.isAuthenticated, userComponentController.createUserComponent);

router.get('/:id', authMiddleware.isAuthenticated, userComponentController.UserComponentDetail);
router.post('/update/:id', authMiddleware.isAuthenticated, userComponentController.updateUserComponent);
router.post('/update-status/:id', authMiddleware.isAuthenticated, userComponentController.updateUserComponentStatus);

module.exports = router
