const knex = require('../db/knex');
const Joi = require('@hapi/joi')
const _ = require('lodash');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const moment = require("moment");
const uuid = require("uuid/v4");
const emailHelper = require('../helpers/email')

const vendorController = {
    getVendors: async (req, res) => {
        let orgId = req.orgId;
        const vendors = await knex.select().from('vendor_master').where({ orgId });
        res.status(200).json({
            data: {
                vendors: vendors,
            }
        });
    },
    /*ADD VENDOR */
    addVendor: async (req, res) => {

        try {
            let roleInserted;
            let insertedUser;
            await knex.transaction(async trx => {
                let orgId = req.orgId;

                console.log("======================", orgId)
                let payload = req.body;


                const schema = Joi.object().keys({
                    name: Joi.string().required(),
                    userName: Joi.string().required(),
                    email: Joi.string().required(),
                    mobileNo: Joi.string().allow("").allow(null).optional(),
                    phoneNo: Joi.string().allow("").allow(null).optional(),
                    location: Joi.string().allow("").allow(null).optional(),
                    allowLogin: Joi.boolean().allow("").allow(null).optional(),
                    password: Joi.string().allow("").allow(null).optional(),
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][AddVendor]: JOi Result",
                    result
                );
                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. OPEN */
                const existUser = await knex('users').where({ userName: payload.userName });
                const existEmail = await knex('users').where({ email: payload.email });


                if (existUser && existUser.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'USER_EXIST_ERROR', message: 'Username already exist !' }
                        ],
                    });
                }

                if (existEmail && existEmail.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'EMAIL_EXIST_ERROR', message: 'Email already exist !' }
                        ],
                    });
                }

                let mobileNo = null;

                if (payload.mobileNo) {

                    mobileNo = payload.mobileNo;

                    const existMobile = await knex('users').where({ mobileNo: payload.mobileNo });

                    if (existMobile && existMobile.length) {
                        return res.status(400).json({
                            errors: [
                                { code: 'MOBILE_EXIST_ERROR', message: 'MobileNo already exist !' }
                            ],
                        });
                    }
                }
                /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. CLOSE */
                let emailVerified = false;
                let isActive = false;
                if (payload.allowLogin) {
                    emailVerified = true;
                    isActive = true;
                }
                let pass = payload.password;
                payload = _.omit(payload, 'allowLogin')
                let hash = await bcrypt.hash(payload.password, saltRounds);
                payload.password = hash;
                let uuidv4 = uuid()
                let currentTime = new Date().getTime()
                insertedUser = await knex("users")
                    .insert({ ...payload, mobileNo: mobileNo, verifyToken: uuidv4, emailVerified: emailVerified, isActive: isActive, createdAt: currentTime, updatedAt: currentTime, createdBy: req.me.id, orgId: orgId })
                    .returning(["*"])
                    .transacting(trx);
                console.log(payload);


                // Insert this users role as customer
                roleInserted = await knex('application_user_roles').insert({ userId: insertedUser[0].id, roleId: 5, createdAt: currentTime, updatedAt: currentTime, orgId: orgId })
                    .returning(['*']).transacting(trx)

                let user = insertedUser[0]
                console.log('User: ', insertedUser)
                if (insertedUser && insertedUser.length) {


                    await emailHelper.sendTemplateEmail({ to: payload.email, subject: 'Welcome to Service Mind', template: 'welcome-org-admin-email.ejs', templateData: { fullName: payload.name, username: payload.userName, password: pass, uuid: uuidv4 } })

                }
                trx.commit;
            })
            return res.status(200).json({
                insertedUser, roleInserted,
                message: "Vendor created successfully!"

            });
        } catch (err) {
            console.log(
                "[controllers][customers][createCustome] :  Error",
                err
            );
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
    ,
    getVendorsList: async (req, res) => {
        try {

            let filters = {}
            let { name, organisation } = req.body;
            let reqData = req.query;

            console.log("Req.orgId: ", req.orgId);

            //console.log("==============", orgId, "=================");

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let total, rows;
            let sortPayload = req.body;
            if (!sortPayload.sortBy && !sortPayload.orderBy) {
                sortPayload.sortBy = "users.id";
                sortPayload.orderBy = "asc"
            }


            [total, rows] = await Promise.all([
                knex("users")
                    .leftJoin(
                        "application_user_roles",
                        "users.id",
                        "application_user_roles.userId"
                    )
                    .select([
                        "users.name as name",
                        "users.email as email",
                        "users.id as userId",
                        "users.isActive",
                        "users.mobileNo",
                        "users.phoneNo",
                        "users.location",
                        "users.userName",
                    ])
                    .where({
                        "application_user_roles.roleId": 5,
                        "users.orgId": req.orgId
                    })
                    .groupBy(['users.id'])
                    .distinct(['users.id'])
                    .andWhere(qb => {
                        if (name) {

                            qb.where('users.name', 'iLIKE', `%${name}%`)
                            qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                            qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                            qb.orWhere('users.userName', 'iLIKE', `%${name}%`)

                        }
                    })

                ,
                knex("users")
                    .leftJoin(
                        "application_user_roles",
                        "users.id",
                        "application_user_roles.userId"
                    )
                    .select([
                        "users.name as name",
                        "users.email as email",
                        "users.id as userId",
                        "users.isActive",
                        "users.mobileNo",
                        "users.phoneNo",
                        "users.location",
                        "users.userName",
                    ])
                    .orderBy(sortPayload.sortBy, sortPayload.orderBy)
                    .where({
                        "application_user_roles.roleId": 5,
                        "users.orgId": req.orgId
                    })
                    .andWhere(qb => {


                        if (name) {

                            qb.where('users.name', 'iLIKE', `%${name}%`)
                            qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                            qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                            qb.orWhere('users.userName', 'iLIKE', `%${name}%`)
                        }

                    })
                    .groupBy(['users.id'])
                    .distinct(['users.id'])
                    .offset(offset)
                    .limit(per_page)
            ]);


            let count = total.length;
            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;
            pagination.data = rows;


            return res.status(200).json({
                data: {
                    vendors: pagination
                }
            });
        } catch (err) {
            console.log(
                "[controllers][survey Orders][getSurveyOrders] :  Error",
                err
            );
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*GET VENDOR DETAILS */
    getVendorsDetails: async (req, res) => {

        try {


            let payload = req.query;
            let id = req.query.id;

            const schema = Joi.object().keys({
                id: Joi.string().required(),

            });

            const result = Joi.validate(payload, schema);
            console.log(
                "[controllers][administrationFeatures][AddVendor]: JOi Result",
                result
            );
            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }


            let resultData = await knex('users').where({ id: id }).first();

            return res.status(200).json({
                data: {
                    vendorDetails: resultData
                }
            });

        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },
    updateVendor: async (req, res) => {
        try {
            let insertedUser;
            await knex.transaction(async trx => {
                let orgId = req.orgId;

                console.log("======================", orgId)
                let payload = req.body;
                //let payload = req.body;

                const schema = Joi.object().keys({

                    name: Joi.string().required(),
                    userName: Joi.string().required(),
                    email: Joi.string().required(),
                    mobileNo: Joi.string().allow("").allow(null).optional(),
                    phoneNo: Joi.string().allow("").allow(null).optional(),
                    location: Joi.string().allow("").allow(null).optional(),
                    allowLogin: Joi.boolean().allow("").allow(null).optional(),
                    password: Joi.string().allow("").allow(null).optional(),
                    id: Joi.string().required(),
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][addfloorZone]: JOi Result",
                    result
                );
                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. OPEN */
                const existUser = await knex('users').where({ userName: payload.userName });
                const existEmail = await knex('users').where({ email: payload.email });


                if (existUser && existUser.length) {
                    if (existUser[0].id == payload.id) {

                    } else {
                        return res.status(400).json({
                            errors: [
                                { code: 'USER_EXIST_ERROR', message: 'Username already exist !' }
                            ],
                        });
                    }
                }

                if (existEmail && existEmail.length) {

                    if (existEmail[0].id == payload.id) {

                    } else {
                        return res.status(400).json({
                            errors: [
                                { code: 'EMAIL_EXIST_ERROR', message: 'Email already exist !' }
                            ],
                        });
                    }
                }
                let mobileNo = null;

                if (payload.mobileNo) {
                    mobileNo = payload.mobileNo;
                    const existMobile = await knex('users').where({ mobileNo: payload.mobileNo });

                    if (existMobile && existMobile.length) {

                        if (existMobile[0].id == payload.id) {

                        } else {

                            return res.status(400).json({
                                errors: [
                                    { code: 'MOBILE_EXIST_ERROR', message: 'MobileNo already exist !' }
                                ],
                            });
                        }
                    }
                }
                /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. CLOSE */
                let emailVerified = false;
                let isActive = false;
                if (payload.allowLogin) {
                    emailVerified = true;
                    isActive = true;
                }
                payload = _.omit(payload, 'allowLogin')
                let currentTime = new Date().getTime()
                insertedUser = await knex("users")
                    .update({ ...payload, mobileNo: mobileNo, emailVerified: emailVerified, isActive: isActive, updatedAt: currentTime, orgId: orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .where({ id: payload.id });
                console.log(payload);


                trx.commit;
            })
            return res.status(200).json({
                insertedUser,
                message: "Vendor updated successfully!"

            });
        } catch (err) {
            console.log(
                "[controllers][customers][createCustome] :  Error",
                err
            );
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getVendorsData: async (req, res) => {
        try {
            vendorsResult = await knex('application_user_roles')
                .leftJoin('users', 'application_user_roles.userId', 'users.id')
                .select([
                    'users.name',
                    'users.id as userId',
                    'users.email'
                ])
                .where({ 'application_user_roles.roleId': 5, 'application_user_roles.orgId': req.orgId, 'users.isActive': true })
                .orderBy('users.name', 'asc')
                .returning('*')

            console.log("vendorsList", vendorsResult);

            res.status(200).json({
                data: {
                    vendors: vendorsResult
                },
                message: "Vendors list successfully !"
            })

        } catch (err) {

            console.log('[controllers][teams][getTeamList] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });

        }


    },
    getAssignedVendors: async (req, res) => {
        try {
            const entityId = req.body.entityId;
            const entityType = req.body.entityType;

            console.log('entityId:', entityId, 'entityType:', entityType);

            const primaryVendors = await knex('assigned_vendors').select(['entityId', 'userId as primaryVendorId']).where({ entityId: entityId, entityType: entityType, isPrimaryVendor: true }).first();

            const additionalVendors = await knex('assigned_vendors').select(['entityId', 'userId as additionalVendorId']).where({ entityId: entityId, entityType: entityType, isPrimaryVendor: false }).first();

            return res.status(200).json({
                data: {
                    primaryVendors,
                    additionalVendors
                }
            })

        } catch (err) {
            console.error('Error:', err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
};

module.exports = vendorController;