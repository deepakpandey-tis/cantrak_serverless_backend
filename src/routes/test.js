const { Router } = require("express")

const router = Router();
const testNotification = require('../notifications/test/test-notification');
const trimmer = require('../middlewares/trimmer');

const knex = require('../db/knex');

// const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SMS', 'SOCKET_NOTIFY'];
const ALLOWED_CHANNELS = ['IN_APP', 'SOCKET_NOTIFY'];


router.get('/', async (req, res) => {
    try {

        let requestedBy = await knex.from('users').where({ id: 1188 }).first();  // Tenant - daniel15@mailinator.com
        let agmId = 4;
        let orgId = 89;

        let agmDetails = await knex("agm_master")
        .leftJoin("companies", "agm_master.companyId", "companies.id")
        .leftJoin("projects", "agm_master.projectId", "projects.id")
        .select([
          "agm_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
        ])
        .where({
          "agm_master.id": agmId,
        }).first();

        let data = {
            agmDetails
        };

        const agmHelper = require('../helpers/agm');
        await agmHelper.generateVotingDocumentImproved({ agmId, data, orgId, requestedBy });



        // let sender = await knex.from('users').where({ id: 406 }).first();
        // let receiver = await knex.from('users').where({ id: 1121 }).first();
        // let receiver = await knex.from('users').where({ id: 406 }).first();    // Admin - TrainingAdmin
        // let receiver = await knex.from('users').where({ id: 1121 }).first();  // Tenant - daniel15@mailinator.com

        // let data = {
        //     payload: {
        //     }
        // };

        // await testNotification.send(sender, receiver, data);
        // await testNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

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

        // res.json({
        //     IS_OFFLINE: process.env.IS_OFFLINE,
        //     ifCheck: a,
        //     typeOf: typeof process.env.IS_OFFLINE,
        //     typeof1: typeof true
        // });
        let aagmDetails = {
            formattedDate:'26-03-2021',

        }
        let agenda = {
            agendaName:'Agenda 1',
            choices :[
                {
                    choiceValue:'choiceValue',
                    choiceValueThai:'choiceValueThai',
                    qrCode:'https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png'
                },
                {
                    choiceValue:'choiceValue',
                    choiceValueThai:'choiceValueThai',
                    qrCode:'https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png'
                },
                {
                    choiceValue:'choiceValue',
                    choiceValueThai:'choiceValueThai',
                    qrCode:'https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png'
                },
                {
                    choiceValue:'choiceValue',
                    choiceValueThai:'choiceValueThai',
                    qrCode:'https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png'
                },
                {
                    choiceValue:'choiceValue',
                    choiceValueThai:'choiceValueThai',
                    qrCode:'https://www.asti.com/wp-content/uploads/2017/08/AAEAAQAAAAAAAAWbAAAAJGFlM2NhMWM3LTNjNDQtNDFlMy04MDUyLTAxMzJjZDJhMjcwNw.png'
                },
                
            ]
        }
        let pd = {
            houseId:'102/24',
            ownershipRatio:'24.5'
        }
        const ejs = require('ejs');
        const path = require('path');

        // Read HTML Template
        const templatePath = path.join(__dirname, '..', 'pdf-templates', 'template.ejs');
        res.render(templatePath,{agmDetails:aagmDetails,agenda:agenda,propertyOwner:pd});
        
     

    } catch (err) {
        res.status(200).json({ failed: true, error: err });
    }
})

router.post('/', trimmer, (req, res) => {
    return res.status(200).json(req.body)
})

module.exports = router;