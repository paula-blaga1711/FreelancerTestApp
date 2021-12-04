const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User_Schema = new Schema({
    auth0_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    }
}, {
    versionKey: false
});

const User = module.exports = mongoose.model('user', User_Schema, "users");

module.exports.getAllUsers = function () {
    return User.find({}).exec()
        .catch(err => {
            console.log("There has been an error: ", err);
            return null;
        });
};

module.exports.getUserByAut0ID = function (auth0_ID) {
    return User.find({
        auth0_id: auth0_ID
    })
        .exec()
        .then(user => {
            return user[0];
        })
        .catch(err => {
            console.log(err);
            return null;
        });
};

module.exports.getUserById = function (userID) {
    if (!mongoose.Types.ObjectId.isValid(userID))
        return null;

    return User.findById(userID)
        .exec()
        .catch(err => {
            console.log(err);
            return null;
        });
};

module.exports.createUser = function (fields) {
    const newUser = new User({
        auth0_id: fields.auth0_id,
        name: fields.name,
        email: fields.email,
        role: fields.role,
        shifts: null
    });
    return newUser.save()
        .then(result => {
            return {
                result: result
            }
        })
        .catch(err => {
            console.log("There's been an error: ", err);
            return null;
        });
};

module.exports.deleteUser = function (userID) {
    return User.deleteOne({ _id: userID })
        .then(result => {
            return { result: result };
        })
        .catch(err => {
            console.log(err);
            return null;
        })
};

module.exports.updateUser = function (userID, fields) {
    return User.updateOne({ _id: userID }, { $set: fields })
        .then(result => {
            return { result: result };
        })
        .catch(err => {
            console.log(err);
            return null;
        })
};