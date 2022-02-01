const knex = require("../db/knex");
const knexReader = require("../db/knex-reader");

const themeController = {

  /* GET ORGANISATION DETAILS FOR ADMIN */
  getOrganisationDetailsForTheme: async (req, res) => {

    try {

      let id = req.orgId || parseInt(req.query.id);

      let domain = req.query.domain;
      console.log(req.query);
      console.log("******** res **********",req);

      let result;

      if (domain) {
        result = await knexReader("organisations")
          .select([
            'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
          ])
          .where({ 'organisations.domainName': domain }).first();
      } else {
        result = await knexReader("organisations")
          .select([
            'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
          ])
          .where({ 'organisations.id': id }).first();
      }

      if (!result?.themeConfig || result.themeConfig == '' || Object.keys(result.themeConfig).length <= 0) {
        result = await knexReader("organisations")
          .select([
            'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
          ])
          .where({ 'organisations.id': 1 }).first();
      }

      return res.status(200).json({
        data: {
          organisationDetails: { ...result }
        },
        message: "Organisation Details!."
      });

    } catch (err) {
      console.error("[controllers][dashboard][getOrganisationDetailsForTheme] :  Error",err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
};

module.exports = themeController;
