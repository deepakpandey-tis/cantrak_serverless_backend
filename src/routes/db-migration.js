const express = require("express");
const router = express.Router();

// const authMiddleware = require("../middlewares/auth");
const runLatestMigration = require('../helpers/db/migration');


router.get("/migrate-latest", async (req, res) => {
  let migrationResult = await runLatestMigration();
  return res.json({ migrationResult });
});



module.exports = router;
