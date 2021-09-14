const { Router } = require("express")
const path = require("path")
const router = Router()
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware');
const specieController = require('../../controllers/administration-features/species');


router.post('/get-specie-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.getSpecieList
);

router.get('/get-species',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.getSpecies
);

router.post('/get-specie',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.getSpecie
);

router.post('/add-specie',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.addSpecie
);

router.post('/update-specie',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.updateSpecie
);

router.post('/delete-specie',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.deleteSpecie
);

router.get('/export-species',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.exportSpecies
);

// Import Species
let tempraryDirectory = null;
if (process.env.IS_OFFLINE) {
  tempraryDirectory = 'tmp/';
} else {
  tempraryDirectory = '/tmp/';
}
var multer = require('multer');
var storage = multer.diskStorage({
  destination: tempraryDirectory,
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname)
    if (ext == '.csv') {
      time = Date.now();
      cb(null, 'SpeciesData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post(
  "/import-species",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAssetAccessible,
  specieController.importSpecies
);

module.exports = router;
