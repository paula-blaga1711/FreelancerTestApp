const express = require('express');
const router = express.Router();
const Settings = require('../models/setting');
const config = require('../config/config');

global.roleByIndex = async function (index) {
    let role = await Settings.getRoleByIndex(index);
    if (role && role != null) {
        return role;
    } else return null;
};

global.languageByIndex = async function (index) {
    let language = await Settings.getLanguageByIndex(index);
    if (language && language != null) {
        return language;
    } else return null;
};


router.get('/', async function (req, res) {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || await config.checkLanguage(req.query.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language
    let responseMessages = await config.responseMessages(languageIdentifier);
    let settings = await Settings.getAllSettings();

    if (settings && settings != null) {
        return res.status(200).json({
            ...settings
        });
    } else
        return res.status(500).json({
            message: responseMessages['generalError']
        });

});

router.get('/roles', async function (req, res) {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || await config.checkLanguage(req.query.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let roles = await Settings.getRoles();
    if (roles && roles != null) {
        return res.status(200).json({
            roles: roles
        })
    } else
        return res.status(500).json({
            message: responseMessages['generalError']
        });
});

router.get('/roles/:index', async function (req, res) {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || await config.checkLanguage(req.query.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let role = await this.roleByIndex(req.params.index);
    if (role && role != null) {
        return res.status(200).json({
            role: role
        })
    } else
        return res.status(400).json({
            message: responseMessages['generalError']
        });
});

router.get('/languages', async function (req, res) {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || await config.checkLanguage(req.query.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let languages = await Settings.getLanguages();
    if (languages && languages != null) {
        return res.status(200).json({
            languages: languages
        })
    } else
        return res.status(500).json({
            message: responseMessages['generalError']
        });
});

router.get('/languages/:index', async function (req, res) {
    let languageIdentifier = null;
    if (!_.has(req.query, 'language') || await config.checkLanguage(req.query.language) === false) languageIdentifier = 'gb'
    else languageIdentifier = req.query.language

    let responseMessages = await config.responseMessages(languageIdentifier);
    let language = await this.languageByIndex(req.params.index);
    if (language && language != null) {
        return res.status(200).json({
            language: language
        })
    } else
        return res.status(400).json({
            message: responseMessages['generalError']
        });
});

module.exports = router;