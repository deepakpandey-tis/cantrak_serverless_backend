const knex = require('../../db/knex');

const addInvitation = async (req, res) => {
    try {
        let userId = req.me.id;
        let orgId = req.me.orgId;
        let insertInvitation = [];
        let additionalGuest;
        let additionalGuestNo;

//        const payload = req.body;

        const {additionalVisitors, ...firstVisitor} = req.body;
        console.log('main - additional: ', firstVisitor, additionalVisitors);
    
        let currentTime = new Date().getTime();

        // First Visitor
        let insertData = {
            orgId: orgId,
            // database sequence number id: 10,
            ...firstVisitor,
            arrivalDate: new Date(firstVisitor.arrivalDate).getTime(),
            departureDate: new Date(firstVisitor.departureDate).getTime(),
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
//            orgId: req.orgId
        };
        console.log('first guest: ', insertData);

        //console.log("Add Visitor Invitation Payload: ", insertData);
        //invitation = insertData;


        await knex.transaction(async trx => {
          const insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("visitor_invitations");

          insertInvitation[0] = insertResult[0];

          // Additional Visitors
          additionalGuestNo = 0;
          for(let additionalVisitor of additionalVisitors){
            additionalGuest = {
              orgId: orgId,
              ...additionalVisitor, 
              userHouseAllocationId: firstVisitor.userHouseAllocationId,
              arrivalDate: new Date(firstVisitor.arrivalDate).getTime(),
              departureDate: new Date(firstVisitor.departureDate).getTime(),
              tenantId: firstVisitor.tenantId,
              createdBy: userId,
              createdAt: currentTime,
              updatedBy: userId,
              updatedAt: currentTime,
            };
            console.log('additionalGuest: ', additionalGuest);

            additionalGuestNo += 1;
            const insertResult = await knex
            .insert(additionalGuest)
            .returning(["*"])
            .transacting(trx)
            .into("visitor_invitations");

            insertInvitation[additionalGuestNo] = insertResult[0];
          }

          trx.commit;
        });

      return res.status(200).json({
        data: {
          invitation: insertInvitation       //invitation
        },
        message: 'Invitation(s) added.'
      });
    } catch (err) {
      console.log("[controllers][Visitor][addInvitation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
}

module.exports = addInvitation;
