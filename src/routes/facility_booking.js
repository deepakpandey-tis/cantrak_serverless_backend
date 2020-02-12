const Router = require('express').Router;
const authMiddleware = require('../middlewares/auth')
const facilityBookingController = require('../controllers/facility_booking')
const router = Router()

router.get('/', authMiddleware.isAuthenticated,facilityBookingController.test)

module.exports = router;