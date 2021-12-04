const express = require('express');
const router = express.Router();
const Settings = require('../models/setting');
const config = require('../config/config');
const auth0 = require('../config/auth0');
const User = require('../models/user');
const { findLastKey } = require('lodash');

function checkloginFields(fields) {
    if (_.isEmpty(fields)) return false;
    if (!(_.has(fields, 'email'))) return false;
    if (_.isEmpty(fields.email)) return false;
    if (!(_.has(fields, 'password'))) return false;
    if (_.isEmpty(fields.password)) return false;
    return true;
};

function checkUserFields(fields) {
    if (_.isEmpty(fields)) return false;
    if (!(_.has(fields, 'name'))) return false;
    if (checkloginFields(fields) === false) return false;
    return true;
};

async function deleteUserFromAuth0(user) {
    let auth0Token = await auth0.GetAuth0TokenMachineToMachine();
    if (auth0Token && auth0Token !== null) {
        statusCode = await auth0.DeleteAuth0User(user.auth0_id, auth0Token);
        if (statusCode != 200 && statusCode != 204) return false
    } else return false;

    return true;
};

let checkRole = module.exports.checkRole = async function (role) {
    let rolesDB = await Settings.getRoles();
    return (!_.isEmpty(_.filter(rolesDB, function (o) {
        return o == role
    })));
};


router.get('/', jwtCheck, async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || (await config.checkLanguage(req.query.language)) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language;

    let responseMessages = await config.responseMessages(languageIdentifier);
    if (await config.checkLanguage(languageIdentifier) == false)
        return res.status(400).json({ message: responseMessages['wrongData'] });

    let loggedInUser = await getUserByAuth(req.user);
    if (loggedInUser && loggedInUser == null)
        return res.status(401).json({ message: responseMessages['notLoggedIn'] });

    if (loggedInUser && loggedInUser == 'notConfirmed')
        return res.status(403).json({ message: responseMessages['notConfirmed'] });

    let roles = await Settings.getRoles();
    if (roles && loggedInUser && loggedInUser.role !== roles[0])
        return res.status(403).json({ message: responseMessages['unauthorizedAccess'] });

    let users = await User.getAllUsers();
    if (users && users != null) {
        return res.status(200).json({ users: users });
    } else
        return res.status(400).json({ message: responseMessages['generalError'] });
});

router.get('/myself', jwtCheck, async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || await config.checkLanguage(req.query.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language;

    let responseMessages = await config.responseMessages(languageIdentifier);
    let loggedInUser = await getUserByAuth(req.user);

    if (loggedInUser && loggedInUser == null)
        return res.status(401).json({ message: responseMessages['notLoggedIn'] });

    if (loggedInUser && loggedInUser == 'notConfirmed')
        return res.status(403).json({ message: responseMessages['notConfirmed'] });

    return res.status(200).json({ user: loggedInUser });
});

router.get('/:id', jwtCheck, async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || await config.checkLanguage(req.query.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let loggedInUser = await getUserByAuth(req.user);

    if (loggedInUser && loggedInUser == null)
        return res.status(401).json({ message: responseMessages['notLoggedIn'] });

    if (loggedInUser && loggedInUser == 'notConfirmed')
        return res.status(403).json({ message: responseMessages['notConfirmed'] });

    let roles = await Settings.getRoles();
    if (roles && loggedInUser && loggedInUser.role !== roles[0])
        return res.status(403).json({ message: responseMessages['unauthorizedAccess'] });

    if (!checkMongooseID(req.params.id))
        return res.status(400).json({ message: responseMessages['wrongData'] });

    let user = await User.getUserById(req.params.id);
    if (user && user != null) {
        return res.status(200).json({ user: user });
    } else
        return res.status(400).json({ message: responseMessages['generalError'] });
});

router.post('/login', async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.body, 'language') || await config.checkLanguage(req.body.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.body.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let fields = req.body

    if (checkloginFields(fields) === false)
        return res.status(400).json({ message: responseMessages['notEnoughData'] });

    let bearerToken = await auth0.userLoginToAuth0(fields.email, fields.password);

    if (_.isEmpty(bearerToken)) {
        return res.status(400).json({ message: responseMessages['generalError'] });
    } else {
        if (bearerToken == 'wrongEmail') {
            return res.status(403).json({ message: responseMessages['wrongEmail'] });
        }

        let decodedToken = await auth0.decodeJwt(bearerToken);
        let User = await getUserByAuth(decodedToken);

        if (User && User == null)
            return res.status(400).json({ message: responseMessages['noUser'] });

        if (User && User == 'notConfirmed') {
            return res.status(403).json({ message: responseMessages['notConfirmed'] });
        }

        return res.status(200).json({ token: bearerToken });
    }
});

