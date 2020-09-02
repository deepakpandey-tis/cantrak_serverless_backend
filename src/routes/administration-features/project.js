const { Router } = require("express");

const router = Router();
const authMiddleware = require("../../middlewares/auth");
const roleMiddleware = require("../../middlewares/role");
// const resourceAcessMiddleware = require('../../middlewares/resourceAccessMiddleware')
const projectController = require("../../controllers/administration-features/project");

router.post(
  "/add-project",
  authMiddleware.isAuthenticated,
  projectController.addProject
);
router.post(
  "/update-project",
  authMiddleware.isAuthenticated,
  projectController.updateProject
);
router.post(
  "/view-project",
  authMiddleware.isAuthenticated,
  projectController.viewProject
);
router.post(
  "/delete-project",
  authMiddleware.isAuthenticated,
  projectController.deleteProject
);
router.post(
  "/get-project-list",
  authMiddleware.isAuthenticated,
  projectController.getProjectList
);
/// Export Project Data
router.get(
  "/export-project",
  authMiddleware.isAuthenticated,
  projectController.exportProject
);
router.get(
  "/get-project-by-companies",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  projectController.getProjectByCompany
);
router.post(
  "/get-project-by-multiple-companies",
  authMiddleware.isAuthenticated,
  projectController.getProjectByMultipleCompany
);
router.get(
  "/get-project-all-list",
  authMiddleware.isAuthenticated,
  projectController.getProjectAllList
);

/**IMPORT PROJECT DATA */
const path = require("path");
let tempraryDirectory = null;
if (process.env.IS_OFFLINE) {
  tempraryDirectory = "tmp/";
} else {
  tempraryDirectory = "/tmp/";
}
var multer = require("multer");
var storage = multer.diskStorage({
  destination: tempraryDirectory,
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    if (ext == ".csv") {
      time = Date.now();
      cb(null, "ProjectData-" + time + ext);
    } else {
      return false;
    }
  },
});
var upload = multer({ storage: storage });
router.post(
  "/import-project-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  projectController.importProjectData
);
router.get(
  "/get-user-project-by-companies",
  authMiddleware.isAuthenticated,
  projectController.getUserProjectByCompany
);

router.get(
  "/project-lists-having-property-units",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  projectController.getProjectListHavingPropertyUnits
);

router.post(
  "/get-project-by-Id",
  authMiddleware.isAuthenticated,
  projectController.getProjectById
);

module.exports = router;
