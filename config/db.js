const config = require('./config');
const { port, db_host, user, psw, db_name } = require('./config').environmentVariables;
const DBconfig = {
    database: db_host,
    databaseConfig: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        user: user,
        pass: psw,
        dbName: db_name
    }
};

var db = require('mongoose');
db.connect(DBconfig.database, DBconfig.databaseConfig);

db.connection.once('open', function () {
    console.log(`Connection to ${DBconfig.databaseConfig.dbName} database has been established. Application running on port ${port}`);
}).on('error', function (error) {
    console.log('An error occured while trying to connect to the database: ', error);
});