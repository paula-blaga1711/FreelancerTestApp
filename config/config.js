const mongoose = require('mongoose');
const moment = require('moment');
//const Settings = require('../models/setting');
const fs = require('fs');

module.exports.environmentVariables = {
    port: process.env.PORT,
    db_host: process.env.DB_HOST,
    user: process.env.DB_USER,
    psw: process.env.DB_PASSWORD,
    db_name: process.env.DB_NAME,
    // auth_domain: process.env.AUTH_DOMAIN,
    // app_client: process.env.APP_CLIENT_ID,
    // app_secret: process.env.APP_SECRET,
    // m2m_client: process.env.M2M_CLIENT_ID,
    // m2m_secret: process.env.M2M_SECRET
};

var _ = require('lodash');

global.checkMongooseID = function (mongooseID) {
    if (!mongoose.Types.ObjectId.isValid(mongooseID))
        return false;
    return true;
};