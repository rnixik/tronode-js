function Game(sockets){
    this.sockets = sockets;

    this.mainLoopInterval = 50;
    this.moveStepSize = 10;

    this.gameWidth = 800;
    this.gameHeight = 600;


    this.restartTimeoutMs = 5000;
    this.restartTimeoutId = null;

    this.gameStarted = false;
    this.gameTime = 0;

    this.initialSlots = [
    {"id": 1, "pos": [50, 50], "direction": "r"},
    {"id": 2, "pos": [750, 100], "direction": "d"},
    {"id": 3, "pos": [700, 550], "direction": "l"},
    {"id": 4, "pos": [100, 550], "direction": "u"},
    {"id": 5, "pos": [350, 450], "direction": "u"},
    {"id": 6, "pos": [450, 450], "direction": "u"}
    ];
    this.slots = {};

    var utilsModule = require('./utils');
    this.utils = utilsModule.utils;
}

Game.prototype.getNextFreeSlot = function() {
    for (var i in this.slots){
        if (!this.slots[i].socketId){
            return this.slots[i];
        }
    }
};

Game.prototype.emit = function(event, data) {
    var s, socket;
    for (s in this.sockets){
        socket = this.sockets[s];
        socket.emit(event, data);
    }
};

Game.prototype.broadcast = function(socket, event, data) {
    for (var s in this.sockets){
        if (this.sockets[s].id !== socket.id){
            var isocket = this.sockets[s];
            isocket.emit(event, data);
        }
    }
};

Game.prototype.onControl = function(socket, data) {
    var bike = this.getBikeBySocketId(socket.id);
            if (!bike && data.button === 'joinBattle') {
                var slot = this.getNextFreeSlot();
                if (slot) {
                    this.initializePlayer(slot, socket, data.name);
                } else {
                    socket.emit('state', {'state': 'no-slot'});
                }
            } else if (bike) {
                if (data.button === 'right') {
                    bike.turnRight();
                    this.updateClients();
                } else if (data.button === 'left') {
                    bike.turnLeft();
                    this.updateClients();
                } else if (data.button === 'start') {
                    this.gameStarted = true;
                    this.updateClients();
                }
            }
};

Game.prototype.onLeave = function(socket) {
    var slot = this.getSlotBySocketId(socket.id);
    if (slot){
        slot.socketId = null;
        slot.bike = null;
    }
};

Game.prototype.onJoin = function(socket) {
    socket.emit('state', {
        'state': 'gameJoined',
        'existedBikes': this.getBikes().map(function(bike){return bike.getData();})
    });
};

Game.prototype.start = function() {
    var _this = this;
    this.resetSlots();

    setInterval(function(){
        _this.mainLoop();
    }, this.mainLoopInterval);
};


Game.prototype.initializePlayer = function(slot, socket, name) {
    var _this = this;
    var bikeModule = require('./../public/javascripts/bike.js');
            slot.socketId = socket.id;
            var bike = new bikeModule.Bike(slot.id, slot.pos);
            bike.x = slot.pos[0];
            bike.y = slot.pos[1];
            bike.direction = slot.direction;
            bike.name = this.utils.removeTags(name);
            bike.setOnCollideCallback(function(){
                _this.onBikeCollided(bike);
            });


            socket.emit('state', {
                'state': 'addBike',
                'bike': bike.getData()
            });

            slot.bike = bike;

            this.broadcast(socket, 'state', {
                'state': 'newPlayer',
                'bike': bike.getData()
            });


};

Game.prototype.restart = function() {
    var num = 0;
    for (var s in this.slots){
        var slot = this.slots[s];
        for (var is in this.initialSlots){
            var islot = this.initialSlots[is];
            if (slot.bike && islot.id === slot.id){
                slot.bike.resetPosition(islot.pos[0], islot.pos[1], islot.direction);
                num++;
            }
        }
    }
    if (num){
        this.emit('state', {
            'state': 'restart',
            'bikes': this.getBikes().map(function(bike){return bike.getData();})
        });

        this.gameStarted = true;
    }
};

Game.prototype.resetSlots = function() {
    this.slots = {};
    for (var is in this.initialSlots){
        var islot = this.initialSlots[is];
        var slotData = {};
        slotData['id'] = islot.id;
        slotData['pos'] = islot.pos;
        slotData['direction'] = islot.direction;
        slotData['socketId'] = null;
        slotData['bike'] = null;
        this.slots[islot.id] = slotData;
    }
};

Game.prototype.endGame = function(winnerBike) {
    var _this = this;
    if (this.gameStarted){
        this.gameStarted = false;
        this.emit('state', {
            'state': 'endGame',
            'winnerBike': winnerBike.getData(),
            'time': this.gameTime
        });
        this.gameTime = 0;
    }
};

Game.prototype.onBikeCollided = function(bike) {
    var last = true;
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.bike && !slot.bike.collided) {
            last = false;
        }
    }
    if (last){
        this.endGame(bike);
    }

};

Game.prototype.getBikeBySocketId = function(socketId) {
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.socketId === socketId) {
            return slot.bike;
        }
    }
};

Game.prototype.getSlotBySocketId = function(socketId) {
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.socketId === socketId) {
            return slot;
        }
    }
};

Game.prototype.getBikes = function() {
    var bikes = [];
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.bike) {
            bikes.push(slot.bike);
        }
    }
    return bikes;
};

Game.prototype.mainLoop = function() {
    if (this.gameStarted){

        var bikes = this.getBikes();
        for (var b in bikes) {
         var bike = bikes[b];
            bike.move(this.moveStepSize);
        }
        this.detectCollisions();
        this.gameTime += this.mainLoopInterval;
        this.updateClients();

    } else if (!this.restartTimeoutId){
        var _this = this;
        this.restartTimeoutId = setTimeout(function(){
            _this.restart();
            _this.restartTimeoutId = null;
        }, this.restartTimeoutMs);
    }
};

Game.prototype.updateClients = function() {
    var bikesData = [];
    var bikes = this.getBikes();
    for (var b in bikes){
        var bike = bikes[b];
        bikesData.push(bike.getData());
    }
    this.emit('state', {
        'state': 'update',
        'bikes': bikesData
    });
};


Game.prototype.detectCollisions = function() {
    /* line = [x1, y1, x2, y2] */
    var lines = [];
    var bike;
    var bikes = this.getBikes();
    var eps = 0.01;

    /* add lines from bikes' trails */
    for (var b in bikes) {
        bike = bikes[b];
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
        if (bike.turnPoints.length > 0){
            var lastPoint = bike.turnPoints[bike.turnPoints.length - 1];
            lines.push([
                lastPoint[0],
                lastPoint[1],
                bike.x,
                bike.y,
                bike.number
            ]);
        }


    }

    for (var b2 in bikes) {
        bike = bikes[b2];
        var x = bike.x, y = bike.y;

        if (x < eps || x + this.moveStepSize > this.gameWidth || y < eps || y + this.moveStepSize > this.gameHeight) {
            bike.collide();
            continue;
        }

        for (var li in lines) {
            var line = lines[li];
            var x1 = line[0], y1 = line[1], x2 = line[2], y2 = line[3];

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
};

exports.Game = Game;
