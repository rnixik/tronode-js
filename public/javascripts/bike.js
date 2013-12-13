function Bike(number) {
    this.number = number;
    this.x = 0;
    this.y = 0;
    this.direction = "r";
    this.turnPoints = [];
    this.currentHtml = null;
    this.defaultWidth = 5;
    this.defaultHeight = 5;
    this.currentHtmlWidth = this.defaultWidth;
    this.currentHtmlHeight = this.defaultHeight;
    this.container = null;
    this.headHtml = null;

    this.onCollideCallback = null;
}

Bike.prototype.allocate = function(parent) {
    this.container = document.createElement("div");
    this.container.className = "bike bike-" + this.number;
    parent.appendChild(this.container);

    this.headHtml = document.createElement("div");
    this.headHtml.className = "bike-head";
    this.container.appendChild(this.headHtml);

    this.headHtml.style.left = (this.x - 1) + "px";
    this.headHtml.style.top = (this.y - 1) + "px";
};

Bike.prototype.createHtml = function() {
    this.currentHtml = document.createElement("div");
    this.currentHtml.className = "bike-trail";
    this.currentHtml.style.left = this.x + "px";
    this.currentHtml.style.top = this.y + "px";
    this.currentHtml.style.width = this.currentHtmlWidth + "px";
    this.currentHtml.style.height = this.currentHtmlHeight + "px";
    this.container.appendChild(this.currentHtml);
};

Bike.prototype.move = function(stepSize) {
    if (!this.currentHtml && (typeof document === 'object')) {
        this.createHtml();
    }

    if (this.turnPoints.length === 0){
        this.turnPoints.push([this.x, this.y]);
    }
    switch (this.direction) {
        case "u":
            this.y -= stepSize;
            this.currentHtmlHeight += stepSize;
            break;
        case "r":
            this.x += stepSize;
            this.currentHtmlWidth += stepSize;
            break;
        case "d":
            this.y += stepSize;
            this.currentHtmlHeight -= stepSize;
            break;
        case "l":
            this.x -= stepSize;
            this.currentHtmlWidth -= stepSize;
            break;
    }

    if (this.currentHtml){
        this.updateHtml();
    }
};

Bike.prototype.updateHtml = function() {
    var w = this.currentHtmlWidth;
    var h = this.currentHtmlHeight;
    if (w > 0){
        this.currentHtml.style.width = w + "px";
        this.currentHtml.style.left = (this.x - w + 5) + "px";
    } else {
        this.currentHtml.style.width = Math.abs(w) + 5 + "px";
        this.currentHtml.style.left = this.x + "px";
    }
    if (h > 0){
        this.currentHtml.style.height = h + "px";
        this.currentHtml.style.top = (this.y) + "px";
    } else {
        this.currentHtml.style.height = (Math.abs(h) + this.defaultHeight) + "px";
        this.currentHtml.style.top = (this.y + h) + "px";
    }



    this.headHtml.style.left = (this.x - 1) + "px";
    this.headHtml.style.top = (this.y - 1) + "px";

};

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
};

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
};

Bike.prototype.collide = function() {
    this.direction = null;
    if (this.onCollideCallback){
        this.onCollideCallback();
    }
};

Bike.prototype.setData = function(data) {
    this.number = data.number;
    this.x = data.x;
    this.y = data.y;
    this.direction = data.direction;
    this.turnPoints = data.turnPoints;
    this.currentHtmlWidth = data.currentHtmlWidth;
    this.currentHtmlHeight = data.currentHtmlHeight;

    if (!this.currentHtml && (typeof document === 'object')) {
        this.createHtml();
    }
    if (this.currentHtml){
        this.updateHtml();
    }
};

Bike.prototype.getData = function() {
    var data = {};
    data.number = this.number;
    data.x = this.x;
    data.y = this.y;
    data.direction = this.direction;
    data.turnPoints = this.turnPoints;
    data.currentHtmlWidth = this.currentHtmlWidth;
    data.currentHtmlHeight = this.currentHtmlHeight;
    return data;
};

Bike.prototype.setOnCollideCallback = function(callback){
    this.onCollideCallback = callback;
};

if (typeof exports === 'object'){
    exports.Bike = Bike;
}
