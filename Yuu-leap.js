var argv = require("minimist")(process.argv.slice(2));
var Leap = require("leapjs");
var sio = require("socket.io-client");

var WEBSOCKET_SERVER_PORT = argv["ws-port"] || 988;
var YUU_REMOTE_AUTH = argv["auth"] || "yuu";

var controller = new Leap.Controller();

// Connect to Yuu-remote.js
var socket = sio("ws://localhost:" + WEBSOCKET_SERVER_PORT);

// Authorize
var authorized = false;
socket.emit("auth", YUU_REMOTE_AUTH);
socket.on("auth", function(success) {
    if (success) {
        console.log("Connected to Yuu-remote");
        authorized = true;
        
        // Get the screen size
        socket.emit("ss");
    }
});

var screensize = { width: 1, height: 1 };
socket.on("ss", function(ss) {
    screensize = ss;
});

// Notifications
controller.on("connect", function() {
    console.log("Connected to Leap Motion service");
});

controller.on("disconnect", function() {
    console.log("Disconnected from Leap Motion service");
});

controller.on("streamingStarted", function() {
    console.log("Connected to Leap Motion device");
});

controller.on("streamingStopped", function() {
    console.log("Disconnected from Leap Motion device");
});

// Leap frame controller
var lastFrameRateTime = 0;
var lastHandTime = 0;
controller.on("deviceFrame", function(frame) {
    var currentTime = Date.now();
    
    // Framerate
    if (currentTime - lastFrameRateTime > 1000) {
        console.log("FPS: " + frame.currentFrameRate);
        lastFrameRateTime = currentTime;
    }
    
    if (frame.hands.length > 0) {
        var hand = frame.hands[0];
        /* Leap Motion space (desktop, wire on left)
         *     -Z
         * -X =[ ] +X
         *     +Z
         */
        /* Arbitrary normalized bounds
         *     -0.45
         * -0.8     -0.8
         *      0.45
         *
         *     -0.375
         * -0.6     -0.6
         *      0.3
         */
        var height = hand.palmPosition[1];
        var normalX = hand.palmPosition[0] / height;
        var normalY = hand.palmPosition[2] / height;
        
        if (authorized) {
            socket.emit("msa", {
                x: (normalX + 0.6) / 1.2 * screensize.width,
                y: (normalY + 0.375) / 0.675 * screensize.height
            });
        }
        
        // Debug
        // console.log(normalX.toFixed(3) + " " + normalY.toFixed(3) + " " + height);
        // lastHandTime = currentTime;
    }
});

controller.connect();
