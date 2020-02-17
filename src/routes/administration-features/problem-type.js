const { Router } = require("express")

const router = Router();
const authMiddleware = require('../../middlewares/auth')
const roleMiddleware = require('../../middlewares/role')
const problemTypeController = require('../../controllers/administration-features/problem-type')
const resourceAccessMiddleware = require('../../middlewares/resourceAccessMiddleware')
router.post('/add-problem-type',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  problemTypeController.addProblemType)

router.post('/update-problem-type',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  problemTypeController.updateProblemType)

router.post('/problem-type-details',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  problemTypeController.viewProblemType)
// router.post('/delete-project', authMiddleware.isAuthenticated, projectController.deleteProject)
router.post('/get-problem-type-list',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  problemTypeController.getProblemTypeList)
/**EXPORT PROBLEM TYPE DATA*/
router.get('/export-problem-type-data',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  problemTypeController.exportProblemTypeData)

/**IMPORT PROBLEM TYPE DATA */
const path = require('path');
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
      cb(null, 'ProblemTypeData-' + time + ext);
    } else {
      return false
    }
  }
});
var upload = multer({ storage: storage });
router.post('/import-problem-type-data', upload.single('file'),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  problemTypeController.importProblemTypeData)

router.post('/toggle-problem-type',
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  problemTypeController.toggleProblemType)
module.exports = router