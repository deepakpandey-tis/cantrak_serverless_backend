const { Router } = require("express")
const authMiddleware = require("../../middlewares/auth")
const userMiddleware = require("../../middlewares/userMiddleware")
const parcelController = require("../../controllers/users/parcel");

const router = Router();

router.post('/get-parcel-list',
    authMiddleware.isAuthenticated,
    userMiddleware.customerInfo, parcelController.getParcelList)


module.exports = router;
