var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const http = require('http')
require('dotenv').config();
const { connectToMongoDB } = require('./config/db');

var usersRouter = require('./routes/userRouter');
var vehiculeRoutes = require('./routes/vehiculeRouter');  
var reclamationRoutes = require('./routes/reclaimRouter');
var promotionRoutes = require('./routes/promotionRouter');
var scanRoutes = require('./routes/scanRouter');
var commandeRoutes = require('./routes/commandeRouter');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/usersR', usersRouter);
app.use('/vehiculeRoutes', vehiculeRoutes);
app.use('/reclamationRoutes', reclamationRoutes);
app.use('/promotionRoutes', promotionRoutes);
app.use('/scanRoutes', scanRoutes);
app.use('/commandeRoutes', commandeRoutes);
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json('error');
});



// Create HTTP server and listen on port 5000
const server = http.createServer(app);
server.listen(process.env.port, () => {
    connectToMongoDB();
    console.log('Server is running on port 5000');
});

