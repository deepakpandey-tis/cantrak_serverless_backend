const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const addCheckoutNotification = require("../../notifications/visitor/add-checkout-notification");

const checkoutVisitor = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.me.orgId;
        let userId = req.me.id;
        let userName = req.me.name;
        let visitorDetail = null;
        let updateInvitation = null;
        let images = [];
        var selectedRecs;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        let currentTime = new Date().getTime();

        const payload = req.body;
        const {pkey, cols, photoIdCards} = payload.data;
        console.log('pkey cols: ', pkey, cols);

        // Checking whether logged-in user is allowed to check-out visitors of tenant's project
        // Get logged-in user authorised / accessible projects
        let authorisedProjectIds = [];
        let authorisedProjects = req.userPlantationResources.find(rec => rec.id == visitorModule)
        authorisedProjectIds = authorisedProjects.projects;

        sqlSelect = `SELECT vi.id`;
        // a tenant may not assigned to a property unit  
        // sqlFrom   = ` FROM visitor_invitations vi, user_house_allocation uha, property_units pu `;
        // sqlWhere  = ` WHERE vi.id = ${pkey} and vi."userHouseAllocationId" = uha.id and uha."houseId" = pu.id`;
        sqlFrom   = ` FROM visitor_invitations vi, property_units pu `;
        sqlWhere  = ` WHERE vi.id = ${pkey} and vi."propertyUnitsId" = pu.id`;

        // Visitors only of authorised projects of logged-in user
        sqlWhere += ` and pu."projectId" in (${authorisedProjectIds})`;
        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        //console.log('get-checkout-visitors: ', sqlStr);

        selectedRecs = await knexReader.raw(sqlStr);
        if(selectedRecs.rows.length <= 0){
          return res.status(500).json({
            errors: [{ code: "ACCESS_DENIED", message: `Logged-in user ${userName} does not have permission for this project!` }]
          });
        }

        // Checking if visitor is already checked-out
        sqlStr = `SELECT *
        FROM visitor_invitations vi
        WHERE vi."id" = ${pkey} limit 1`;
        selectedRecs = await knexReader.raw(sqlStr);
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
          updatedBy: userId,
          updatedAt: currentTime,
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

          // Insert images in images table
          let imagesData = photoIdCards;
          if (imagesData && imagesData.length > 0) {
            for (image of imagesData) {
                let d = await knex.insert({ ...image, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }).returning(['*']).transacting(trx).into('images');
                images.push(d[0])
            }
          }

          // Send check-out notification
          let orgData = await knex('organisations').where({ id: orgId }).first();

          const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
          let arvDateStr = '';
          let arvDate = new Date(+visitorDetail.actualArrivalDate);
          arvDateStr = arvDate.toLocaleDateString(undefined, options);

          let depDateStr = '';
          let depDate = new Date(+updateInvitation.actualDepartureDate);
          depDateStr = depDate.toLocaleDateString(undefined, options);

          //let curDate = new Date(+currentTime);
          //depDate.setHours(0, 0, 0, 0);

          console.log('add checkout arrival - departure dates: ', arvDate, arvDateStr, depDate, depDateStr);
          const checkout = {
            data: {
              sender: {
                orgId: req.orgId,
                id: req.me.id,
                name: req.me.name,
                isCustomer: req.me.isCustomer,
              },
              receiver: {
                id: updateInvitation.tenantId,
                visitorNames: updateInvitation.name,
                visitorArrivalDate: arvDateStr,
                visitorDepartureDate: depDateStr,
                visitorStayover: arvDateStr !== depDateStr,
                visitorIds: updateInvitation.id,
              },
              payload: {
                orgData: orgData
              }
            }
          };
          await addCheckoutNotification.send(checkout.data);


          trx.commit;
      });

      return res.status(200).json({
        data: {
          invitation: updateInvitation,
          photoIdCards: images
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

/**
 * 2021/07/26 Code to insert (visitor ticket) in images table added
 */
