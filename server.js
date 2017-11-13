// server.js
var express = require('express');
var app = express();
var server = require("http").createServer(app);
var five = require("johnny-five");
var io = require('socket.io')(server);
var port = 3000;
var serverArgs = process.argv.slice(2).toString().toLowerCase();
var arduinos = [];
switch (serverArgs) {
case "led":
  arduinos = [
    {
      id: "standardFirmata"
      , port: "/dev/cu.usbmodem1411"
      }
    ];
  break;
case "servo":
  arduinos = [
    {
      id: "standardFirmata"
      , port: "/dev/cu.usbmodem1411"
      }
    ];
  break;
case "usen":
  arduinos = [
    {
      id: "pingFirmata"
      , port: "/dev/cu.usbmodem1421"
      }
    ];
  break;
case "gamepad":
  arduinos = [];
  break;
default:
  console.log(serverArgs)
  arduinos = [
    {
      id: "standardFirmata"
      , port: "/dev/cu.usbmodem1411"
      }
      , {
      id: "pingFirmata"
      , port: "/dev/cu.usbmodem1421"
      }
    ];
  break;
}
var oldData = 0;
//create the node server and serve the files
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});
server.listen(port);
console.log('Server started, page available at http://localhost:' + port);
//Arduino board connection
var boards = new five.Boards(arduinos);
boards.on("ready", function () {
  var led, servo, proximity;
  this.each(function (board) {
    if (board.id === 'standardFirmata') {
      led = new five.Led({
        pin: 9
        , board: board
      });
      servo = new five.Servo.Continuous({
        pin: 10
        , board: board
      });
      console.log(board.port + ' connected');
    }
    if (board.id === 'pingFirmata') {
      proximity = new five.Proximity({
        controller: "HCSR04"
        , pin: 7
        , freq: 500
        , board: board
      });
      console.log(board.port + ' connected');
    }
  });
  console.log('Arduinos connected');
  //SocketIO connection handler and listening
  io.on('connection', function (socket) {
    var ledState = "off";
    console.log("your socket id is ", socket.id);
    if (serverArgs !== "gamepad") {
      if (serverArgs === "servo" || serverArgs === "") {
        socket.on('looked', function (data) {
          if (ledState === 'off') {
            console.log('looked at: ' + data);
            if (data - oldData === 0) {
              servo.stop();
            }
            else if (data - oldData > 0) {
              console.log('Looked Left');
              servo.cw(.5);
            }
            else {
              console.log('Looked Right');
              servo.ccw(.5);
            }
          }
          oldData = data;
        });
      }
      if (serverArgs === "led" || serverArgs === "") {
        socket.on('led:on', function () {
          ledState = "on";
          led.on();
          servo.stop();
          console.log('LED On Received and servo is stopped');
        });
        socket.on('led:off', function () {
          ledState = "off";
          led.off();
          console.log('LED Off Received and servo is free to move');
        });
      }
      if (serverArgs === "usen" || serverArgs === "") {
        proximity.on("data", function () {
          if (this.in <= 24) {
            console.log('DANGER AHEAD!');
            socket.emit('danger:on');
          }
          else {
            socket.emit('danger:off');
          }
        });
      }
    }
    socket.on('disconnect', function () {
      console.log('browser closed');
    })
  });
});
//if nothing else is happened yet.
console.log('Waiting for arduino connection..');