const _ = require('lodash')
const trimmer = (req,res,next) => {
    let body = req.body;
    // if(Array.isArray(body)){
    //     let x = []
    //     for(let b of body){
    //         x.push(_.mapValues(b, o => o.trim()))
    //     }
    //     req.body = x;
    //     next()
    // } else if(typeof body === "object") {
    //     console.log(body)
    //     req.body = _.mapValues(body, o => {
    //         let x = []
    //         if(Array.isArray(o)){
    //             for (let b of o) {
    //                 x.push(_.mapValues(b, o => o.trim()))
    //             }
    //         } else if(typeof o === "object"){
    //             req.body = _.mapValues(o, o => o.trim())
    //         }
    //         return x;
    //     })
    //     next()
    // }  
    req.body = nestedTrimmer(body)
    
    next()
}


function nestedTrimmer(val){
    if(typeof val === "string"){
        return [val.trim()]
    }
    if(Array.isArray(val)){
        let x = []
        for(let o of val){
            x.push(_.mapValues(o, nestedTrimmer(o)))
        }
        return x;
    }

    if(typeof val === "object"){
       return _.mapValues(val, l => nestedTrimmer(l))
    }
}


module.exports = trimmer