var express = require('express');
var router = express.Router();

const usersRouter = require('./users');
const entranceRouter = require('./entrance');
const userManagementRouter = require('./user-management');
const serviceRequestRouter = require('./servicerequest');
const serviceDetailsRouter = require('./servicedetails');
const propertySetupRouter = require('./administration-features/property-setup');
const propertyCategoryRouter = require('./administration-features/property-category');
const propertySubCategoryRouter = require('./administration-features/property-subcategory');
const generalSetupRouter = require('./administration-features/general-setup');
const teamsRouter = require('./teams');
const vendorRouter = require('./vendor');
const partsRouter = require('./parts');
const assetRouter = require('./asset');
const peopleRouter = require('./people');
const surveyOrderRouter = require("./survey-order");
const quotationRouter = require("./quotations");
const serviceOrderRouter = require("./service-order")
const chargeRouter = require("./charge");
const commonAreaRouter = require("./administration-features/common-area");
const statusRouter = require("./administration-features/status");
const companyRouter = require('./administration-features/company')
const projectRouter = require('./administration-features/project')
const buildingPhaseRouter = require('./administration-features/building-phase')
const floorZoneRouter = require('./administration-features/floor-zone')
const propertyUnitRouter = require("./administration-features/property-unit")
const satisfactionRouter = require("./administration-features/satisfaction");
const taxesRouter = require("./administration-features/taxes");
const problemRouter = require('./administration-features/problem')
const propertyTypeRouter = require('./administration-features/property-type')
const sourceofRequestRouter = require('./administration-features/source-of-request')
const administractionUsersRouter = require('./administration-features/administraction-users');
const dashboardRouter = require("./dashboard")
const imageRouter = require("./image")
const fileRouter = require("./file")
const pmRouter = require("./preventive-maintenance")
const testRouter = require('./test')
const taskGroupRouter = require('./administration-features/task-group');
const organisationsRouter = require('./administration-features/organisations');

const pushNotificationRouter = require('./push-notification');


/* GET home page. */
router.get('/', async (req, res, next) => {
  res.json({ app: 'Serverless Express App' });
});


/**
 * Routers
 */
router.use('/push-notification', pushNotificationRouter);
router.use('/test', testRouter)
router.use('/entrance', entranceRouter);
router.use('/users', usersRouter);
router.use('/usermanagement', userManagementRouter);
router.use('/servicerequest', serviceRequestRouter);
router.use('/servicedetails', serviceDetailsRouter);
router.use('/administration-features/property-setup', propertySetupRouter);
router.use('/administration-features/property-category', propertyCategoryRouter);
router.use('/administration-features/property-subcategory', propertySubCategoryRouter);
router.use('/administration-features/general-setup', generalSetupRouter);
router.use('/administration-features/company', companyRouter)
router.use('/administration-features/project', projectRouter)
router.use('/administration-features/building-phase', buildingPhaseRouter)
router.use('/administration-features/property-unit', propertyUnitRouter)
router.use('/administration-features/property-type', propertyTypeRouter)
router.use('/administration-features/source-of-request', sourceofRequestRouter)
router.use('/administration-features/administraction-users', administractionUsersRouter);

router.use('/teams', teamsRouter);
router.use('/vendors', vendorRouter);
router.use('/parts', partsRouter);
router.use('/asset', assetRouter);
router.use('/people', peopleRouter);
router.use('/survey-order', surveyOrderRouter);
router.use('/quotations', quotationRouter);
router.use('/service-order', serviceOrderRouter)
router.use('/charge', chargeRouter);
router.use('/administration-features/common-area', commonAreaRouter);
router.use('/administration-features/status', statusRouter);
router.use('/administration-features/floor-zone', floorZoneRouter)
router.use('/administration-features/satisfaction', satisfactionRouter);
router.use('/administration-features/taxes', taxesRouter);
router.use('/administration-features/problem', problemRouter);
router.use('/dashboard', dashboardRouter);
router.use('/administration-features/problem', problemRouter)
router.use('/image', imageRouter)
router.use('/file', fileRouter)
router.use('/preventive-maintenance', pmRouter)
router.use('/task-group', taskGroupRouter);
router.use('/administration-features/organisations', organisationsRouter)
module.exports = router;
