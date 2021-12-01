const { Router } = require("express");

const router = Router();
const authMiddleware = require("../../middlewares/auth");
const problemController = require("../../controllers/administration-features/problem");
const roleMiddleware = require("../../middlewares/role");
const resourceAccessMiddleware = require("../../middlewares/resourceAccessMiddleware");

router.post(
  "/get-problem-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  problemController.getProblems
);
// Export SUBCATEGORY Problem Data
router.get(
  "/export-problem-subcategory",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  problemController.exportProblem
);

router.get(
  "/get-category-list",
  authMiddleware.isAuthenticated,
  problemController.getIncidentCategories
);

router.post(
  "/get-subcategories-by-category",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  problemController.getSubcategories
);

router.get(
  "/get-problem-details",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  problemController.getProblemDetails
);

/**IMPORT PROBLEM SUB CATEGORY DATA */
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
      cb(null, "ProblemSubcategoryData-" + time + ext);
    } else {
      return false;
    }
  },
});
var upload = multer({ storage: storage });
router.post(
  "/import-problem-subcategory-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  problemController.importProblemSubCategoryData
);
router.post(
  "/toggle-problem-status",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isAccessible,
  problemController.deleteProblem
);
router.post(
  "/get-sub-category-problem-list",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  problemController.getSubcategoriesProblem
)
module.exports = router;
