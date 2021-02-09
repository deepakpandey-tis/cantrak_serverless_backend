const _ = require("lodash");
const notification = require("../core/notification");

const ALLOWED_CHANNELS = ["EMAIL"];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;
const QRCODE = require("qrcode");
const fs = require("fs");

const outgoingParcelNotification = {
  send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
    try {
      console.log(
        "[notifications][parcel][parcel-notification][send]: Data:",
        data
      );

      if (SHOULD_QUEUE) {
        await notification.queue(
          sender,
          receiver,
          JSON.parse(JSON.stringify(data)),
          allowedChannels,
          __filename
        );
        console.log(
          "[notifications][parcel][parcel-notification][send]: All Notifications Queued"
        );
      } else {
        await notification.send(
          sender,
          receiver,
          JSON.parse(JSON.stringify(data)),
          allowedChannels,
          outgoingParcelNotification
        );
        console.log(
          "[notifications][parcel][parcel-notification][send]: All Notifications Sent"
        );
      }
    } catch (err) {
      console.log(
        "[notifications][parcel][parcel-notification][send]:  Error",
        err
      );
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    }
  },
  sendInAppNotification: async (sender, receiver, data) => {
    let parcelId = data.payload.parcelId;
    let orgData = data.payload.orgData;

    let icons;
    let images;
    if (orgData && orgData.organisationLogo == '') {
      icons = 'assets/icons/icon-512x512.png';
      images = 'assets/icons/icon-512x512.png';
    }
    else {
      icons = orgData.organisationLogo;
      images = orgData.organisationLogo;
    }

    data = {
      orgId: sender.orgId,
      senderId: sender.id,
      receiverId: receiver.id,
      payload: {
        ...data,
        subject: "Parcel Acceptation",
        body: `Hi, You have received a parcel,Please accept for picked up the parcels.`,
        subjectThai: 'การรับพัสด',
        bodyThai: `มีพัสดุจัดส่งถึงคุณ`,
        icon: icons,
        image: images,
        extraData: {
          dateOfArrival: Date.now(),
          url: `/user/parcel/parcel-confirmation?parcels=${parcelId}`,
          primaryKey: Date.now(),
          parcelIds: parcelId,
        },
      },     
      actions: [
        {
          action: "explore",
          title: "Parcel Acceptation",
          url: `/user/parcel/parcel-confirmation?parcels=${parcelId}`,
        },
      ],
    };

    return data;
  },

  sendSocketNotification: async (sender, receiver, data) => {
    let parcelId = data.payload.parcelId;
    let orgData = data.payload.orgData;

    let icons;
    let images;
    if (orgData && orgData.organisationLogo == '') {
      icons = 'assets/icons/icon-512x512.png';
      images = 'assets/icons/icon-512x512.png';
    }
    else {
      icons = orgData.organisationLogo;
      images = orgData.organisationLogo;
    }

    data = {
      orgId: sender.orgId,
      senderId: sender.id,
      receiverId: receiver.id,
      channel: 'socket-notification',
      payload: {
        ...data,
        subject: "Parcel Acceptation",
        body: `Hi, You have received a parcel,Please accept for picked up the parcels.`,
        subjectThai: 'การรับพัสด',
        bodyThai: `มีพัสดุจัดส่งถึงคุณ`,
        icon: icons,
        image: images,
        extraData: {
          dateOfArrival: Date.now(),
          url: `/user/parcel/parcel-confirmation?parcels=1,2,3`,
          primaryKey: Date.now(),
          parcelIds: parcelId,
        },
      },
      actions: [
        {
          action: "explore",
          title: "Parcel Acceptation",
          url: `/user/parcel/parcel-confirmation?parcels=${parcelId}`,
        },
      ],
    };
    return data;
  },

  sendEmailNotification: async (sender, receiver, data) => {
    let unitNumber = receiver.unitNumber;
    let parcelId = receiver.parcelId;


    let qrCode1 =
      "org~" + data.orgId + "~unitNumber~" + unitNumber + "~parcel~" + parcelId;
    let qrCode;
    if (qrCode1) {
      qrCode = await QRCODE.toDataURL(qrCode1);
    }


    data = {
      receiverEmail: receiver.email,
      template: "outgoing-parcel-notification.ejs",
      templateData: {
        fullName: receiver.name,
        qrCode: receiver.url,
        orgId:receiver.orgId
      },
      payload: {
        ...data,
        subject: "Parcel Email Notification",
      },
    };

    return data;
  },

  sendWebPushNotification: async (sender, receiver, data) => {

    let icons;
    let images;
    let orgData = data.payload.orgData;
    //   if(orgData && orgData.id == '56'){
    //       icons = 'assets/icons/cbre-512x512.png';
    //       images = 'assets/icons/cbre-512x512.png';
    //   }else if(orgData && orgData.id == '89'){
    //     icons = 'assets/icons/senses-512x512.png';
    //     images = 'assets/icons/senses-512x512.png';
    // }else{
    //       icons = 'assets/icons/icon-512x512.png';
    //       images = 'assets/icons/icon-512x512.png';
    //   }
    if (orgData && orgData.organisationLogo == '') {
      icons = 'assets/icons/icon-512x512.png';
      images = 'assets/icons/icon-512x512.png';
    }
    else {
      icons = orgData.organisationLogo;
      images = orgData.organisationLogo;
    }

    data = {
      orgId: sender.orgId,
      senderId: sender.id,
      receiverId: receiver.id,
      payload: {
        subject: "Acceptation",
        body: `Hi, You have received a parcel,Please accept for picked up the parcels.`,
        icon: icons,
        image: images,
        extraData: {
          dateOfArrival: Date.now(),
          url: `${process.env.SITE_URL}/user/parcel/parcel-confirmation/${parcelId}`,
          primaryKey: Date.now(),
        },
      },
      actions: [
        {
          action: "explore",
          title: "User parcel Page",
          url: `${process.env.SITE_URL}/user/parcel/parcel-confirmation/${parcelId}`,
        },
      ],
    };

    return data;
  },

  sendLineNotification: async (sender, receiver, data) => {
    data = {
      receiverId: receiver.id,
      message: `Hi, You have received a parcel,Please accept for picked up the parcels.`,
    };

    return data;
  },
  sendSMSNotification: async (sender, receiver, data) => {
    data = {
      receiverMobileNumber: receiver.mobileNo,
      textMessage: `Hi ${receiver.name} this is simple text message send to test the notification`,
    };

    return data;
  },
};
module.exports = outgoingParcelNotification;
