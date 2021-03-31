const QRCode = require('qrcode')

const generateQRCode = async (qrCodeStr) => {
        try {

        let qrCode = '';

        // Generate qrCode
        qrCode = await QRCode.toDataURL(qrCodeStr);

        const result = {
            data: {
                qrCode: qrCode,
                message: "Visitor invitation qrcode!"
            }
        }
        // console.log(result.data)

        return result.data;
    } catch (err) {
        console.log("[function][Visitor][getInviteQRCode] :  Error", err);
        return {
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    };
    
    }
}

module.exports = generateQRCode;
