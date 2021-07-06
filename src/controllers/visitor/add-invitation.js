const knex = require('../../db/knex');

const addRegistrationNotification = require("../../notifications/visitor/add-registration-notification");

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
              arrivalDate: new Date(additionalVisitor.arrivalDate).getTime(),
              departureDate: new Date(additionalVisitor.departureDate).getTime(),
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

          // Send registration notification
          let orgData = await knex('organisations').where({ id: orgId }).first();

          const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
          let arvDateStr = '';
          let arvDate = new Date(+insertInvitation[0].arrivalDate);
          arvDateStr = arvDate.toLocaleDateString(undefined, options);

          let depDateStr = '';
          let depDate = new Date(+insertInvitation[0].departureDate);
          depDateStr = depDate.toLocaleDateString(undefined, options);

          //let curDate = new Date(+currentTime);
          //arvDate.setHours(0, 0, 0, 0);

          console.log('add invitation arrival - departure dates: ', arvDate, arvDateStr, depDate, depDateStr);
          const registration = {
            data: {
              sender: {
                orgId: req.orgId,
                id: req.me.id,
                name: req.me.name,
                isCustomer: req.me.isCustomer,
              },
              receiver: {
                id: insertInvitation[0].tenantId,
                visitorNames: insertInvitation.map(inv => inv.name).join(', ').replace(/,(?=[^,]*$)/, ' and'),   // replace last ',' with ' and'
                visitorArrivalDate: arvDateStr,
                visitorDepartureDate: depDateStr,
                visitorStayover: arvDateStr !== depDateStr,
                visitorIds: insertInvitation.map(inv => inv.id),
              },
              payload: {
                orgData: orgData
              }
            }
          };
          await addRegistrationNotification.send(registration.data);

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
