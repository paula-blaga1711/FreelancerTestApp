const homeRoute = require('./home');
const settingsRoutes = require('./settings');
const userRoutes = require('./users')

app.use('/', homeRoute);
app.use('/settings', settingsRoutes);
app.use('/users', userRoutes);