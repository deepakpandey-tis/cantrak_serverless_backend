const knex = require('../../db/knex');

const checkinVisitor = async (req, res) => {
    try {
        const visitorModule = 15;

        let orgId = req.orgId;
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
        //console.log('pkey cols: ', pkey, cols);

        // Checking whether logged-in user is allowed to check-in visitors of tenant's project
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
        //console.log('get-checkin-visitors: ', sqlStr);

        selectedRecs = await knex.raw(sqlStr);
        if(selectedRecs.rows.length <= 0){
          return res.status(500).json({
            errors: [{ code: "ACCESS_DENIED", message: `Logged-in user ${userName} does not have permission for this project!` }]
          });
        }

        // Checking if visitor is already checked-in
        sqlStr = `SELECT *
        FROM visitor_invitations vi
        WHERE vi."id" = ${pkey} limit 1`;
        selectedRecs = await knex.raw(sqlStr);
        if(selectedRecs.rows.length > 0){
          visitorDetail = selectedRecs.rows[0];
          //console.log('checkin-visitors: ', visitorDetail);
          if(visitorDetail.status === 3){
            return res.status(500).json({
              errors: [{ code: "RECORD_CANCELLED", message: `Visitor record cancelled!` }]
            });
          }
          else if(visitorDetail.actualArrivalDate !== null){
            return res.status(500).json({
              errors: [{ code: "ALREADY_CHECKED_IN", message: `Visitor already checked-in!` }]
            });
          }
        }
        else {
          // selectedRecs.rows.length <= 0: record does not exists
          return res.status(500).json({
            errors: [{ code: "RECORD_DELETED", message: `Visitor record not found!` }]
          });
        }

        // Passed validations, check-in the visitor
        let updateData = {
          ...cols,
          actualArrivalDate: currentTime,
          checkedInBy: userId,
          checkedInAt: currentTime
      };

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

          trx.commit;
      });

      return res.status(200).json({
        data: {
          invitation: updateInvitation,
          photoIdCards: images
        },
        message: 'Check-in successfully completed!'
      });
    } catch (err) {
      console.log("[controllers][Visitor][checkinVisitor] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
}

module.exports = checkinVisitor;
