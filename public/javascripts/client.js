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


var myBike;
var moveInterval = 50;

function startGame() {
    var body = document.getElementsByTagName('body')[0];
    var gameContainer = document.createElement("div");
    gameContainer.className = "game";
    body.appendChild(gameContainer);
    bindEvents(body);

    var bike1 = new Bike(1, [100, 100]);
    bike1.allocate(gameContainer);
    myBike = bike1;

    window.setInterval(function() {
        bike1.move(10);
    }, moveInterval);
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