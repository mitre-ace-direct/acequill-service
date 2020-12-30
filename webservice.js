var express = require('express'),
  app = express(),
  port = 8005,
  //Task = require('./api/models/todoListModel'), //created model loading here
  bodyParser = require('body-parser');
  
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
process.env.GOOGLE_APPLICATION_CREDENTIALS=process.cwd() + "/transcription/google-settings.json";

var routes = require('./api/routes/acequill.js');
routes(app); //register the route


app.listen(port);


console.log('todo list RESTful API server started on: ' + port);
