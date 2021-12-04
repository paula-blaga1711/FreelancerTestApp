const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const request = require('request');
const User = require('../models/user');
const jwtDecode = require('jwt-decode');
const { auth_domain, app_client, m2m_client, m2m_secret } = require('./config').environmentVariables;

global.jwtCheck = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${auth_domain}/.well-known/jwks.json`
    }),

    issuer: `https://${auth_domain}/`,
    algorithms: ['RS256']
});

global.getUserByAuth = async function (user) {
    let loggedIn = await User.getUserByAut0ID(user.sub);
    if (user.email_verified === false) {
        return 'notConfirmed';
    }

    if (loggedIn && loggedIn != null) {
        return loggedIn;
    } else return null;
};

module.exports.decodeJwt = function (token) {
    return jwtDecode(token)
};

let optionsGetToken = {
    method: 'POST',
    url: `https://${auth_domain}/oauth/token`,
    headers: { 'content-type': 'application/json' },
    body: `{"grant_type":"client_credentials","client_id":"${m2m_client}","client_secret":"${m2m_secret}","audience":"https://${auth_domain}/api/v2/"}`
};

module.exports.GetAuth0TokenMachineToMachine = function () {
    return new Promise(resolve => {
        request(optionsGetToken, function (error, response, body) {
            if (error) {
                console.log(error);
                resolve(null);
                return null;
            } else {
                let receivedBodyObject = JSON.parse(body);
                auth0Token = receivedBodyObject.access_token;
                resolve(auth0Token);
                return auth0Token;
            }
        });
    })
};

module.exports.DeleteAuth0User = function (userID, token) {
    return new Promise(resolve => {
        request({
            method: 'DELETE',
            url: `https://${auth_domain}/api/v2/users/${userID}`,
            headers: { 'Authorization': `Bearer ${token}` },
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                resolve(null);
                return null;
            } else {
                status = response.statusCode;
                resolve(status);
                return status;
            }
        });
    });
};

let optionsLogin = {
    method: 'POST',
    url: `https://${auth_domain}/oauth/token`,
    headers: { 'content-type': 'application/json' },
    body: {
        grant_type: 'password',
        client_id: `${app_client}`,
        username: '',
        password: ''
    },
    json: true
};

module.exports.userLoginToAuth0 = function (userEmail, userPass) {
    let token = null;
    optionsLogin.body.username = userEmail;
    optionsLogin.body.password = userPass;

    return new Promise(resolve => {
        request(optionsLogin, function (error, response, body) {
            if (error) {
                console.log('could not log in: ', error);
                resolve(null);
                return;
            } else {
                if (_.has(body, 'id_token')) {
                    resolve(body.id_token);
                    return;
                } else {
                    if (_.has(body, 'error_description') && body.error_description == 'Wrong email or password.') {
                        resolve('wrongEmail');
                        return;
                    } else {
                        resolve(null);
                        return;
                    }
                }
            }
        })
    })
};

let optionsSignUp = {
    method: 'POST',
    url: `https://${auth_domain}/dbconnections/signup`,
    headers: { 'content-type': 'application/json' },
    body:
    {
        client_id: `${app_client}`,
        email: '', // '$(\'#signup-email\').val()',
        password: '', // '$(\'#signup-password\').val()',
        connection: 'Username-Password-Authentication',
        user_metadata: { name: '' }
    },
    json: true
};

module.exports.selfSignUpToAuth0 = function (userEmail, userPass) {
    let authID = null;
    optionsSignUp.body.email = userEmail;
    optionsSignUp.body.password = userPass;
    optionsSignUp.body.user_metadata.name = userEmail;

    return new Promise(resolve => {
        request(optionsSignUp, function (error, response, body) {


            if (error) {
                console.log('could not complete sign-up: ', error);
                resolve(null);
                return;
            } else {
                if (_.has(body, 'statusCode') && body.statusCode == 400) {
                    resolve(body)
                    return;
                }

                if (!_.has(body, '_id')) {
                    resolve(null);
                    return;
                } else {
                    authID = 'auth0|' + body._id;
                    resolve(authID);
                    return;
                }
            }
        });
    });
};

module.exports.resetPassword = async function (userEmail) {
    let resetPasswordOptions = {
        method: 'POST',
        url: `https://${auth_domain}/dbconnections/change_password`,
        headers: { 'content-type': 'application/json' },
        body: {
            connection: 'Username-Password-Authentication',
            email: `${userEmail}`,
            client_id: `${app_client}`,
            mark_email_as_verified: true
        },
        json: true
    };

    return new Promise(resolve => {
        request(resetPasswordOptions, function (error, response, body) {
            //console.log(response)
            if (error) {
                console.log(`could not complete password reset for ${userEmail}`, error);
                resolve(null);
                return;
            } else {
                console.log('got body: ', body)
                resolve(true);
                return;
            }
        });
    });
};