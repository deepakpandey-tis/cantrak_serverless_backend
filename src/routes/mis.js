const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const misController = require('../controllers/mis');


router.post('/get-batch-lotnos',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  misController.getBatchLotNos
);

router.post('/get-product-lotno-detail',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  misController.getProductLotNoDetail
);

router.post('/get-raw-material-lotno-detail',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  misController.getRawMaterialLotNoDetail
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  misController.getCompanies
);

module.exports = router;
