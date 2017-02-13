var config = require("./config.json");

// Require the MQTT connections
var mqtt = require('mqtt');

// Require the Winston Logger
var logger = require('./logger.js');

var http = require('http');
var five = require("johnny-five");
var Edison = require("edison-io");
var board = new five.Board({
  io: new Edison()
});

var lampOn = false;
var lampOff = false;
var send = false;

// Print the client status
logger.info("Light Sensor Daemon is starting");

// Connect to the MQTT server
var mqttClient  = mqtt.connect(config.mqtt.uri);

var options = {
  "host": config.bridgeip,
  "path": "/api/" + config.username + "/lights/4/state",
  "method": "PUT",
  "headers": {
    "Content-Type" : "application/json",
  }
}

http_callback = function(response) {
  var str = ''
  response.on('data', function(chunk){
    str += chunk
  })

  response.on('end', function(){
    console.log(str)
  })
}

// MQTT connection function
mqttClient.on('connect', function () {
    mqttClient.publish("announcements", JSON.stringify({
        id : "9C9D0D",
        name : "light",
        description: "A light sensor",
        timestamp: 1000,
	latency: 0,
        active: true,
        ioType: "analog"
    }));

    mqttClient.subscribe("/light/toggle/state");

    logger.info("Connected to MQTT server");
});


mqttClient.on('message', function (topic, message) {
    // Parse the incoming data
    try {
        json = JSON.parse(message);
	logger.info(json);
    } catch(e){
        logger.info(e);
    }

    // Is the message a announcement of a new sensor on the network
    if (topic.match(/toggle/)) {
	    lampOn = lampOff = false;
    /*    logger.info("Received state toggle from gateway");
	if(lampOn) {
        logger.info("Turning Lamp OFF");
	http.request(options, http_callback).end(JSON.stringify({
          "on": false,
          "transitiontime": 0
        }));
	} else if(lampOff) {
	logger.info("Turning Lamp ON");
        http.request(options, http_callback).end(JSON.stringify({
          "on": true,
          "transitiontime": 0
        }));
	}*/

    }
});

board.on("ready", function() {

  var light = new five.Sensor("A1");

  light.on("change", function() {
    // Build JSON structure to hold
    // data on the edge network
    send = false;

    if((this.value > 600) && !lampOn) {
        lampOn = true;
	lampOff = false;
	send = true;	
    }

    if((this.value < 370) && !lampOff) {
        lampOn = false;
        lampOff	= true;
        send = true;
    }

    if(send) {
    	var sensorData = {
        	sensor_id: "9C9D0D",
	        value: this.value,
        	lampOn: lampOn,
		lampOff: lampOff,
	        timestamp: Date.now()
    	};

	mqttClient.publish (
        	"sensors/light/data",
	        JSON.stringify(sensorData)
	);
         console.log("MQTT Publish: ", sensorData);
     }
         
  });
});

