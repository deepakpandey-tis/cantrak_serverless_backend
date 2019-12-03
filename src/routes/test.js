const {Router} = require("express")
const knex = require('../db/knex');


const router = Router()

router.get('/', async(req,res) => {
    try {
        let users =null
        await knex.transaction(async trx => {
            users = await knex.select().returning(['*']).transacting(trx).into('users')
            //trx.commit
        })
        
        res.status(200).json({
            data: {
                users:users
            }
        })

    } catch(err){
        res.status(200).json({failed:true})
    }
})

module.exports = router;