const { Router } = require("express")
const authMiddleware = require("../../middlewares/auth")
const userMiddleware = require("../../middlewares/userMiddleware")
const parcelsController = require("../../controllers/users/parcels");

const router = Router();

router.post('/get-user-parcel-listing', authMiddleware.isAuthenticated, userMiddleware.customerInfo,
parcelsController.getUserParcelList);

module.exports = router;
