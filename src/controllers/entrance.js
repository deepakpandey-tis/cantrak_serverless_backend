const knex = require('../db/knex');
const knexReader = require('../db/knex-reader');
const Joi = require('@hapi/joi');
const { google } = require("googleapis");
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const superagent = require('superagent');
const addUserActivityHelper = require('../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../helpers/user-activity-constants');



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


                //  Log user activity
                let userActivity = {
                    orgId: orgId,
                    companyId: null,
                    entityId: loginResult.id,
                    entityTypeId: EntityTypes.Login,
                    entityActionId: EntityActions.Login,
                    description: `${loginResult.name} logged-in on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
                    createdBy: loginResult.id,
                    createdAt: currentTime,
                    trx: null
                }
                const ret = await addUserActivityHelper.addUserActivity(userActivity);
                // console.log(`addUserActivity Return: `, ret);
                if (ret.error) {
                    throw { code: ret.code, message: ret.message };
                }
                //  Log user activity


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
                    const locations = await knexReader("locations")
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
                    const userLocationsResources = _.uniqBy(
                        resources,
                        "id"
                    ).map(v => ({
                        id: v.id,
                        locations: locations.map(v => v.id)
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
                    login.user.userLocationsResources = userLocationsResources;
                    // console.log(userCompanyResources, userLocationsResources);
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
                            "team_roles_project_master.locationId as locationId",
                            "role_resource_master.resourceId as resourceId"
                        ])
                        .where({
                            "team_users.userId": loginResult.id,
                            "team_users.orgId": orgId,
                            "team_roles_project_master.orgId": orgId
                        });

                    // let userLocationsResources = result;
                    console.log('Result: ', result);

                    let userLocationsResources = _.chain(result)
                        .groupBy("resourceId")
                        .map((value, key) => ({
                            id: key,
                            locations: value.map(a => a.locationId)
                        }))
                        .value();
                    login.user.userLocationsResources = userLocationsResources;

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

    logout: async (req, res) => {

        try {
            let orgId = req.me.orgId;
            let userId = req.me.id;
            let userName = req.me.name;

            let payload = req.body;

            let currentTime = new Date().getTime();

            //  Log user activity
            let userActivity = {
                orgId: orgId,
                companyId: null,
                entityId: userId,
                entityTypeId: EntityTypes.Logout,
                entityActionId: EntityActions.Logout,
                description: `${userName} logged-out on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
                createdBy: userId,
                createdAt: currentTime,
                trx: null
            }
            const ret = await addUserActivityHelper.addUserActivity(userActivity);
            // console.log(`addUserActivity Return: `, ret);
            if (ret.error) {
                throw { code: ret.code, message: ret.message };
            }
            //  Log user activity

            res.status(200).json({
                message: "logout successfully!"
            });

        } catch (err) {

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
            let orgId = req.me.orgId;
            let userId = req.me.id;
            let userName = req.me.name;

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

                let currentTime = new Date().getTime();
                let userResult = await knex.from('users').where({ id: payload.id }).first();
                if (userResult) {

                    let pass = await bcrypt.hash(payload.newPassword, saltRounds);

                    let updateResult = await knex('users').update({ "password": pass }).where({ id: payload.id });

                    //  Log user activity
                    let userActivity = {
                        orgId: orgId,
                        companyId: null,
                        entityId: payload.id,
                        entityTypeId: EntityTypes.ChangePassword,
                        entityActionId: EntityActions.ChangePassword,
                        description: `${userName} changed password on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
                        createdBy: userId,
                        createdAt: currentTime,
                        trx: null
                    }
                    const ret = await addUserActivityHelper.addUserActivity(userActivity);
                    // console.log(`addUserActivity Return: `, ret);
                    if (ret.error) {
                        throw { code: ret.code, message: ret.message };
                    }
                    //  Log user activity

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

    authorizeGoogleAccount: async (req, res) => {
        try {
          const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
          const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
          const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;

          const oauthScope = "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.app.created";

          const originUrl = req.get('origin');
          const REDIRECT_URL = originUrl + '/' + GOOGLE_REDIRECT_URL;

          const APP_ENV = process.env.APP_ENV;

          let payload = req.body;

          const schema = Joi.object().keys({
            code: Joi.string().required(),
            state: Joi.string().required(),
          });

          const result = Joi.validate(payload, schema);
          if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
          }

          const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
          let { tokens } = await oauth2Client.getToken(payload.code);

          // If the user has not given the calendar permission then just return the unmodified user object
          if(!tokens.scope.includes('https://www.googleapis.com/auth/calendar.app.created')) {
              let user = await knex('users').where({ id: req.me.id }).first();
              let socialAccounts = await knex('social_accounts').where({ userId: req.me.id });
              user.socialAccounts = socialAccounts;
              return res.status(200).json({
                  data: {
                      isAuthorizedSuccessfully: false,
                      user: user,
                      message: 'Could not link GOOGLE account to your Cantrak account :( Please check if you have given sufficient permissions'
                  }
              });
          }

          oauth2Client.setCredentials({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_type: 'Bearer',
              scope: oauthScope
          });

          const ticket = await oauth2Client.verifyIdToken({
              idToken: tokens.id_token,
              audience: GOOGLE_CLIENT_ID
          });

          const googleProfile = ticket.getPayload();
          const calendar = google.calendar({ version: "v3", auth: oauth2Client });

          const emailLinkedWithAnotherAccount = await knexReader('social_accounts')
            .whereRaw("social_accounts.details->>'email' = ?", [googleProfile.email])
            .andWhere("social_accounts.userId", "!=", req.me.id)
            .first();

          if(emailLinkedWithAnotherAccount) {
            let user = await knex('users').where({ id: req.me.id }).first();
            let socialAccounts = await knex('social_accounts').where({ userId: req.me.id });
            user.socialAccounts = socialAccounts;
            return res.status(200).json({
                data: {
                    isAuthorizedSuccessfully: false,
                    user: user,
                    message: 'This Google account is already linked with another Cantrak account.'
                }
            });
          }

          let googleAccount = await knex('social_accounts').where({ userId: req.me.id, accountName: 'GOOGLE' }).first();

          if(!googleAccount) {
              const newCalendar = await calendar.calendars.insert({
                  requestBody: {
                      summary: `Cantrak${(APP_ENV === 'STAGE' || APP_ENV === 'DEV') ? `-${APP_ENV}` : ''}`,
                      description: 'Cantrak calendar for all your work orders.',
                      timeZone: 'Asia/Bangkok',
                      location: 'Thailand'
                  },
                  });
              let insertData = {
                  accountName: 'GOOGLE',
                  userId: req.me.id,
                  details: JSON.stringify({...googleProfile, refreshToken: tokens.refresh_token, calendarId: newCalendar.data.id}),
                  createdAt: new Date().getTime(),
                  updatedAt: new Date().getTime(),
              }
              const result = await knex.insert(insertData).returning(['*']).into('social_accounts');
              googleAccount = result && result[0] ? result[0] : result;
          } else {
              const result = await knex('social_accounts').update({
                  details: JSON.stringify({...googleProfile, refreshToken: tokens.refresh_token}),
                  updatedAt: new Date().getTime()
              }).where({ id: googleAccount.id }).returning(['*']);        
              googleAccount = result && result[0] ? result[0] : result;        
          }

          let user = await knex('users').where({ id: req.me.id }).first();

          let socialAccounts = await knex('social_accounts').where({ userId: req.me.id });
          socialAccounts = socialAccounts.map(account => {
              if(account.accountName === 'GOOGLE') {
                  return {...account, details: _.omit(account.details, ['refreshToken', 'calendarId'])}
              }
              return account;
          })
          user.socialAccounts = socialAccounts;

          return res.status(200).json({
              data: {
                  isAuthorizedSuccessfully: true,
                  user: user
              }
          });
          
      } catch (err) {
          console.error("[controllers][entrance][authorizeGoogleAccount]: Error", err);
          return res.status(500).json({
              errors: [
                  { code: "UNKNOWN_SERVER_ERROR", message: err.message },
              ],
          });
      }  
    },

    removeGoogleAccount: async (req, res) => {
        try {
            // Code for deleting the Cantrak calendar from user's google calendar
            // For this code to work, we have to use sensitive scopes for which we will need to submit the
            // application for verification to Google.
            /*
            const googleAccount = await knex('social_accounts').where({accountName: 'GOOGLE', userId: req.me.id}).select(["*"]).first();
            if(googleAccount){
                const calendarId = googleAccount.details.calendarId;
                console.error("[controllers][entrance][removeGoogleAccount]:", googleAccount.details.calendarId, googleAccount.details.refreshToken);
                oauth2Client.setCredentials({
                    refresh_token: googleAccount.details.refreshToken,
                    scope: oauthScope
                });
                const calendar = google.calendar({ version: "v3", auth: oauth2Client });
                try {
                    await calendar.calendars.delete({
                        calendarId: calendarId,
                    })
                } catch(error) {
                    console.error("[controllers][entrance][removeGoogleAccount]: Can't delete the calendar as user has already deleted the calendar");
                    console.error("[controllers][entrance][removeGoogleAccount]: Can't delete the calendar as user has already deleted the calendar", error);
                }
            }
            */
            let googleAccount = await knexReader('social_accounts').where({ userId: req.me.id, accountName: 'GOOGLE' }).first();

            if(!googleAccount) {
                return res.status(404).json({
                    error: {
                        code: "ACCOUNT_NOT_FOUND",
                        message: 'Please connect your Google account to use this API',
                        error: new Error('Please connect your Google account to use this API')
                    }

                });
            }
            const { refreshToken } = googleAccount.details;

            const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
            const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
            const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
            const oauthScope =
            "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.app.created";

            const REDIRECT_URL = 'https://app.cantrak.tech' + '/' + GOOGLE_REDIRECT_URL;

            const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
            oauth2Client.setCredentials({
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: oauthScope
            });

            const result = await oauth2Client.getAccessToken()

            await oauth2Client.revokeToken(result.token);

            await knex('social_accounts')
                .where({ accountName: 'GOOGLE', userId: req.me.id })
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
            console.error("[controllers][entrance][removeGoogleAccount]: Error", err);
            return res.status(500).json({
                errors: [
                    { code: "UNKNOWN_SERVER_ERROR", message: err.message },
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