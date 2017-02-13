var config = require("./config.json");

// Require the MQTT connections
var mqtt = require('mqtt');

// Require the Winston Logger
var logger = require('./logger.js');

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

    logger.info("Connected to MQTT server");
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

