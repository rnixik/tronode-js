var gameWidth = 800;
var gameHeight = 600;
var myBike;
var mainLoopInterval = 100;
var bikes = [];
var gameContainer;

var keyUp = 38;
var keyW = 87;
var keyRight = 39;
var keyD = 68;
var keyDown = 40;
var keyS = 83;
var keyLeft = 37;
var keyA = 65;


var socket = io.connect('http://localhost');
socket.on('state', function(data) {
    console.log(data);
    if (data.state === 'addBike'){
        startGame();
        myBike = new Bike(data.bike.number);
        myBike.setData(data.bike);
        myBike.allocate(gameContainer);
        bikes.push(myBike);

        for (var b in data.existedBikes){
            var bikeData = data.existedBikes[b];
            var bike = new Bike(bikeData.number);
            bike.setData(bikeData);
            bike.allocate(gameContainer);
            bikes.push(bike);
        }
    } else if (data.state === 'update'){
        for (var lb in bikes){
            var localBike = bikes[lb];
            localBike.move(10);
            for (var b in data.bikes){
                var bike = data.bikes[b];
                if (bike.number === localBike.number){
                    localBike.setData(bike);
                }
            }
        }
    }

});

socket.on('newPlayer', function(data){
    var bike = new Bike(data.bike.number);
    bike.setData(data.bike);
    bike.allocate(gameContainer);
    bikes.push(bike);
});


function startGame() {
    var body = document.getElementsByTagName('body')[0];
    gameContainer = document.createElement("div");
    gameContainer.className = "game";
    gameContainer.style.width = gameWidth + "px";
    gameContainer.style.height = gameHeight + "px";
    body.appendChild(gameContainer);
    bindEvents(body);

    //window.setInterval(mainLoop, mainLoopInterval);
}

function mainLoop() {
    for (var b in bikes) {
        var bike = bikes[b];
        bike.move(10);
    }
    detectCollisions();
}

function bindEvents(container) {
    container.onkeypress = function(e) {
        e = e || window.event;
        switch (e.keyCode) {
            case keyUp:
            case keyW:
                break;
            case keyRight:
            case keyD:
                myBike.turnRight();
                socket.emit('control', {'button': 'right'});
                break;
            case keyDown:
            case keyS:
                break;
            case keyLeft:
            case keyA:
                myBike.turnLeft();
                socket.emit('control', {'button': 'left'});
                break;

        }
    };
}

function detectCollisions() {
    /* line = [x1, y1, x2, y2] */
    var lines = [];
    lines.push([0, 0, gameWidth, 0]);
    lines.push([gameWidth, 0, gameWidth, gameHeight]);
    lines.push([gameWidth, gameHeight, 0, gameHeight]);
    lines.push([0, gameHeight, 0, 0]);

    /* add lines from bikes' trails */
    for (var b in bikes) {
        var bike = bikes[b];
        if (bike.turnPoints.length > 1) {
            for (var i = 1; i < bike.turnPoints.length; i++) {
                lines.push([
                    bike.turnPoints[i - 1][0],
                    bike.turnPoints[i - 1][1],
                    bike.turnPoints[i][0],
                    bike.turnPoints[i][1]
                ]);
            }
        }
        var lastPoint = bike.turnPoints[bike.turnPoints.length - 1];
        lines.push([
            lastPoint[0],
            lastPoint[1],
            bike.x,
            bike.y,
            bike.number
        ]);

    }

    for (var b in bikes) {
        var bike = bikes[b];
        for (var li in lines) {
            var line = lines[li];
            var x1 = line[0], y1 = line[1], x2 = line[2], y2 = line[3];
            var x = bike.x, y = bike.y;
            var eps = 0.01;

            if (typeof line[4] === "number" && line[4] === bike.number) {
                /* last line of current bike */
                continue;
            }

            if ((Math.abs(y1 - y) < eps && ((x > x1 - eps && x < x2 + eps) || (x > x2 - eps && x < x1 + eps))) ||
                    (Math.abs(x1 - x) < eps && ((y > y1 - eps && y < y2 + eps) || (y > y2 - eps && y < y1 + eps)))) {
                bike.collide();
            }
        }
    }
}
