const knex   = require('../db/knex');
const Joi    = require('@hapi/joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const moment = require('moment');
//const trx  = knex.transaction();
const uuidv4 = require('uuid/v4');
var jwt      = require('jsonwebtoken');
const _      = require('lodash');


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

            // check username & password not blank
            const validUser = await knex('users').where(function () {
                this.where('userName', loginPayload.userName)
            }).orWhere({ mobileNo: loginPayload.userName }).orWhere({ email: loginPayload.userName });

            console.log('[controllers][entrance][login]: ValidateUsername', validUser);
            if (validUser.length < 1) {
                return res.status(400).json({
                    errors: [
                        { code: 'ACCOUNT_NOT_FOUND_ERROR', message: 'Invalid credentials' }
                    ],
                });
            }

            loginResult = validUser[0];
            // console.log('[controllers][entrance][login]: ValidatePassword', loginResult.password);

            if (loginResult) {

                // check email is verified
                const verifyEmail = await knex('users').where({ email: loginResult.email, emailVerified: 'true' });
                console.log('[controllers][entrance][login]: Email verify', verifyEmail);

                if (verifyEmail && verifyEmail.length < 1) {
                    return res.status(400).json({
                        errors: [
                            { code: 'EMAIL_VERFICATION_ERROR', message: 'Please verify email id before login !' }
                        ],
                    });
                }

                // Get organization ID
                let orgId = loginResult.orgId;
                //const organization = await knex('users')
                console.log('Login Result: ',loginResult)


                //match input password with DB
                const match = await bcrypt.compare(loginPayload.password, loginResult.password);
                if (match) {
                    const loginToken = await jwt.sign({ id: loginResult.id,orgId }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7h' });
                    login = { accessToken: loginToken,refreshToken:'' };
                    loginResult = _.omit(loginResult, ['password']);

                    login.user = loginResult;

                    // check account status is active
                    const verifyStatus = await knex('users').where({ isActive: 'false', id: loginResult.id });
                    console.log('[controllers][entrance][login]: Account Blocked', verifyStatus);

                    if (verifyStatus && verifyStatus.length) {
                        return res.status(400).json({
                            errors: [
                                { code: 'ACCOUNT_BLOCKED_ERROR', message: 'Your account has been blocked, Please contact to administration !' }
                            ],
                        });
                    }


                    let roles = await knex('application_user_roles').select().where({userId:loginResult.id})

                    const Parallel = require('async-parallel');
                    login.user.roles = await Parallel.map(roles, async item => {
                        let rolename = await knex('application_roles').where({ id: item.roleId }).select('name');
                        rolename = rolename[0].name;
                        return rolename;
                    });

                    if (login.user.roles.includes("orgAdmin")) {
                      console.log("this is orgAdmin");
                      // get all the projects of this admin
                      const projects = await knex("projects")
                        .select("id")
                        .where({ orgId});
                      const companies = await knex("companies")
                        .select("id")
                        .where({ orgId});
                      const resources = await knex(
                        "organisation_resources_master"
                      )
                        .select("resourceId as id")
                        .where({ orgId});
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
                      console.log(userCompanyResources, userProjectResources);
                    }

                    if (login.user.roles.includes("orgUser")) {
                      const result = await knex("team_users")
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
                          "team_roles_project_master.orgId":orgId
                        });

                      // let userProjectResources = result;
                      console.log('Result: ',result);

                      let userProjectResources = _.chain(result)
                        .groupBy("resourceId")
                        .map((value, key) => ({
                          id: key,
                          projects: value.map(a => a.projectId)
                        }))
                        .value();
                      login.user.userProjectResources = userProjectResources;

                      console.log(
                        "Result***********************************************************",
                        userProjectResources
                      );
                    }


                    // res.status(200).json({
                    //     data: login,
                    //     message: "Login successfull"
                    // });
                    res.status(200).json(login)
                }

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

                const signupPayload = _.omit(req.body,'company','project','building','floor','unitNumber');

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
                const userHouseAllocationInsertData = {userId:user.id,houseId:signupPayload.houseId,createdAt:currentTime,updatedAt:currentTime,orgId:req.orgId}
                const insertedResult  = await knex('user_house_allocation').insert(userHouseAllocationInsertData).returning(['*'])
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
                message: "Login successfull"
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
};

module.exports = entranceController;