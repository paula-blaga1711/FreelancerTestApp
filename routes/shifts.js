const express = require('express');
const router = express.Router();
const moment = require('moment');
const Settings = require('../models/setting');
const config = require('../config/config');
const auth0 = require('../config/auth0');
const Shift = require('../models/shift');
const User = require('../models/user');

async function setFilters(receivedFilters) {
    //to do: add filter by period
    let filters = {};
    if (_.has(receivedFilters, "text")) {
        var findText = new RegExp(receivedFilters.text, 'i');
        filters = Object.assign(filters,
            {
                $or: [
                    { 'texts.description': { $regex: findText } },
                    { 'texts.observations': { $regex: findText } }
                ]
            });
    };

    if (_.has(receivedFilters, 'tags'))
        filters = Object.assign(filters, { 'texts.tags': { $in: receivedFilters.tags } });

    return filters;
}

async function checkShiftFields(fields) {
    if (_.isEmpty(fields)) return false;
    if (!(_.has(fields, 'start'))) return false;
    if (!(_.has(fields, 'employee'))) return false;
    if ((_.has(fields, 'observations') || _.has(fields, 'description') || _.has(fields, 'tags'))
        && !(_.has(fields, 'language'))) return false;
    return true;
}

async function checkShiftFieldsContent(fields) {
    if (await checkStartDate(fields.start) === false) return false;
    if (await checkUser(fields.employee) === false) return false;
    if ((_.has(fields, 'observations') || _.has(fields, 'description')) || _.has(fields, 'tags')) {
        if (await config.checkLanguage(fields.language) === false) return false;
        if (_.has(fields, 'tags') && !Array.isArray(fields.tags)) return false;
    }
    return true;
}

async function checkStartDate(dateTime) {
    if (config.checkIfDate(dateTime) === false) return false;
    if (moment.utc(Date.now()).diff(moment.utc(dateTime), 'minutes') > 59) return false;

    let settings = await Settings.getAllSettings();
    if (_.isEmpty(_.filter(settings.Work_Shits, function (o) {
        return o.start == moment.utc(dateTime).hour()
    }))) return false;
    return true;
}

async function checkUser(userID) {
    if (!checkMongooseID(userID)) return false;
    let querriedEmployee = await User.getUserById(userID);
    if (_.isEmpty(querriedEmployee)) return false;
    return true;
}


router.get('/', jwtCheck, async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.body, 'language') || await config.checkLanguage(req.body.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.body.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let loggedInUser = await getUserByAuth(req.user);

    if (loggedInUser && loggedInUser == null)
        return res.status(401).json({ message: responseMessages['notLoggedIn'] });

    if (loggedInUser && loggedInUser == 'notConfirmed')
        return res.status(403).json({ message: responseMessages['notConfirmed'] });

    let filters = await setFilters(_.omit(req.query, ['language', 'pageNo']));
    let shifts = []
    let roles = await Settings.getRoles();

    if (loggedInUser.role == roles[0] && !_.has(req.query, 'language')) {
        shifts = await Shift.getAllShifts(null, filters)
    }
    else
        shifts = await Shift.getAllShifts(languageIdentifier, filters);


    return res.status(200).json({ shifts: shifts });
});

router.get('/:id', jwtCheck, async (req, res) => {
    let languageIdentifier = null;
    if (!_.has(req.body, 'language') || await config.checkLanguage(req.body.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.body.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let loggedInUser = await getUserByAuth(req.user);

    if (loggedInUser && loggedInUser == null)
        return res.status(401).json({ message: responseMessages['notLoggedIn'] });

    if (loggedInUser && loggedInUser == 'notConfirmed')
        return res.status(403).json({ message: responseMessages['notConfirmed'] });

    if (!checkMongooseID(req.params.id))
        return res.status(400).json({ message: responseMessages['wrongData'] });

    let queriedShift = await Shift.getAllShifts(null, { _id: req.params.id });
    if (!_.isEmpty(queriedShift)) {
        return res.status(200).json({ shift: queriedShift });
    } else
        return res.status(400).json({ message: responseMessages['generalError'] });
});

router.post('/', jwtCheck, async (req, res) => {
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
    if (roles && loggedInUser && loggedInUser.role !== roles[0] && loggedInUser.role !== roles[1])
        return res.status(403).json({ message: responseMessages['unauthorizedAccess'] });

    let receivedfields = req.body

    let shiftFiledsCheck = await checkShiftFields(receivedfields);
    if (!shiftFiledsCheck)
        return res.status(400).json({ message: responseMessages['notEnoughData'] });

    let shiftFiledsContentCheck = await checkShiftFieldsContent(receivedfields);
    if (!shiftFiledsContentCheck)
        return res.status(400).json({ message: responseMessages['wrongData'] });

    let settings = await Settings.getAllSettings();

    let newShiftFields = {
        start: moment.utc(receivedfields.start),
        end: moment.utc(receivedfields.start).add(`${settings.Shift_duration}`, 'hours'),
        employee: receivedfields.employee
    }

    let text = {}
    if (_.has(receivedfields, 'observations'))
        text = Object.assign(text, { observations: receivedfields.observations })

    if (_.has(receivedfields, 'description'))
        text = Object.assign(text, { description: receivedfields.description })

    if (_.has(receivedfields, 'tags'))
        text = Object.assign(text, { tags: receivedfields.tags })

    if (!_.isEmpty(text)) {
        text = Object.assign(text, { language: receivedfields.language });
        let texts = []
        texts.push(text);
        newShiftFields = Object.assign(newShiftFields, { texts: texts });
    }

    let newShift = await Shift.createShift(newShiftFields);
    if (_.isEmpty(newShift))
        return res.status(400).json({ message: responseMessages['errorOnSave'] });

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

    let queriedShift = await Shift.getAllShifts(null, { _id: req.params.id });
    if (!_.isEmpty(queriedShift)) {
        let responseDelete = await Shift.deleteShift(queriedShift[0]._id);
        if (responseDelete.result.deletedCount == 1)
            return res.status(200).json({ message: responseMessages['success'] });
        else
            return res.status(400).json({ message: responseMessages['generalError'] });
    } else
        return res.status(400).json({ message: responseMessages['entryNotFound'] });
})

//to do: update route
module.exports = router;