const knex = require('../../db/knex');

const checkoutVisitor = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.me.orgId;
        let userId = req.me.id;
        let userName = req.me.name;
        let visitorDetail = null;
        let updateInvitation = null;
        var selectedRecs;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        let currentTime = new Date().getTime();

        const payload = req.body;
        const {pkey, cols} = payload.data;
        console.log('pkey cols: ', pkey, cols);

        // Checking whether logged-in user is allowed to check-out visitors of tenant's project
        // Get logged-in user authorised / accessible projects
        let authorisedProjectIds = [];
        let authorisedProjects = req.userProjectResources.find(rec => rec.id == visitorModule)
        authorisedProjectIds = authorisedProjects.projects;

        sqlSelect = `SELECT vi.id`;
        sqlFrom   = ` FROM visitor_invitations vi, user_house_allocation uha, property_units pu `;
        sqlWhere  = ` WHERE vi.id = ${pkey} and vi."userHouseAllocationId" = uha.id and uha."houseId" = pu.id`;

        // Visitors only of authorised projects of logged-in user
        sqlWhere += ` and pu."projectId" in (${authorisedProjectIds})`;
        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        //console.log('get-checkout-visitors: ', sqlStr);

        selectedRecs = await knex.raw(sqlStr);
        if(selectedRecs.rows.length <= 0){
          return res.status(500).json({
            errors: [{ code: "ACCESS_DENIED", message: `Logged-in user ${userName} does not have permission for this project!` }]
          });
        }

        // Checking if visitor is already checked-out
        sqlStr = `SELECT *
        FROM visitor_invitations vi
        WHERE vi."id" = ${pkey} limit 1`;
        selectedRecs = await knex.raw(sqlStr);
        if(selectedRecs.rows.length > 0){
          visitorDetail = selectedRecs.rows[0];
          //console.log('checkout-visitor: ', visitorDetail);
          if(visitorDetail.status === 3){
            return res.status(500).json({
              errors: [{ code: "RECORD_CANCELLED", message: `Visitor record cancelled!` }]
            });
          }
          else if(visitorDetail.actualDepartureDate !== null){
            return res.status(500).json({
              errors: [{ code: "ALREADY_CHECKED_OUT", message: `Visitor already checked-out!` }]
            });
          }
        }
        else {
          // selectedRecs.rows.length <= 0: record does not exists
          return res.status(500).json({
            errors: [{ code: "RECORD_DELETED", message: `Visitor record not found!` }]
          });
        }

        // Passed validations, check-out the visitor
        let updateData = {
          ...cols,
          actualDepartureDate: currentTime,
          checkedOutBy: userId,
          checkedOutAt: currentTime
      };
      console.log('checkout-visitor: ', updateData);

      await knex.transaction(async trx => {
          const updateResult = await knex
          .update(updateData)
          .where({ id: pkey })
          .transacting(trx)
          .into('visitor_invitations')
          .returning(['*']);

          updateInvitation = updateResult[0];

          trx.commit;
      });

      return res.status(200).json({
        data: {
          invitation: updateInvitation
        },
        message: 'Check-out successfully completed!'
      });
    } catch (err) {
      console.log("[controllers][Visitor][checkoutVisitor] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
}

module.exports = checkoutVisitor;
