var socket = io.connect('http://localhost');
socket.on('news', function(data) {
    console.log(data);
    socket.emit('my other event', {my: 'data'});
    startGame();
});


var keyUp = 38;
var keyW = 87;
var keyRight = 39;
var keyD = 68;
var keyDown = 40;
var keyS = 83;
var keyLeft = 37;
var keyA = 65;


var gameWidth = 800;
var gameHeight = 600;
var myBike;
var mainLoopInterval = 100;
var bikes = [];

function startGame() {
    var body = document.getElementsByTagName('body')[0];
    var gameContainer = document.createElement("div");
    gameContainer.className = "game";
    gameContainer.style.width = gameWidth + "px";
    gameContainer.style.height = gameHeight + "px";
    body.appendChild(gameContainer);
    bindEvents(body);

    var bike1 = new Bike(1, [100, 100]);
    bike1.allocate(gameContainer);
    bikes.push(bike1);

    var bike2 = new Bike(2, [700, 300]);
    bike2.allocate(gameContainer);
    bike2.direction = "l";
    bikes.push(bike2);

    var bike3 = new Bike(3, [50, 500]);
    bike3.allocate(gameContainer);
    bike3.direction = "u";
    bikes.push(bike3);

    myBike = bike1;

    window.setInterval(mainLoop, mainLoopInterval);
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
                break;
            case keyDown:
            case keyS:
                break;
            case keyLeft:
            case keyA:
                myBike.turnLeft();
                break;

        }
    }
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

function Bike(number, pos) {
    this.number = number;
    this.x = pos[0] || 0;
    this.y = pos[1] || 0;
    this.direction = "r";
    this.turnPoints = [];
    this.currentHtml = null;
    this.defaultWidth = 5;
    this.defaultHeight = 5;
    this.currentHtmlWidth = this.defaultWidth;
    this.currentHtmlHeight = this.defaultHeight;
    this.container = null;

    this.turnPoints.push(pos);
}

Bike.prototype.allocate = function(parent) {
    this.container = document.createElement("div");
    this.container.className = "bike bike-" + this.number;
    parent.appendChild(this.container);
}

Bike.prototype.createHtml = function() {
    this.currentHtml = document.createElement("div");
    this.currentHtml.className = "bike-trail";
    this.currentHtml.style.left = this.x + "px";
    this.currentHtml.style.top = this.y + "px";
    this.currentHtml.style.width = this.currentHtmlWidth + "px";
    this.currentHtml.style.height = this.currentHtmlHeight + "px";
    this.container.appendChild(this.currentHtml);
}

Bike.prototype.move = function(stepSize) {
    if (!this.currentHtml) {
        this.createHtml();
    }
    switch (this.direction) {
        case "u":
            this.y -= stepSize;
            this.currentHtmlHeight += stepSize;
            this.currentHtml.style.height = this.currentHtmlHeight + "px";
            this.currentHtml.style.top = this.y + "px";
            break;
        case "r":
            this.x += stepSize;
            this.currentHtmlWidth += stepSize;
            this.currentHtml.style.width = this.currentHtmlWidth + "px";
            break;
        case "d":
            this.y += stepSize;
            this.currentHtmlHeight += stepSize;
            this.currentHtml.style.height = this.currentHtmlHeight + "px";
            break;
        case "l":
            this.x -= stepSize;
            this.currentHtmlWidth += stepSize;
            this.currentHtml.style.width = this.currentHtmlWidth + "px";
            this.currentHtml.style.left = this.x + "px";
            break;
    }
}

Bike.prototype.turnRight = function() {
    this.currentHtml = null;
    this.currentHtmlWidth = this.defaultWidth;
    this.currentHtmlHeight = this.defaultHeight;
    this.turnPoints.push([this.x, this.y]);
    switch (this.direction) {
        case "r":
            this.direction = "d";
            break;
        case "d":
            this.direction = "l";
            break;
        case "l":
            this.direction = "u";
            break;
        case "u":
            this.direction = "r";
            break;
    }
}

Bike.prototype.turnLeft = function() {
    this.currentHtml = null;
    this.currentHtmlWidth = this.defaultWidth;
    this.currentHtmlHeight = this.defaultHeight;
    this.turnPoints.push([this.x, this.y]);
    switch (this.direction) {
        case "r":
            this.direction = "u";
            break;
        case "d":
            this.direction = "r";
            break;
        case "l":
            this.direction = "d";
            break;
        case "u":
            this.direction = "l";
            break;
    }
}

Bike.prototype.collide = function() {
    console.log("colliden");
    this.direction = null;
}
