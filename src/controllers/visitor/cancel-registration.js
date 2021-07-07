const knex = require('../../db/knex');

const cancelRegistration = async (req, res) => {
    try {
        const visitorModule = 15;

        let userId = req.me.id;
        let cancelRegistration = null;

        let currentTime = new Date().getTime();

        const payload = req.body;

        // Cancel visitor registration
        let updateData = {
            status: 2,
            updatedBy: userId,
            updatedAt: currentTime
        };

        await knex.transaction(async trx => {
          const updateResult = await knex
          .update(updateData)
          .where({ id: payload.id })
          .transacting(trx)
          .into('visitor_invitations')
          .returning(['*']);

          cancelRegistration = updateResult[0];

          trx.commit;
        });

        return res.status(200).json({
            data: {
            invitation: cancelRegistration,
            },
            message: 'Registration successfully cancelled!'
        });
    } catch (err) {
      console.log("[controllers][Visitor][cancelRegistration] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
}

module.exports = cancelRegistration;
