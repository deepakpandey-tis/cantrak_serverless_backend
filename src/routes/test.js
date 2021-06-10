const { Router } = require("express");

const router = Router();
const testNotification = require("../notifications/test/test-notification");
const trimmer = require("../middlewares/trimmer");

const knex = require("../db/knex");
const moment = require("moment-timezone");

// const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SMS', 'SOCKET_NOTIFY'];
const ALLOWED_CHANNELS = ["IN_APP", "SOCKET_NOTIFY"];

router.get("/", async (req, res) => {
  try {


    
    // const queueHelper = require('../helpers/queue');
    // await queueHelper.addToQueue({type:'COMPLETED'},"long-jobs","TEST_PROCESSOR");

    // return res.status(200).json({
    //   data: {},
    //   message:
    //     "We are updating work orders. Please wait for few minutes.",
    // });


    // let requestedBy = await knex.from('users').where({ id: 1188 }).first();  // Tenant - daniel15@mailinator.com
    // let agmId = 4;
    // let orgId = 89;

    // let agmDetails = await knex("agm_master")
    // .leftJoin("companies", "agm_master.companyId", "companies.id")
    // .leftJoin("projects", "agm_master.projectId", "projects.id")
    // .select([
    //   "agm_master.*",
    //   "companies.companyId as companyCode",
    //   "companies.companyName",
    //   "projects.project as projectCode",
    //   "projects.projectName",
    // ])
    // .where({
    //   "agm_master.id": agmId,
    // }).first();

    // let data = {
    //     agmDetails
    // };

    // const agmHelper = require('../helpers/agm');
    // await agmHelper.generateVotingDocumentImproved({ agmId, data, orgId, requestedBy });

    let sender = await knex.from('users').where({ id: 1188 }).first();
    let receiver = await knex.from('users').where({ id: 1188 }).first();
    // let receiver = await knex.from('users').where({ id: 406 }).first();    // Admin - TrainingAdmin
    // let receiver = await knex.from('users').where({ id: 1121 }).first();  // Tenant - daniel15@mailinator.com

    let data = {
        payload: {
          message : 'This is Info message',
          OTP : '2345'
        }
    };

    await testNotification.send(sender, receiver, data);
    await testNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

    // Trigger Daily Digest emails...
    // const dailyDigestHelper = require("../helpers/daily-digest");
    // await dailyDigestHelper.prepareDailyDigestForUsers();
    // await knex.raw(`ALTER TABLE public.users ADD "deactivationStatus" bool NULL DEFAULT false`)

    let a;

    if (process.env.IS_OFFLINE) {
      a = true;
    } else {
      a = false;
    }

    res.json({
        IS_OFFLINE: process.env.IS_OFFLINE,
        ifCheck: a,
        typeOf: typeof process.env.IS_OFFLINE,
        typeof1: typeof true
    });
    // let aagmDetails = {
    //   formattedDate: "26-03-2021",
    // };
    // let agenda = {
    //   agendaName: "Agenda 1",
    //   choices: [
    //     {
    //       choiceValue: "choiceValue",
    //       choiceValueThai: "choiceValueThai",
    //       qrCode:
    //         "https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png",
    //     },
    //     {
    //       choiceValue: "choiceValue",
    //       choiceValueThai: "choiceValueThai",
    //       qrCode:
    //         "https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png",
    //     },
    //     {
    //       choiceValue: "choiceValue",
    //       choiceValueThai: "choiceValueThai",
    //       qrCode:
    //         "https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png",
    //     },
    //     {
    //       choiceValue: "choiceValue",
    //       choiceValueThai: "choiceValueThai",
    //       qrCode:
    //         "https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png",
    //     },
    //     {
    //       choiceValue: "choiceValue",
    //       choiceValueThai: "choiceValueThai",
    //       qrCode:
    //         "https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png",
    //     },
    //   ],
    // };
    // let pd = {
    //   houseId: "102/24",
    //   ownershipRatio: "24.5",
    // };
    // const ejs = require("ejs");
    // const path = require("path");

    // Read HTML Template
    // const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.ejs');
    // res.render(templatePath,{agmDetails:aagmDetails,agenda:agenda,propertyOwner:pd});
  } catch (err) {
    res.status(200).json({ failed: true, error: err });
  }
});

router.get("/open" ,async (req,res) =>{
  try {
    

    const queueHelper = require('../helpers/queue');
    await queueHelper.addToQueue({type:'OPEN'},"long-jobs","TEST_PROCESSOR");

    return res.status(200).json({
      data: {},
      message:
        "We are updating work orders. Please wait for few minutes.",
    });

  } catch (err) {
    res.status(200).json({ failed: true, error: err });
    
  }
});

