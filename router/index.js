// Define routes

module.exports = function(app){
    app.use('/', require('./routes/index.js'));
    app.use('/users', require('./routes/users.js'));
};