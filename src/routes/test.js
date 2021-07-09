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
    "template.ejs"
  );
  

 let agmDetails = {
  id: '331',
  companyId: '423',
  projectId: '382',
  agmName: 'การประชุมใหญ่สามัญครั้งแรก | The First Annual General Meeting ',
  agmDate: '1616920400000',
  startTime: '1616637618000',
  endTime: '1616648429000',
  moderationStatus: true,
  waterMarkText: 'ใช้สำหรับเข้าร่วมประชุมใหญ่สามัญครั้งแรก นิติบุคคลอาคารชุด โนเบิล อราวน์ สุขุมวิท 33',
  isActive: true,
  createdBy: '1188',
  updatedBy: null,
  createdAt: '1618501511937',
  updatedAt: '1618501511937',
  orgId: '89',
  displayId: null,
  isCompleted: null,
  combineOwnershipRatio: false,
  companyCode: '10',
  companyName: 'Noble Around Sukhumvit 33 Juristic Person',
  projectCode: 'NA33',
  projectName: 'Noble Around Sukhumvit 33 Juristic Person'
}

let agenda = {
  id: '265',
  agmId: '331',
  agendaNo: '2',
  agendaName: 'พิจารณาเห็นชอบข้อบังคับที่จดทะเบียน ตามที่ได้ยื่นขอจดทะเบียนนิติบุคคลอาคารชุดไว้แล้ว',
  agendaNameThai: 'Approval of the registered Condominium Regulations',
  eligibleForVoting: true,
  createdAt: '1618501511937',
  updatedAt: '1618501511937',
  orgId: '89',
  defaultChoiceId: null,
  isMultiSelect: false,
  choices: [
    {
      id: '364',
      agendaId: '265',
      choiceValue: 'เห็นชอบ',
      choiceValueThai: 'Agree',
      isActive: true,
      createdAt: '1618501511937',
      updatedAt: '1618501511937',
      orgId: '89'
    },
    {
      id: '365',
      agendaId: '265',
      choiceValue: 'ไม่เห็นชอบ',
      choiceValueThai: 'Disagree',
      isActive: true,
      createdAt: '1618501511937',
      updatedAt: '1618501511937',
      orgId: '89'
    },
    {
      id: '366',
      agendaId: '265',
      choiceValue: 'งดออกเสียง',
      choiceValueThai: 'Abstain',
      isActive: true,
      createdAt: '1618501511937',
      updatedAt: '1618501511937',
      orgId: '89'
    }
  ]

}

let propertyOwner = {
  ownerGroupNo: '#1',
  ownerName: 'บริษัท คอนติเนนตัล ซิตี้ จำกัด',
  ownershipRatio: [ 23.351128, 48.330183, 23.613697 ],
  unitId: [ '27420', '27423', '27421' ],
  unitNumber: [ '17/1', '17/4', '17/2' ],
  id: [ '1816', '1423', '1421' ]
}

let agm = {agenda: agenda , agmDetails:agmDetails, propertyOwner:propertyOwner }

  res.render(templatePath, { title: "Registration", agenda: agenda , agmDetails:agmDetails, propertyOwner:propertyOwner });
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
