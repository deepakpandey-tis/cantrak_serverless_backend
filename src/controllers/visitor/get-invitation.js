const knex = require('../../db/knex');
const generateQRCode = require('../../helpers/generate-qrcode');

const getInvitation = async (req, res) => {
    try {
        let userId = req.me.id;
        let invitationId = req.query.invitationId;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        let visitorDetail = null;
        let qrCode = '';

        //console.log('uid - iid', userId, invitationId);
        sqlSelect = `SELECT vi.*
        , uha."houseId", pu2."unitNumber"`;

        sqlFrom = ` FROM visitor_invitations vi, user_house_allocation uha, property_units pu2 `;

        sqlWhere = ` WHERE vi."orgId" = ${req.me.orgId} and vi.id = ${invitationId} 
        and vi."userHouseAllocationId" = uha.id and uha."houseId" = pu2.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;
        
        var selectedRecs = await knex.raw(sqlStr);

        /*
        selectedRecs = await knex("visitor_invitations")
          .join("user_house_allocation", "visitor_invitations.userHouseAllocationId", "=", "user_house_allocation.id")
          .join("property_units", "user_house_allocation.houseId", "=", "property_units.id")
          .select(
            "visitor_invitations.*",
            "user_house_allocation.houseId",
            "property_units.unitNumber"
          )
          .where({
            "visitor_invitations.orgId": req.me.orgId,
            "visitor_invitations.id": invitationId
          });
          */

        visitorDetail = selectedRecs.rows[0];
        //console.log('srecs: ', selectedRecs);
        //console.log('vdtl: ', visitorDetail);

        // Generate qrCode part of frontend
        /*
        const qrCodeStr = 'sm' + '-org-' + visitorDetail.orgId + '-user-' + visitorDetail.createdBy + '-visitor-' + visitorDetail.id;
        qrCode = await generateQRCode(qrCodeStr);
        //console.log('qrcode', qrCode);
        */

          const result = {
            data: {
                visitorDetail: visitorDetail,
                // qrCode: qrCode.qrCode,
                message: "Visitor invitation!"
            }
        }
        // console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][Visitor][getInvitation] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

    /* Sample result
    const result = {
        data: {
            visitorDetail: {id: 1, userHouseAllocationId: 1, name: "Name 01", mobileNo: "1234567890", arrivalDate: "2021-03-13T08:14:00.511Z", departureDate: "2021-03-05T08:13:00.511Z", vehicleNo: "TH03 12345", arrivalActualDate: "2021-03-05T08:14:00.511Z", departureActualDate: "2021-03-05T08:14:00.511Z", status: 1, createdBy: 1, createdOn: "2021-03-05T08:14:00.511Z", lastModifiedBy: 1, lastModifiedOn: "2021-03-05T08:14:00.511Z", unitNumber: "12/001"},
            message: "Visitor invitation!"
        }
    };
    */
}

module.exports = getInvitation;
