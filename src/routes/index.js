const express = require("express");
const router = express.Router();

const dbMigrationRouter = require("./db-migration");
const usersRouter = require("./users");
const entranceRouter = require("./entrance");
const userManagementRouter = require("./user-management");
const teamsRouter = require("./teams");
const vendorRouter = require("./vendor");
const plantRouter = require("./plants");
const workPlanRouter = require("./work-plans");
const peopleRouter = require("./people");
const statusRouter = require("./administration-features/status");
const companyRouter = require("./administration-features/company");
const plantationRouter = require("./administration-features/plantation");
const plantContainerRouter = require("./administration-features/plant-container");
const plantationTypeRouter = require("./administration-features/plantation-type");
const administractionUsersRouter = require("./administration-features/administraction-users");
const dashboardRouter = require("./dashboard");
const imageRouter = require("./image");
const fileRouter = require("./file");
const roleRouter = require("./role");
const testRouter = require("./test");
const organisationsRouter = require("./administration-features/organisations");
const themePresetsRouter = require("./administration-features/themePresets");

const pushNotificationRouter = require("./push-notification");
const resourceRouter = require("./resource");
const signupRouter = require("./signup");

const growthStageRouter = require("./administration-features/growth-stages");

const specieRouter = require("./administration-features/species");
const strainRouter = require("./administration-features/strains");
const itemRouter = require("./administration-features/items");
const supplierRouter = require("./administration-features/suppliers");
const customerRouter = require("./administration-features/customers");
const unitOfMeasurementRouter = require("./administration-features/ums");
const locationRouter = require("./administration-features/locations");
const subLocationRouter = require("./administration-features/sub-locations");
const storageLocationRouter = require("./administration-features/storage-locations");
const processRouter = require("./administration-features/processes");
const txnTypeRouter = require("./administration-features/txn-types");
const licenseRouter = require("./licenses");
const inventoryRouter = require("./inventories");
const harvestRouter = require("./harvest");
const productionRouter = require("./production");
const invoiceRouter = require("./invoice");
const reportsRouter = require("./reports");
const misRouter = require("./mis");
const userCustomisationRouter = require("./user-customisation");
const diseaseRouter = require("./administration-features/diseases");
const userDashboardRouter = require("./users/dashboard");
const allUsersRouter = require("./administration-features/all-users");
const remarksRouter = require("./remarks");
const containerTypeRouter = require("./administration-features/container-types");
const facilityTypeMaster = require("./administration-features/plantation-group");
const notificationRouter = require("./notifications");
const announcementRouter = require("./announcement");

const bannersRouter = require("./administration-features/banners");

const dashboardIconRouter = require("./administration-features/dashboard-icons");
const resourceMasterRouter = require("./administration-features/resources");
const orgResourceMasterRouter = require("./administration-features/org-resource");
const orgSubResourceMasterRouter = require("./administration-features/org-sub-resource");
const subResourcesRouter = require("./administration-features/sub-resources");
const themeRouter = require("./theme");
const superadminTenantRouter = require('./superadmin/tenant');

const cropCyclePlanRouter = require("./crop-cycle-plan");
const userActivitiesRouter = require("./user-activities");

const packingRouter = require("./packing");


/* GET home page. */
router.get("/", async (req, res, next) => {
  res.json({ app: "Serverless Express App" });
});

/**
 * Routers
 */


router.use("/theme", themeRouter);
router.use("/push-notification", pushNotificationRouter);
router.use("/test", testRouter);
router.use("/entrance", entranceRouter);
router.use("/users", usersRouter);
router.use("/usermanagement", userManagementRouter);
router.use(
  "/administration-features/company",
  companyRouter
);
router.use(
  "/administration-features/plantation",
  plantationRouter
);
router.use(
  "/administration-features/plant-container",
  plantContainerRouter
);
router.use(
  "/administration-features/plantation-type",
  plantationTypeRouter
);
router.use(
  "/administration-features/administraction-users",
  administractionUsersRouter
);
router.use(
  "/administration-features/all-users",
  allUsersRouter
);

router.use("/administration-features/theme-presets", themePresetsRouter);

router.use("/teams", teamsRouter);
router.use("/vendors", vendorRouter);
router.use("/plants", plantRouter);
router.use("/work-plans", workPlanRouter);
router.use("/people", peopleRouter);
router.use("/administration-features/status", statusRouter);
router.use("/dashboard", dashboardRouter);
router.use("/image", imageRouter);
router.use("/file", fileRouter);
router.use(
  "/administration-features/organisations",
  organisationsRouter
);
router.use("/role", roleRouter);
router.use(
  "/administration-features/resource",
  resourceMasterRouter
);
router.use(
  "/administration-features/org-resource",
  orgResourceMasterRouter
);

router.use(
  "/administration-features/org-sub-resource",
  orgSubResourceMasterRouter
);
router.use(
  "/administration-features/sub-resources",
  subResourcesRouter
);

router.use(
  "/administration-features/growth-stages",
  growthStageRouter
);
router.use(
  "/administration-features/items",
  itemRouter
);
router.use(
  "/administration-features/species",
  specieRouter
);
router.use(
  "/administration-features/strains",
  strainRouter
);
router.use(
  "/administration-features/suppliers",
  supplierRouter
);
router.use(
  "/administration-features/customers",
  customerRouter
);
router.use(
  "/administration-features/locations",
  locationRouter
);
router.use(
  "/administration-features/sub-locations",
  subLocationRouter
);
router.use(
  "/administration-features/storage-locations",
  storageLocationRouter
);
router.use(
  "/administration-features/ums",
  unitOfMeasurementRouter
);
router.use(
  "/administration-features/processes",
  processRouter
);
router.use(
  "/administration-features/txn-types", 
  txnTypeRouter
);
router.use(
  "/license",
  licenseRouter
);
router.use(
  "/inventories",
  inventoryRouter
);
router.use(
  "/harvest",
  harvestRouter
);
router.use(
  "/production",
  productionRouter
);
router.use(
  "/invoice", 
  invoiceRouter
);
router.use(
  "/reports", 
  reportsRouter
);
router.use(
  "/mis", 
  misRouter
);
router.use(
  "/user-customisation", 
  userCustomisationRouter
);
router.use(
  "/administration-features/diseases",
  diseaseRouter
);
router.use("/signup", signupRouter);
router.use("/users/dashboard", userDashboardRouter);
router.use("/remarks", remarksRouter);
router.use(
  "/administration-features/container-types",
  containerTypeRouter
);

router.use("/administration-features/facility-type",facilityTypeMaster);

router.use("/notifications", notificationRouter);

router.use("/administration-features/banners",bannersRouter);

router.use("/announcement", announcementRouter);

router.use("/dashboard-icon", dashboardIconRouter);
router.use("/db-migration",dbMigrationRouter);

router.use("/superadmin/tenant", superadminTenantRouter);

router.use("/crop-cycle-plan", cropCyclePlanRouter);

router.use("/user-activities", userActivitiesRouter);

router.use("/packing", packingRouter);

module.exports = router;
