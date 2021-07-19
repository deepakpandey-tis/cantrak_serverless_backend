const knex = require('../db/knex');
const knexReader = require('../db/knex-reader');
const Joi = require('@hapi/joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const superagent = require('superagent');


const entranceController = {
    login: async (req, res) => {
        // const users = await knex.select().from('users');
        try {

            let login = null;
            // let userName = null;
            let loginResult = null;
            const loginPayload = req.body;
            console.log('[controllers][entrance][login]', loginPayload);

            const schema = Joi.object().keys({
                userName: Joi.string().required(),
                password: Joi.string().required()
            });

            const result = Joi.validate(loginPayload, schema);
            console.log('[controllers][entrance][login]: Joi Login Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            // Trim Username, some times user sent name has spaces
            loginPayload.userName = loginPayload.userName.trim();

            // check username & password not blank
            loginResult = await knexReader('users').where( function (){
                this.where('userName', loginPayload.userName)
            }).orWhere({ mobileNo: loginPayload.userName }).orWhere({ email: loginPayload.userName }).first();

            console.log('[controllers][entrance][login]: Validate Username', loginResult);
            if (!loginResult) {
                return res.status(400).json({
                    errors: [
                        { code: 'ACCOUNT_NOT_FOUND_ERROR', message: 'Invalid credentials' }
                    ],
                });
            }


            /*CHECK ORGANISATION ACTIVE/INACTIVE OPEN */
            let checkResult = await knexReader.from('organisations').where({ id: loginResult.orgId }).first();

            if (checkResult) {
                if (!checkResult.isActive) {
                    return res.status(400).json({
                        errors: [
                            { code: 'ACCOUNT_NOT_FOUND_ERROR', message: 'Your Organisation has been Deactivated, Please contact to administration !' }
                        ],
                    });
                }
            }
            /* CHECK ORGANISATION ACTIVE/INACTIVE CLOSE */

            // // check email is verified
            // const verifyEmail = await knex('users').where({ email: loginResult.email, emailVerified: 'true' });
            // console.log('[controllers][entrance][login]: Email verify', verifyEmail);

            if (!loginResult.emailVerified) {
                return res.status(400).json({
                    errors: [
                        { code: 'EMAIL_VERIFICATION_ERROR', message: 'Your account is pending for approval. Please contact admin' }
                    ],
                });
            }


            /*CHECK TEAM USER DISABLE OR NOT OPEN */
            let userTeamResult = await knexReader.from('team_users').select('teamId').where({ userId: loginResult.id });
            if (userTeamResult.length) {

                console.log("=============team Id=", userTeamResult, "==")

                let teamIds = userTeamResult.map((v) => v.teamId)

                let teamResult = await knexReader.from('teams').whereIn('teamId', teamIds).where({ disableLogin: true });

                if (teamResult.length) {

                    return res.status(400).json({
                        errors: [
                            { code: 'DISABLE_TEAM_ERROR', message: "Login for the user of this team is disabled , Please contact to your administration !" }
                        ]
                    })

                }

            }
            /*CHECK TEAM USER DISABLE OR NOT CLOSE */

            // Get organization ID
            let orgId = loginResult.orgId;
            //const organization = await knex('users')
            console.log('[controllers][entrance][login] : Login Query Result: ', loginResult)


            //match input password with DB
            const match = await bcrypt.compare(loginPayload.password, loginResult.password);
            if (match) {
                const loginToken = await jwt.sign({ id: loginResult.id, orgId }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7h' });
                login = { accessToken: loginToken, refreshToken: '' };

                // check account status is active
                // const verifyStatus = await knex('users').where({ isActive: 'false', id: loginResult.id });
                // console.log('[controllers][entrance][login]: Account Blocked', verifyStatus);

                if (!loginResult.isActive) {
                    return res.status(400).json({
                        errors: [
                            { code: 'ACCOUNT_BLOCKED_ERROR', message: 'Your account has been blocked, Please contact to administration !' }
                        ],
                    });
                }

                let socialAccounts = await knexReader('social_accounts').where({ userId: loginResult.id });

                loginResult.socialAccounts = socialAccounts;

                /*LAST LOGIN UPDATE OPEN */
                let currentTime = new Date().getTime();
                await knex('users').update({ "lastLogin": currentTime }).where({ id: loginResult.id });
                /*LAST LOGIN UPDATE CLOSE */

                login.user = _.omit(loginResult, ['password']);

                if (checkResult) {
                    login.user.organisationName = checkResult.organisationName;
                } else {
                    login.user.organisationName = "";
                }



                // An user can have atmost one application role
                let userApplicationRole = await knexReader('application_user_roles').where({ userId: Number(loginResult.id) }).select('roleId', 'orgId').first();
                switch (Number(userApplicationRole.roleId)) {
                    case 1:
                        login.user.isSuperAdmin = true;
                        login.user.roles = ['superAdmin'];
                        break;
                    case 2:
                        login.user.isOrgAdmin = true;
                        login.user.roles = ['orgAdmin'];
                        break;
                    case 3:
                        login.user.isOrgUser = true;
                        login.user.roles = ['orgUser'];
                        break;
                    case 4:
                        login.user.isCustomer = true;
                        login.user.roles = ['customer'];
                        break;
                }


                if (login.user.isOrgAdmin) {
                    console.log("this is orgAdmin");
                    // get all the projects of this admin
                    const projects = await knexReader("projects")
                        .select("id")
                        .where({ orgId });
                    const companies = await knexReader("companies")
                        .select("id")
                        .where({ orgId });
                    const resources = await knexReader(
                        "organisation_resources_master"
                    )
                        .select("resourceId as id")
                        .where({ orgId });
                    const userProjectResources = _.uniqBy(
                        resources,
                        "id"
                    ).map(v => ({
                        id: v.id,
                        projects: projects.map(v => v.id)
                    }));
                    const userCompanyResources = _.uniqBy(
                        resources,
                        "id"
                    ).map(v => ({
                        id: v.id,
                        companies: companies.map(v => v.id)
                    }));
                    //console.log(mappedProjects)
                    login.user.userCompanyResources = userCompanyResources;
                    login.user.userProjectResources = userProjectResources;
                    // console.log(userCompanyResources, userProjectResources);
                }

                if (login.user.isOrgUser) {
                    const result = await knexReader("team_users")
                        .innerJoin(
                            "team_roles_project_master",
                            "team_users.teamId",
                            "team_roles_project_master.teamId"
                        )
                        .innerJoin(
                            "role_resource_master",
                            "team_roles_project_master.roleId",
                            "role_resource_master.roleId"
                        )
                        .select([
                            "team_roles_project_master.projectId as projectId",
                            "role_resource_master.resourceId as resourceId"
                        ])
                        .where({
                            "team_users.userId": loginResult.id,
                            "team_users.orgId": orgId,
                            "team_roles_project_master.orgId": orgId
                        });

                    // let userProjectResources = result;
                    console.log('Result: ', result);

                    let userProjectResources = _.chain(result)
                        .groupBy("resourceId")
                        .map((value, key) => ({
                            id: key,
                            projects: value.map(a => a.projectId)
                        }))
                        .value();
                    login.user.userProjectResources = userProjectResources;

                }

                console.log("[controllers][entrance][login] : LoginResponse::", login);
                res.status(200).json(login)
            } else {
                res.status(400).json({
                    errors: [
                        { code: 'INVALID_CREDENTIALS', message: 'Invalid Credentials' }
                    ],
                });
            }

        } catch (err) {
            console.log('[controllers][entrance][login] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    signUp: async (req, res) => {

        try {
            let user = null;
            await knex.transaction(async (trx) => {

                const signupPayload = _.omit(req.body, 'company', 'project', 'building', 'floor', 'unitNumber');

                console.log('[controllers][entrance][signup]', signupPayload);

                const PasswordComplexity = require('joi-password-complexity');

                const complexityOptions = {
                    min: 6,
                    max: 100,
                    lowerCase: 1,
                    upperCase: 0,
                    numeric: 1,
                    symbol: 1,
                    requirementCount: 2,
                }

                // validate keys
                const schema = Joi.object().keys({
                    name: Joi.string().required(),
                    userName: Joi.string().required(),
                    password: new PasswordComplexity(complexityOptions),
                    mobileNo: Joi.number().required(),
                    email: Joi.string().email({ minDomainSegments: 2 }).required(),
                    gender: Joi.string().required(),
                    location: Joi.string().required(),
                    houseId: Joi.string().required()
                });

                const result = Joi.validate(signupPayload, schema);
                console.log('[controllers][entrance][signup]: JOi Result', result);

                const hash = await bcrypt.hash(signupPayload.password, saltRounds);
                signupPayload.password = hash;


                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check unique username & email id 
                const existUser = await knex('users').where({ userName: signupPayload.userName });
                const existEmail = await knex('users').where({ email: signupPayload.email });
                const existMobile = await knex('users').where({ mobileNo: signupPayload.mobileNo });
                const existHouseId = await knex('users').where({ houseId: signupPayload.houseId });

                console.log('[controllers][entrance][signup]: UserExist', existUser);
                console.log('[controllers][entrance][signup]: EmailExist', existEmail);
                console.log('[controllers][entrance][signup]: MobileNoExist', existMobile);
                console.log('[controllers][entrance][signup]: HouseIdExist', existHouseId);

                // Return error when username exist

                if (existUser && existUser.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'USER_EXIST_ERROR', message: 'Username already exist !' }
                        ],
                    });
                }

                // Return error when email exist

                if (existEmail && existEmail.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'EMAIL_EXIST_ERROR', message: 'Email already exist !' }
                        ],
                    });
                }

                // Return error when mobileNo exist

                if (existMobile && existMobile.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'MOBILE_EXIST_ERROR', message: 'MobileNo already exist !' }
                        ],
                    });
                }

                // Return error when HouseId exist

                if (existHouseId && existHouseId.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'HOUSEID_EXIST_ERROR', message: 'House Id already exist !' }
                        ],
                    });
                }


                // Insert in users table,
                const currentTime = new Date().getTime();
                const tokenExpiryTime = moment().add(1, 'day').valueOf();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = { ...signupPayload, createdAt: currentTime, updatedAt: currentTime, verifyToken: uuidv4(), verifyTokenExpiryTime: tokenExpiryTime };

                console.log('[controllers][entrance][signup]: Insert Data', insertData);
                const signUpResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('users');
                user = signUpResult[0];
                //obj = JSON.parse(user);
                console.log('[controllers][entrance][signup]: Signup Result User', user);

                // Insert in role table,
                const roleData = {
                    userId: user.id,
                    roleId: 4,
                    createdAt: currentTime,
                    updatedAt: currentTime
                }

                const roles = await knex.insert(roleData).returning(['*']).transacting(trx).into('application_user_roles');
                user.roles = roles;


                // Insert into user_house_allocation
                const userHouseAllocationInsertData = { userId: user.id, houseId: signupPayload.houseId, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }
                const insertedResult = await knex('user_house_allocation').insert(userHouseAllocationInsertData).returning(['*'])
                user.userHouseAllocation = insertedResult[0]



                trx.commit;
            });

            const Parallel = require('async-parallel');
            user.roles = await Parallel.map(user.roles, async item => {
                let rolename = await knex('application_roles').where({ id: item.roleId }).select('name');
                rolename = rolename[0].name;
                return rolename;
            });


            res.status(200).json({
                data: {
                    user: user
                },
                message: "Signup successfull"
            });


        } catch (err) {
            console.log('[controllers][entrance][signup] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }

    },

    me: async (req, res) => {

        try {

            res.status(200).json({
                data: { user: req.me },
                message: "Login successful"
            });

        } catch (err) {
            console.log('[controllers][entrance][login] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    forgotPassword: async (req, res) => {
        // const users = await knex.select().from('users');
        res.status(200).json({
            data: {

            },
            message: "Login successfull"
        });
    },

    verifyUser: async (req, res) => {
        // const users = await knex.select().from('users');
        res.status(200).json({
            data: {

            },
            message: "Login successfull"
        });
    },

    changePassword: async (req, res) => {

        try {

            let payload = req.body;

            const schema = Joi.object().keys({
                oldPassword:Joi.string().required(),
                newPassword: Joi.string().required(),
                confirmPassword: Joi.string().required(),
                id: Joi.string().required(),
            })
            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let oldPassword = await knex('users')
            .select([
                'users.password',
            ])
            .where({'users.id':req.body.id,'users.orgId':req.orgId}).first()

            console.log("old password ===",oldPassword)

            // let oldPass = await bcrypt.hash(payload.oldPassword,saltRounds)
            const match = await bcrypt.compare(payload.oldPassword, oldPassword.password);

            console.log("match password",match)
            if(match){
            if (payload.newPassword == payload.confirmPassword) {

                let userResult = await knex.from('users').where({ id: payload.id }).first();
                if (userResult) {

                    let pass = await bcrypt.hash(payload.newPassword, saltRounds);

                    let updateResult = await knex('users').update({ "password": pass }).where({ id: payload.id });

                    res.status(200).json({
                        data: {
                            updateResult
                        },
                        message: "Password Change successfully!", pass
                    });

                }

            } else {

                return res.status(400).json({
                    errors: [
                        { code: 'PASSWORD_MATCH', message: "New password & confirm password does not match" }
                    ],
                });

            }
        }else{
            return res.status(400).json({
                errors: [
                    { code: 'PASSWORD_MATCH', message: "Old Password is not correct" }
                ],
            });
        }

        } catch (err) {

            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });

        }

    },

    authorizeLineAccount: async (req, res) => {
        try {

            let payload = req.body;

            const schema = Joi.object().keys({
                code: Joi.string().required(),
                state: Joi.string().required(),
                redirectUrl: Joi.string().required(),
            })
            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            console.log('[controllers][entrance][authorizeLineAccount]', payload);

            try {
                let lineAuth = await superagent.post(`https://api.line.me/oauth2/v2.1/token`)
                    .set('Content-Type', `application/x-www-form-urlencoded`)
                    .type('form')
                    .send({ 'grant_type': 'authorization_code' })
                    .send({ 'code': payload.code })
                    .send({ 'redirect_uri': payload.redirectUrl })
                    .send({ 'client_id': '1654799092' })
                    .send({ 'client_secret': 'dff3b322f991f04de4687b5b77cf4e2e' });

                let body = lineAuth.text;

                body = JSON.parse(body);
                console.log('[controllers][entrance][authorizeLineAccount]: LineAuth Response', body);


                let decodedIdToken = jwt.decode(body.id_token);
                console.log('[controllers][entrance][authorizeLineAccount]: Decoded id token', decodedIdToken);

                // Get User Profile
                // https://api.line.me/v2/profile

                let lineProfile = await superagent.get(`https://api.line.me/v2/profile`)
                    .set('Authorization', `Bearer ${body.access_token}`);

                lineProfile = JSON.parse(lineProfile.text);
                console.log('[controllers][entrance][authorizeLineAccount]: Line Profile', lineProfile);

                // Check if this users id is already in the db for line social account

                let lineAccount = await knex('social_accounts').where({ userId: req.me.id }).first();

                if (!lineAccount) {

                    let insertData = {
                        accountName: 'LINE',
                        userId: req.me.id,
                        details: JSON.stringify(lineProfile),
                        createdAt: new Date().getTime(),
                        updatedAt: new Date().getTime(),
                    }

                    const result = await knex.insert(insertData).returning(['*']).into('social_accounts');
                    lineAccount = result && result[0] ? result[0] : result;
                }

                let result = await knex('social_accounts').update({
                    details: JSON.stringify(lineProfile),
                    updatedAt: new Date().getTime()
                }).where({ id: lineAccount.id }).returning(['*']);

                lineAccount = result && result[0] ? result[0] : result;

                let user = await knex('users').where({ id: req.me.id }).first();

                let socialAccounts = await knex('social_accounts').where({ userId: req.me.id });

                user.socialAccounts = socialAccounts;


                // Now send some message to line channel for this user...
                // https://api.line.me/v2/bot/message/multicast

                await superagent.post(`https://api.line.me/v2/bot/message/multicast`)
                    .set('Content-Type', `application/json`)
                    .set('Authorization', `Bearer XABQBlz8gAwLhc6lVAOqAxGJRqiA4Hmvp98/jF+Dry7/towFojWx1OKDLak48UuJceyyhvwFO/Cbp2sUr/IscsjZTCtVZSdIxFKksTYhueZ1GQgQw6CDT2By9acXiUJkqT6lTqVKoUbijg9c9s9m5gdB04t89/1O/w1cDnyilFU=`)
                    .send({
                        "to": [
                            lineProfile.userId
                        ],
                        "messages": [
                            {
                                "type": "text",
                                "text": `Hello, ${lineProfile.displayName}, Welcome.\nYou have linked your line account to ServiceMind successfully. We will notify you on this channel with important notifications only from now on.`
                            }
                        ]
                    });

                res.status(200).json({
                    data: {
                        isAuthorizedSuccessfully: true,
                        user: user
                    }
                });
            } catch (err) {
                res.status(200).json({
                    data: {
                        isAuthorizedSuccessfully: false,
                        error: err
                    }
                });
            }

        } catch (err) {

            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err }
                ],
            });

        }
    },

    removeLineAccount: async (req, res) => {
        try {

            await knex('social_accounts')
                .where({ accountName: 'LINE', userId: req.me.id })
                .del();

            let user = await knex('users').where({ id: req.me.id }).first();

            let socialAccounts = await knex('social_accounts').where({ userId: req.me.id });

            user.socialAccounts = socialAccounts;

            res.status(200).json({
                data: {
                    user: user
                }
            });

        } catch (err) {

            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err }
                ],
            });

        }
    },
    getOldPassword : async(req,res) =>{
        try {
            let oldPassword = await knex('users')
            .select([
                'users.password',
                'users.id'
            ])
            .where({'users.id':req.body.id})

            return res.status(200).json({
                data:{
                    oldPassword
                }
            })
        } catch (err) {

            console.log(
                "[controllers][entrance][getOldPassword] :  Error",
                err
              );
              res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
              });
            
        }

    }
};

module.exports = entranceController;