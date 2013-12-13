function GameServer(sockets){
    this.sockets = sockets;
    _this = this;

    this.gameWidth = 800;
    this.gameHeight = 600;

    this.gameStarted = false;

    this.initialSlots = [
    {"id": 1, "pos": [50, 50], "direction": "r"},
    {"id": 2, "pos": [750, 100], "direction": "d"},
    {"id": 3, "pos": [700, 550], "direction": "l"},
    {"id": 4, "pos": [100, 550], "direction": "u"}
    ];
    this.slots = [];
}

GameServer.prototype.getNextFreeSlot = function(){
    for (var i in this.slots){
        if (!this.slots[i].socketId){
            return this.slots[i];
        }
    }
};

GameServer.prototype.start = function(){

    this.sockets.on('connection', function (socket) {

        socket.on('control', function(data){
            if (data.button === 'join') {
                var slot = _this.getNextFreeSlot();
                if (slot) {
                    _this.initializePlayer(slot, socket, data.name);
                }
                _this.gameStarted = true;
            }
        });

        socket.emit('state', {
            'state': 'connected',
            'existedBikes': _this.getBikes().map(function(bike){return bike.getData();})
        });


    });

    this.resetSlots();

    setInterval(function(){
        _this.mainLoop();
    }, 100);
};

GameServer.prototype.initializePlayer = function(slot, socket, name) {
    var bikeModule = require('./../public/javascripts/bike.js');
            slot.socketId = socket.id;
            var bike = new bikeModule.Bike(slot.id, slot.pos);
            bike.x = slot.pos[0];
            bike.y = slot.pos[1];
            bike.direction = slot.direction;
            bike.setOnCollideCallback(_this.onBikeCollided);


            socket.emit('state', {
                'state': 'addBike',
                'bike': bike.getData()
            });

            slot.bike = bike;

            socket.broadcast.emit('newPlayer', {
                'bike': bike.getData()
            });

            socket.on('disconnect', function(){
                slot.socketId = null;
                slot.bike = null;
            });

            socket.on('control', function(data){
                var bike = _this.getBikeBySocketId(socket.id);
                if (bike && data.button === 'right'){
                    bike.turnRight();
                    _this.updateClients();
                } else if (bike && data.button === 'left') {
                    bike.turnLeft();
                    _this.updateClients();
                }
            });
};

GameServer.prototype.resetSlots = function(){
    this.slots = [];
    for (var is in this.initialSlots){
        var islot = this.initialSlots[is];
        var slotData = islot;
        slotData['scoketId'] = null;
        slotData['bike'] = null;
        this.slots.push(slotData);
    }
};

GameServer.prototype.onBikeCollided = function(bike){
    _this.gameStarted = false;
    _this.resetSlots();
};

GameServer.prototype.getBikeBySocketId = function(socketId) {
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.socketId === socketId) {
            return slot.bike;
        }
    }
};

GameServer.prototype.getBikes = function() {
    var bikes = [];
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.bike) {
            bikes.push(slot.bike);
        }
    }
    return bikes;
};

GameServer.prototype.mainLoop = function() {
    if (!this.gameStarted){
        return;
    }
    var bikes = this.getBikes();
    for (var b in bikes) {
        var bike = bikes[b];
        bike.move(10);
    }
    this.detectCollisions();
    this.updateClients();
};

GameServer.prototype.updateClients = function(){
    var bikesData = [];
    var bikes = this.getBikes();
    for (var b in bikes){
        var bike = bikes[b];
        bikesData.push(bike.getData());
    }
    this.sockets.emit('state', {
        'state': 'update',
        'bikes': bikesData
    });
};

GameServer.prototype.detectCollisions = function() {
    /* line = [x1, y1, x2, y2] */
    var lines = [];
    lines.push([0, 0, this.gameWidth, 0]);
    lines.push([this.gameWidth, 0, this.gameWidth, this.gameHeight]);
    lines.push([this.gameWidth, this.gameHeight, 0, this.gameHeight]);
    lines.push([0, this.gameHeight, 0, 0]);

    var bike;
    var bikes = this.getBikes();

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
        var lastPoint = bike.turnPoints[bike.turnPoints.length - 1];
        lines.push([
            lastPoint[0],
            lastPoint[1],
            bike.x,
            bike.y,
            bike.number
        ]);

    }

    for (var b2 in bikes) {
        bike = bikes[b2];
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
};

exports.GameServer = GameServer;
