var express = require('express');
var router = express.Router();

const usersRouter = require('./users');
const entranceRouter = require('./entrance');
const userManagementRouter = require('./user-management');
const serviceRequestRouter = require('./servicerequest');
const serviceDetailsRouter = require('./servicedetails');
const propertySetupRouter = require('./administration-features/property-sertup');
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
const chargeRouter = require("./charge")
const companyRouter = require('./administration-features/company')
const projectRouter = require('./administration-features/project')
const buildingPhaseRouter = require('./administration-features/building-phase')
const floorZoneRouter = require('./administration-features/floor-zone')
const propertyUnitRouter = require("./administration-features/property-unit")

/* GET home page. */
router.get('/', async (req, res, next) => {
  res.json({ app: 'Serverless Express App' });
});

/**
 * Routers
 */
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
router.use('/teams', teamsRouter);
router.use('/vendors', vendorRouter);
router.use('/parts', partsRouter);
router.use('/asset', assetRouter);
router.use('/people', peopleRouter);
router.use('/survey-order', surveyOrderRouter);
router.use('/quotations', quotationRouter);
router.use('/service-order', serviceOrderRouter)
router.use('/charge', chargeRouter);
router.use('/administration-features/common-area',commonAreaRouter);
router.use('/administration-features/status',statusRouter);
router.use('/charge', chargeRouter)
router.use('/administration-features/floor-zone', floorZoneRouter)

module.exports = router;