router.post('/register', async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.body, 'language') || await config.checkLanguage(req.body.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.body.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let fields = req.body

    if (checkUserFields(fields) === false)
        return res.status(400).json({ message: responseMessages['notEnoughData'] });

    let auth0ID = await auth0.selfSignUpToAuth0(fields.email, fields.password)
    if (_.isEmpty(auth0ID)) {
        return res.status(400).json({ message: responseMessages['generalError'] });
    } else {
        if (_.has(auth0ID, 'statusCode') && auth0ID.statusCode == 400) {
            return res.status(400).json({ message: auth0ID.description });
        } else fields = Object.assign(fields, { auth0_id: auth0ID });
    }

    fields = Object.assign(fields, { role: 'worker' });
    let newUser = await User.createUser(fields);

    if (newUser && newUser != null) {
        return res.status(200).json({ message: responseMessages['success'] });
    } else
        return res.status(400).json({ message: responseMessages['generalError'] });
});

router.post('/forgot-password', async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.body, 'language') || await config.checkLanguage(req.body.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.body.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let fields = req.body

    if (!_.has(fields, 'email') || _.isEmpty(fields.email))
        return res.status(400).json({ message: responseMessages['notEnoughData'] });

    let resetRequest = await auth0.resetPassword(fields.email);
    if (resetRequest != true)
        return res.status(400).json({ message: responseMessages['generalError'] });

    return res.status(200).json({ message: responseMessages['success'] });
});

router.delete('/:id', jwtCheck, async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.body, 'language') || await config.checkLanguage(req.body.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.body.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let loggedInUser = await getUserByAuth(req.user);

    if (loggedInUser && loggedInUser == null)
        return res.status(401).json({ message: responseMessages['notLoggedIn'] });

    if (loggedInUser && loggedInUser == 'notConfirmed')
        return res.status(403).json({ message: responseMessages['notConfirmed'] });

    let roles = await Settings.getRoles();
    if (roles && loggedInUser && loggedInUser.role !== roles[0])
        return res.status(403).json({ message: responseMessages['unauthorizedAccess'] });

    if (!checkMongooseID(req.params.id))
        return res.status(400).json({ message: responseMessages['wrongData'] });

    let queriedUser = await User.getUserById(req.params.id);
    if (!_.isEmpty(queriedUser)) {
        if (await deleteUserFromAuth0(queriedUser) === null)
            return res.status(400).json({ message: responseMessages['generalError'] });
        else {
            let responseDelete = await User.deleteUser(queriedUser._id);
            if (responseDelete)
                return res.status(200).json({ message: responseMessages['success'] });
            else
                return res.status(400).json({ message: responseMessages['generalError'] });
        }
    } else
        return res.status(400).json({ message: responseMessages['noSuchUser'] });
});

router.put('/:id', jwtCheck, async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.body, 'language') || await config.checkLanguage(req.body.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.body.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let loggedInUser = await getUserByAuth(req.user);
    let roles = await Settings.getRoles();

    if (loggedInUser && loggedInUser == null)
        return res.status(401).json({ message: responseMessages['notLoggedIn'] });

    if (loggedInUser && loggedInUser == 'notConfirmed')
        return res.status(403).json({ message: responseMessages['notConfirmed'] });

    if (!checkMongooseID(req.params.id))
        return res.status(400).json({ message: responseMessages['wrongData'] });

    let queriedUser = await User.getUserById(req.params.id);
    if (_.isEmpty(queriedUser))
        return res.status(400).json({ message: responseMessages['noSuchUser'] });

    if (!queriedUser._id.equals(loggedInUser._id) && loggedInUser.role !== roles[0])
        return res.status(403).json({ message: responseMessages['unauthorizedAccess'] });

    let updateableProperties = {};
    _.forEach(User.schema.paths, function (value, key) {
        //console.log('iteration is at: ', key)
        if (loggedInUser.role !== roles[0] && key == "role") return false

        if (key != '_id' && key != 'auth0_id' && key != 'email') {
            updateableProperties[key] = _.pick(value, ['path', 'instance', 'isRequired', 'defaultValue', 'options']);
        }
    });

    let fields = req.body
    _.forEach(fields, function (value, key) {
        if (!_.hasIn(updateableProperties, key)) {
            //console.log('deleting ', fields[key])
            delete fields[key];
        } else {
            if ((updateableProperties[key].instance == 'ObjectID' && checkMongooseID(value) == false) ||
                (updateableProperties[key].instance == 'Boolean' && value != 'true' && value != 'false'))
                delete fields[key]
        }
    });

    if (_.has(fields, 'role') && await checkRole(fields.role) == false) delete fields.role;

    if (_.isEmpty(fields))
        return res.status(400).json({ message: responseMessages['nothingToUpdate'] });

    let updateUser = await User.updateUser(queriedUser._id, fields);
    if (_.isEmpty(updateUser) || updateUser.result.matchedCount != 1 || updateUser.result.modifiedCount != 1 || updateUser.result.acknowledged != true)
        return res.status(400).json({ message: responseMessages['generalError'] });
    else
        return res.status(200).json({
            message: responseMessages['success'],
        });
});

module.exports = router;