router.get("/print-registration", (req, res) => {
  console.log(req.query);
  const path = require("path");
  // Read HTML Template
  const templatePath = path.join(
    __dirname,
    "..",
    "pdf-templates",
    "parcel-template.ejs"
  );
  
  let parcel = [
    {
      "id": "830",
      "unitId": "23156",
      "orgId": "89",
      "trackingNumber": "6934177709005",
      "parcelStatus": 1,
      "tenant": "สุภาภรณ์",
      "tenantId": "7788",
      "createdAt": "1611127407871",
      "pickedUpType": 1,
      "buildingPhaseCode": "C",
      "buildingName": "Building C",
      "name": "",
      "unitNumber": "9/1",
      "remarks": "",
      "displayId": null,
      "qrCode": "org-89-parcel-830",
      "tenantData": [],
      "uploadedImages": {
        "s3Url": "https://servicemind-resources.s3.amazonaws.com/parcel_management/097f5d7d-42d1-4787-81c2-7d3de96f901b.jpg",
        "title": "fileName.jpg",
        "name": "fileName.jpg"
      }
    },
    {
      "id": "829",
      "unitId": "23156",
      "orgId": "89",
      "trackingNumber": "6934177709005",
      "parcelStatus": 1,
      "tenant": "สุภาภรณ์",
      "tenantId": "7788",
      "createdAt": "1611126996111",
      "pickedUpType": 1,
      "buildingPhaseCode": "C",
      "buildingName": "Building C",
      "name": "",
      "unitNumber": "9/1",
      "remarks": "",
      "displayId": null,
      "qrCode": "org-89-parcel-829",
      "tenantData": [],
      "uploadedImages": {
        "s3Url": "https://servicemind-resources.s3.amazonaws.com/parcel_management/b4451667-dfe9-4305-8bc4-e61f4fcaa8cf.jpg",
        "title": "fileName.jpg",
        "name": "fileName.jpg"
      }
    },
    {
      "id": "430",
      "unitId": "21743",
      "orgId": "89",
      "trackingNumber": null,
      "parcelStatus": 1,
      "tenant": "udrv user",
      "tenantId": "7337",
      "createdAt": "1607481106541",
      "pickedUpType": 1,
      "buildingPhaseCode": "A",
      "buildingName": "Building A",
      "name": "",
      "unitNumber": "888/212",
      "remarks": "แมกสีแดง",
      "displayId": null,
      "qrCode": "org-89-parcel-430",
      "tenantData": [],
      "uploadedImages": {
        "s3Url": "https://servicemind-resources.s3.amazonaws.com/parcel_management/9152be69-0d3c-454b-bd24-a69774e826b9.jpg",
        "title": "16074810668572776414708117159172.jpg",
        "name": "16074810668572776414708117159172.jpg"
      }
    },
    {
      "id": "402",
      "unitId": "21743",
      "orgId": "89",
      "trackingNumber": "3385",
      "parcelStatus": 1,
      "tenant": "udrv user",
      "tenantId": "7337",
      "createdAt": "1607418017355",
      "pickedUpType": 1,
      "buildingPhaseCode": "A",
      "buildingName": "Building A",
      "name": "",
      "unitNumber": "888/212",
      "remarks": "สนามเด็กเล่น",
      "displayId": null,
      "qrCode": "org-89-parcel-402",
      "tenantData": [],
      "uploadedImages": {
        "s3Url": "https://servicemind-resources.s3.amazonaws.com/parcel_management/a7482dd3-4094-48c3-9c70-591c08a9eb0e.jpeg",
        "title": "IMG_4308.jpg.jpeg",
        "name": "IMG_4308.jpg.jpeg"
      }
    },
    {
      "id": "395",
      "unitId": "26034",
      "orgId": "89",
      "trackingNumber": "8850999220000",
      "parcelStatus": 1,
      "tenant": "Alex Test",
      "tenantId": "6963",
      "createdAt": "1607417765618",
      "pickedUpType": 1,
      "buildingPhaseCode": "A",
      "buildingName": "Building A",
      "name": "Soda",
      "unitNumber": "ALEX/TEST",
      "remarks": "",
      "displayId": null,
      "qrCode": "org-89-parcel-395",
      "tenantData": [],
      "uploadedImages": {
        "s3Url": "https://servicemind-resources.s3.amazonaws.com/parcel_management/1af28571-ab6f-4ba0-8c93-b70af719dc7d.jpg",
        "title": "image.jpg",
        "name": "image.jpg"
      }
    },
    {
      "id": "384",
      "unitId": "26034",
      "orgId": "89",
      "trackingNumber": "",
      "parcelStatus": 1,
      "tenant": "Alex Test",
      "tenantId": "6963",
      "createdAt": "1607417000915",
      "pickedUpType": 1,
      "buildingPhaseCode": "A",
      "buildingName": "Building A",
      "name": "",
      "unitNumber": "ALEX/TEST",
      "remarks": "",
      "displayId": null,
      "qrCode": "org-89-parcel-384",
      "tenantData": [],
      "uploadedImages": {
        "s3Url": "https://servicemind-resources.s3.amazonaws.com/parcel_management/9754fcc1-1616-4b44-a2ba-29cbfabb1e06.jpg",
        "title": "document-500x500.jpg",
        "name": "document-500x500.jpg"
      }
    }
  ];

  res.render(templatePath, { title: "Registration", data: { ...parcel } });
  //res.status(500).json({id:req.query.id, id:req.query.id, type:req.query.type});
});

router.post("/", trimmer, (req, res) => {
  return res.status(200).json(req.body);
});

router.get("/efs" ,async (req,res) =>{
  try {

    const queueHelper = require('../helpers/queue');
    await queueHelper.addToQueue({type: 'efs' },"long-jobs","TEST_PROCESSOR");

    return res.status(200).json({
      data: {},
      message:
        "Published Test efs job.......",
    });

  } catch (err) {
    res.status(200).json({ failed: true, error: err });
    
  }
});



router.get("/sns-publish" ,async (req,res) =>{
  try {

    const testHelper = require('../helpers/test');
    await testHelper.testSNSNotification();

    return res.status(200).json({
      data: {},
      message:
        "SNS Message test triggered",
    });

  } catch (err) {
    res.status(200).json({ failed: true, error: err });
    
  }
});

module.exports = router;
