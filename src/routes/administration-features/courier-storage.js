const Router = require("express").Router;
const router = Router();

const authMiddleware = require('../../middlewares/auth');
const courierStorageController = require('../../controllers/administration-features/courier-storage');
router.post(
  '/add-courier',
  authMiddleware.isAuthenticated,
  courierStorageController.addCourier
);
router.post(
  '/get-courier-list',
  authMiddleware.isAuthenticated,
  courierStorageController.getCourierList
);

module.exports = router;
