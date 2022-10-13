const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../middlewares/auth')
const roleMiddleware = require('../middlewares/role')
const resourceAccessMiddleware = require('../middlewares/resourceAccessMiddleware');
const traceLotController = require('../controllers/trace-lots');


router.post('/add-trace-lot',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.addTraceLot
);

router.post('/update-trace-lot',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.updateTraceLot
);

router.post('/delete-trace-lot',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.deleteTraceLot
);

router.post('/get-trace-lot-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.gettraceLotList
);

router.post('/get-production-lots',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.getProductionLots
);

router.post('/get-lot-output-items',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.getLotOutputItems
);

router.post('/get-trace-qr-detail',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  // resourceAccessMiddleware.isAccessible,
  traceLotController.getTraceQrDetail
);


router.get('/get-companies',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.getCompanies
);

router.get('/get-species',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.getSpecies
);

router.get('/get-strains',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.getStrains
);

router.get('/get-ums',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  traceLotController.getUMs
);

module.exports = router;
