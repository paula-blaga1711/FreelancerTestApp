const express = require('express');
const router = express.Router();
const Setting = require('../models/setting');
const config = require('../config/config');



router.get('/', async function (req, res) {

    let settings = await Setting.getAllSettings();

    return res.status(200).json({
        key: settings
    })

});


module.exports = router;