const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

// log 에 들어갈 Log 필요

const logSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: {type: Date, default: Date.now}
});

const userSchema = new mongoose.Schema({
  username: String,
  log: []
});

const User = new mongoose.model("User", userSchema);
const Log = new mongoose.model("Log", logSchema);


// Add new Username Begin
const addNewUser = function(res, userName) {
  const user = new User({
    username: userName,
    log: []
  });

  user.save((err, data) => {
    if (data) res.json({username: data["username"], _id: data["_id"]}); 
    else res.send("failed to save");
  });
}

const findMatchingOneByUsername = function(res, userName, callback) {
  User.findOne({username: userName}, (err, foundOne) => {
    if (err) res.json(err);
    if (foundOne) {
      res.send("Username already taken");
    } else {
      callback(res, userName);
    }
  });
}
// Add new Username End

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/users', (req, res) => {
  User.find({}, ['_id', 'username'], (err, data) => {
    res.json(data);
  });
});

app.post('/api/exercise/new-user', (req, res) => {
  const userName = req.body.username;

  findMatchingOneByUsername(res, userName, addNewUser);
});

app.post('/api/exercise/add', (req, res) => {
  const userId = req.body.userId;
  const _description = req.body.description;
  const _duration = req.body.duration;
  const _date = req.body.date;

  const newLog = new Log({
    description: _description,
    duration: _duration,
    date: new Date(_date)
  });

  User.findOne({_id: userId}, function(err, data) {
    data.log.push(newLog);
    data.save();
    res.json({
      _id: data["_id"],
      username: data["username"],
      date: newLog["date"].toDateString(),
      duration: newLog["duration"],
      description: newLog["description"]
    });
  });
});

app.get('/api/exercise/log', (req, res) => {
  User.findById(req.query.userId, (error, result) => {
    if (!error) {
      let responseObject = result;

      if (req.query.from || req.query.to) {
        let fromDate = new Date(0);
        let toDate = new Date();

        if (req.query.from) {
          fromDate = new Date(req.query.from);
        }
        if (req.query.to) {
          toDate = new Date(req.query.to);
        }

        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime();

          return sessionDate >= fromDate && sessionDate <= toDate;
        });
      }

      if (req.query.limit) {
        responseObject.log = responseObject.log.slice(0, req.query.limit);
      } 

      responseObject['count'] = result.log.length;
      res.json(responseObject);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
