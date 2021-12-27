const express = require("express");
const router = express.Router();

const dbMigrationRouter = require("./db-migration");
const usersRouter = require("./users");
const entranceRouter = require("./entrance");
const userManagementRouter = require("./user-management");
//const serviceRequestRouter = require("./servicerequest");
//const serviceDetailsRouter = require("./servicedetails");
// const propertySetupRouter = require("./administration-features/property-setup");
// const propertyCategoryRouter = require("./administration-features/property-category");
// const propertySubCategoryRouter = require("./administration-features/property-subcategory");
// const generalSetupRouter = require("./administration-features/general-setup");
const teamsRouter = require("./teams");
const vendorRouter = require("./vendor");
//const partsRouter = require("./parts");
// const assetRouter = require("./asset");
const plantRouter = require("./plants");
const workPlanRouter = require("./work-plans");
const peopleRouter = require("./people");
//const surveyOrderRouter = require("./survey-order");
//const quotationRouter = require("./quotations");
//const serviceOrderRouter = require("./service-order");
//const chargeRouter = require("./charge");
// const commonAreaRouter = require("./administration-features/common-area");
const statusRouter = require("./administration-features/status");
const companyRouter = require("./administration-features/company");
const plantationRouter = require("./administration-features/plantation");
// const plantationPhaseRouter = require("./administration-features/plantation-phase");
// const plantationGroupRouter = require("./administration-features/plantation-group");
const plantContainerRouter = require("./administration-features/plant-container");
// const satisfactionRouter = require("./administration-features/satisfaction");
//const taxesRouter = require("./administration-features/taxes");
//const problemRouter = require("./administration-features/problem");
const plantationTypeRouter = require("./administration-features/plantation-type");
// const sourceofRequestRouter = require("./administration-features/source-of-request");
const administractionUsersRouter = require("./administration-features/administraction-users");
const dashboardRouter = require("./dashboard");
const imageRouter = require("./image");
// const imageRekognitionRouter = require("./image-rekognition");
const fileRouter = require("./file");
// const workRouter = require("./work-plan");
const roleRouter = require("./role");
const testRouter = require("./test");
// const taskGroupRouter = require("./administration-features/task-group");
const organisationsRouter = require("./administration-features/organisations");
const themePresetsRouter = require("./administration-features/themePresets");

const pushNotificationRouter = require("./push-notification");
const resourceRouter = require("./resource");
const signupRouter = require("./signup");

// const problemTypeRouter = require("./administration-features/problem-type");
const growthStageRouter = require("./administration-features/growth-stages");
//const strainRouter = require("./administration-features/strain");


const specieRouter = require("./administration-features/species");
const strainRouter = require("./administration-features/strains");
const itemRouter = require("./administration-features/items");
const supplierRouter = require("./administration-features/suppliers");
const customerRouter = require("./administration-features/customers");
const licenseRouter = require("./administration-features/licenses");
const unitOfMeasurementRouter = require("./administration-features/ums");
const locationRouter = require("./administration-features/locations");
const storageLocationRouter = require("./administration-features/storage-locations");
const processRouter = require("./administration-features/processes");
const txnTypeRouter = require("./administration-features/txn-types");
const inventoryRouter = require("./inventories");
const harvestRouter = require("./harvest");
const productionRouter = require("./production");
const invoiceRouter = require("./invoice");
const misRouter = require("./mis");
const userCustomisationRouter = require("./user-customisation");
const reportRouter = require("./administration-features/reports");


//const partCategoryRouter = require("./administration-features/part-category");
//const whtRouter = require("./administration-features/wht");
//const customerRouter = require("./administration-features/customers");
//const serviceUserRequestsRouter = require("./users/servicerequest");
// const surveyUserOrderRouter = require("./users/surveyorder");
//const serviceAppointmentRouter = require("./users/service-appointment");
// const quotationUserRouter = require("./users/quotations");
// const sharedListingRouter = require("./shared-listing");
//const facilityBookingRouter = require("./facility_booking");
//const serviceUserDetailsRouter = require("./users/servicedetails");
const userDashboardRouter = require("./users/dashboard");
const allUsersRouter = require("./administration-features/all-users");
const remarksRouter = require("./remarks");
// const userFacilityRouter = require("./users/facility");
//const containerTypeRouter = require("./administration-features/container-type");
const containerTypeRouter = require("./administration-features/container-types");
//const courierRouter = require("./administration-features/courier-storage");
// const storageRouter = require("./administration-features/storage");
//const parcelManagementRouter = require("./parcel-management");
// const facilityDashboardRouter = require("./facility_dashboard");
const facilityTypeMaster = require("./administration-features/plantation-group");
const notificationRouter = require("./notifications");
//const parcelNotificationRouter = require("./parcel-notification");
const serviceRequestNotificationRouter = require("./service-request-notification");
const announcementRouter = require("./announcement");

const bannersRouter = require("./administration-features/banners");

const dashboardIconRouter = require("./administration-features/dashboard-icons");

//const parcelTypeRouter = require("./administration-features/parcel-type");

