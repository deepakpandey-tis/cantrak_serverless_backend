const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');

const trx = knex.transaction();


function getYears(mils){
    let years = Math.ceil(mils / (1000 * 60 * 60 * 24 * 365))
    return years;
}


const pmController = {
createPmTaskSchedule: async (req,res) => {
    try {
        let noOfDates = null
        let pmPerformingDates = []
        await knex.transaction(async trx => {
            let payload = req.body;
            let repeatType = payload.repeatType
            if(repeatType === "WEEK" && repeatOn){
                // we know its weekly task
            }
            else if(repeatType === "MONTH"){
                // its a monthly task
            } else if(repeatType === "YEAR"){
                // its a yealy task
                noOfDates = getYears(new Date(payload.pmEndDateTime) - new Date(payload.pmStartDateTime))
                
                for(let i=0;i<=noOfDates;i++){
                    pmPerformingDates.push(new Date(payload.pmStartDateTime).setFullYear(new Date(payload.pmStartDateTime).getFullYear() + i));
                }
            }else if(repeatType === "DAY"){
                // its daily task
            }
            trx.commit;
        })
        return res.status(200).json({
            data: {
                noOfDates,
                pmPerformingDates
            }
        })
    }catch(err){
        console.log('[controllers][people][UpdatePeople] :  Error', err);
        trx.rollback;
        res.status(500).json({
            errors: [
                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
            ],
        });
    }
}
}

module.exports = pmController