const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Settings_Schema = new Schema({
    user_roles: [String],
    work_shifts:[{
        name: String,
        start: Number
    }],
    work_shift_duration: Number
});

const Settings = module.exports.Settings = mongoose.model('settings', Settings_Schema);

module.exports.getAllSettings = function () {
    return Settings.find()
        .exec()
        .catch(err => {
            console.log("There has been an error: ", err);
            return null;
        });
}