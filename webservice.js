var express = require('express'),
  app = express(),
  port = 8005,
  bodyParser = require('body-parser');
  
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Comment out if using IBM Watson
process.env.GOOGLE_APPLICATION_CREDENTIALS=process.cwd() + "/config/google.json";

var routes = require('./api/routes/acequill.js');
routes(app); //register the route


app.listen(port);


console.log('ACE QUILL WebAPI Service Started on port:', port);