//const billPaymentRouter = require("./bill-payment");
const resourceMasterRouter = require("./administration-features/resources");
const orgResourceMasterRouter = require("./administration-features/org-resource");
const orgSubResourceMasterRouter = require("./administration-features/org-sub-resource");
const subResourcesRouter = require("./administration-features/sub-resources");
const themeRouter = require("./theme");
const superadminTenantRouter = require('./superadmin/tenant');



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
//router.use("/servicerequest", serviceRequestRouter);
//router.use("/servicedetails", serviceDetailsRouter);
// router.use("/administration-features/property-setup", propertySetupRouter);
// router.use(
//   "/administration-features/property-category",
//   propertyCategoryRouter
// );
// router.use(
//   "/administration-features/property-subcategory",
//   propertySubCategoryRouter
// );
// router.use(
//   "/administration-features/general-setup",
//   generalSetupRouter
// );
router.use(
  "/administration-features/company",
  companyRouter
);
router.use(
  "/administration-features/plantation",
  plantationRouter
);
// router.use(
//   "/administration-features/plantation-phase",
//   plantationPhaseRouter
// );
router.use(
  "/administration-features/plant-container",
  plantContainerRouter
);
router.use(
  "/administration-features/plantation-type",
  plantationTypeRouter
);
// router.use(
//   "/administration-features/source-of-request",
//   sourceofRequestRouter
// );
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
//router.use("/parts", partsRouter);
// router.use("/asset", assetRouter);
router.use("/plants", plantRouter);
router.use("/work-plans", workPlanRouter);
router.use("/people", peopleRouter);
//router.use("/survey-order", surveyOrderRouter);
//router.use("/quotations", quotationRouter);
//router.use("/service-order", serviceOrderRouter);
//router.use("/charge", chargeRouter);
// router.use(
//   "/administration-features/common-area",
//   commonAreaRouter
// );
router.use("/administration-features/status", statusRouter);
// router.use(
//   "/administration-features/plantation-group",
//   plantationGroupRouter
// );
// router.use(
//   "/administration-features/satisfaction",
//   satisfactionRouter
// );
//router.use("/administration-features/taxes", taxesRouter);
// router.use(
//   "/administration-features/problem",
//   problemRouter
// );
router.use("/dashboard", dashboardRouter);
// router.use(
//   "/administration-features/problem",
//   problemRouter
// );
router.use("/image", imageRouter);
// router.use("/image-rekognition", imageRekognitionRouter);
router.use("/file", fileRouter);
// router.use("/work-plan", workRouter);
// router.use("/task-group", taskGroupRouter);
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
// router.use(
//   "/administration-features/resource",
//   resourceRouter
// );
// router.use(
//   "/administration-features/problem-type",
//   problemTypeRouter
// );





// router.use(
//   "/administration-features/strain",
//   strainRouter
// );

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
  "/administration-features/licenses",
  licenseRouter
);
router.use(
  "/administration-features/locations",
  locationRouter
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
  "/mis", 
  misRouter
);
router.use(
  "/user-customisation", 
  userCustomisationRouter
);
router.use(
  "/administration-features/reports", 
  reportRouter
);
  



// router.use(
//   "/administration-features/part-category",
//   partCategoryRouter
// );
// router.use("/administration-features/wht", whtRouter);
router.use("/signup", signupRouter);
// router.use(
//   "/administration-features/customers",
//   customerRouter
// );
// router.use(
//   "/users/servicerequest",
//   serviceUserRequestsRouter
// );
//router.use("/users/surveyorder", surveyUserOrderRouter);
// router.use(
//   "/users/service-appointment",
//   serviceAppointmentRouter
// );
//router.use("/users/quotations", quotationUserRouter);
// router.use("/shared-listing", sharedListingRouter);
// router.use(
//   "/users/servicedetails",
//   serviceUserDetailsRouter
// );
//router.use("/facility_booking", facilityBookingRouter);
router.use("/users/dashboard", userDashboardRouter);
router.use("/remarks", remarksRouter);
// router.use("/users/facility", userFacilityRouter);

/* router.use(
  "/administration-features/container-type",
  containerTypeRouter
);
 */
router.use(
  "/administration-features/container-types",
  containerTypeRouter
);

// router.use(
//   "/administration-features/courier-storage",
//   courierRouter
// );
// router.use(
//   "/administration-features/storage",
//   storageRouter
// );
//router.use("/parcel-management", parcelManagementRouter);
// router.use("/facility-dashboard", facilityDashboardRouter);
router.use("/administration-features/facility-type",facilityTypeMaster);

router.use("/notifications", notificationRouter);

//router.use("/parcel", parcelNotificationRouter);
router.use("/administration-features/banners",bannersRouter);

router.use("/service-request",serviceRequestNotificationRouter);

router.use("/announcement", announcementRouter);

router.use("/dashboard-icon", dashboardIconRouter);

//router.use("/administration-features/parcel-type",parcelTypeRouter);

//router.use("/bill-payment",billPaymentRouter);
router.use("/db-migration",dbMigrationRouter);

router.use("/superadmin/tenant", superadminTenantRouter);


module.exports = router;
