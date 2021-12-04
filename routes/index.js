const homeRoute = require('./home');
const settingsRoutes = require('./settings');

app.use('/', homeRoute);
app.use('/settings', settingsRoutes);