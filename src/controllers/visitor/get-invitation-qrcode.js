const QRCode = require('qrcode')
const generateQRCode = require('../../helpers/generate-qrcode');

const getInvitationQRCode = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;
        let invitationId = req.query.invitationId;
        /*
        let orgId = invitation.orgId;
        let userId = invitation.userId;
        let invitationId = invitation.id;
        */

        let qrCode = '';

        // Generate qrCode
        const qrCodeStr = 'sm' + '-org-' + orgId + '-user-' + userId + '-visitor-' + invitationId;
        qrCode = await generateQRCode(qrCodeStr);
        console.log('qrcode', qrCode);

        const result = {
            data: {
                qrCode: qrCode.qrCode,
                message: "Visitor QRCode!"
            }
        }
        // console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][Visitor][getInvitationQRCode] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }
}

module.export = { getInvitationQRCode };
