const express = require("express");
const router = express.Router();

// const authMiddleware = require("../middlewares/auth");
const runLatestMigration = require('../helpers/db/migration');
const updateDBFunctions = require('../helpers/db/update-db-function');


router.get("/migrate-latest", async (req, res) => {
  let migrationResult = await runLatestMigration();
  return res.json({ migrationResult });
});


router.get("/update-functions", async (req, res) => {
  let migrationResult = await updateDBFunctions();
  return res.json({ migrationResult });
});



module.exports = router;
