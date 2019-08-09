var express = require('express');
var router = express.Router();

const usersRouter = require('./users');
const entranceRouter = require('./entrance');
const userManagementRouter = require('./user-management');


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

module.exports = router;
