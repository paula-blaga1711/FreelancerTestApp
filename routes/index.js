const homeRoute = require('./home');
const settingsRoutes = require('./settings');
const userRoutes = require('./users');
const shiftRoutes = require('./shifts');

app.use('/', homeRoute);
app.use('/settings', settingsRoutes);
app.use('/users', userRoutes);
app.use('/shifts', shiftRoutes);