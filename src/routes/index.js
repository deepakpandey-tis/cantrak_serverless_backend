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

module.exports = router;
