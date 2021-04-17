const { Router } = require("express");

const router = Router();
const authMiddleware = require("../../middlewares/auth");
const companyController = require("../../controllers/administration-features/company");
router.post(
  "/add-company",
  authMiddleware.isAuthenticated,
  companyController.addCompany
);
router.post(
  "/update-company",
  authMiddleware.isAuthenticated,
  companyController.updateCompany
);
router.post(
  "/view-company",
  authMiddleware.isAuthenticated,
  companyController.viewCompany
);
router.post(
  "/delete-company",
  authMiddleware.isAuthenticated,
  companyController.deleteCompany
);
router.post(
  "/get-company-list",
  authMiddleware.isAuthenticated,
  companyController.getCompanyList
);
// Export Company Data
router.post(
  "/export-csv-company-data",
  authMiddleware.isAuthenticated,
  companyController.exportCsvCompanyData
);
// Get Company List For Project
router.get(
  "/company-lists",
  authMiddleware.isAuthenticated,
  companyController.getCompanyListForProject
);

/**IMPORT COMPANY DATA */
const path = require("path");
let tempraryDirectory = null;
if (process.env.IS_OFFLINE) {
  tempraryDirectory = "tmp/";
} else {
  tempraryDirectory = "/tmp/";
}
var multer = require("multer");
const roleMiddleware = require("../../middlewares/role");
const resourceAccessMiddleware = require("../../middlewares/resourceAccessMiddleware");
var storage = multer.diskStorage({
  destination: tempraryDirectory,
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    if (ext === ".csv" || ext === ".xlsx") {
      time = Date.now();
      cb(null, "companyData-" + time + ext);
    } else {
      return false;
    }
  },
});
var upload = multer({ storage: storage });
router.post(
  "/import-company-data",
  upload.single("file"),
  authMiddleware.isAuthenticated,
  companyController.importCompanyData
);
router.get(
  "/user-company-lists",
  authMiddleware.isAuthenticated,
  companyController.getUserCompanyList
);

// GET COMPANY LIST HAVING PROPERTY UNITS
router.get(
  "/company-lists-having-property-units",
  authMiddleware.isAuthenticated,
  companyController.getCompanyListHavingPropertyUnits
);

router.post(
  "/get-company-by-Id",
  authMiddleware.isAuthenticated,
  companyController.getCompanyById
);
router.get(
  "/get-organization-users-list",
  authMiddleware.isAuthenticated,
  companyController.getOrgUserList
);
router.post(
  "/validate-company-admin",
  authMiddleware.isAuthenticated,
  companyController.validateCompanyAdmin
);
router.get(
  "/get-company-for-service",
  authMiddleware.isAuthenticated,
  roleMiddleware.parseUserPermission,
  resourceAccessMiddleware.isCMAccessible,
  companyController.getCompanyForService
)
module.exports = router;
