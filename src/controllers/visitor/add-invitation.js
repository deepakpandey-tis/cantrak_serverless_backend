const knex = require('../../db/knex');

const addInvitation = async (req, res) => {
    try {
        let userId = req.me.id;
        let orgId = req.me.orgId;
        let insertInvitation = null;

        const payload = req.body;

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            // database sequence number id: 10,
            ...payload,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
            orgId: req.orgId
        };

        console.log("Add Visitor Invitation Payload: ", insertData);
        invitation = insertData;


        await knex.transaction(async trx => {
            const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("visitor_invitations");

            insertInvitation = insertResult[0];

            trx.commit;
        });

      return res.status(200).json({
        data: {
          invitation: insertInvitation       //invitation
        },
        message: 'Invitation added.'
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
