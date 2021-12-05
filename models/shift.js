const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Shift_Schema = new Schema({
    start: Date,
    end: Date,
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    texts: [{
        language: String,
        description: String,
        observations: String,
        tags: [String]
    }],
}, {
    versionKey: false
});

const Shift = module.exports = mongoose.model('shift', Shift_Schema, "shifts");

module.exports.getAllShifts = function (languageIdentifier, filter) {
    let matchCondition = filter;
    //to do: process matchConditions if necessary

    if (languageIdentifier == null)
        return Shift.find(matchCondition)
            .populate('employee')
            .sort({ start: 'desc' })
            .exec()
            .catch(err => {
                console.log("There has been an error: ", err);
                return null;
            });

    return Shift.find(matchCondition, {
        start: 1,
        end: 1,
        texts: { $elemMatch: { language: languageIdentifier } },
        tags: 1
    })
        .populate('employee')
        .sort({ start: 'desc' })
        .exec()
        .catch(err => {
            console.log("There has been an error: ", err);
            return null;
        });




}

module.exports.createShift = function (fields) {
    const newShift = new Shift({
        start: fields.start,
        end: fields.end,
        employee: fields.employee,
        texts: fields.texts,
    });
    return newShift.save()
        .then(result => {
            return {
                result: result
            }
        })
        .catch(err => {
            console.log("There's been an error: ", err);
            return null;
        });
}

module.exports.deleteShift = function (shifID) {
    return Shift.deleteOne({ _id: shifID })
        .then(result => {
            return { result: result };
        })
        .catch(err => {
            console.log(err);
            return null;
        })
};