function GameServer(sockets){
    this.sockets = sockets;
    _this = this;

    this.mainLoopInterval = 100;

    this.gameWidth = 800;
    this.gameHeight = 600;

    this.gameStarted = false;
    this.gameTime = 0;

    this.initialSlots = [
    {"id": 1, "pos": [50, 50], "direction": "r"},
    {"id": 2, "pos": [750, 100], "direction": "d"},
    {"id": 3, "pos": [700, 550], "direction": "l"},
    {"id": 4, "pos": [100, 550], "direction": "u"}
    ];
    this.slots = [];
    this.rooms = {};

    this.roomModule = require('./Room');
}

GameServer.prototype.getNextFreeSlot = function() {
    for (var i in this.slots){
        if (!this.slots[i].socketId){
            return this.slots[i];
        }
    }
};

GameServer.prototype.start = function() {

    this.sockets.on('connection', function (socket) {

        socket.on('control', function(data){
            var bike = _this.getBikeBySocketId(socket.id);
            if (!bike && data.button === 'join') {
                var slot = _this.getNextFreeSlot();
                if (slot) {
                    _this.initializePlayer(slot, socket, data.name);
                }
            } else if (bike) {
                if (data.button === 'right') {
                    bike.turnRight();
                    _this.updateClients();
                } else if (data.button === 'left') {
                    bike.turnLeft();
                    _this.updateClients();
                } else if (data.button === 'start') {
                    _this.gameStarted = true;
                    _this.updateClients();
                }
            }

            if (data.button === 'create-room') {
                _this.addRoom(socket, data.name);
            }
        });

        socket.emit('state', {
            'state': 'connected',
            'existedBikes': _this.getBikes().map(function(bike){return bike.getData();})
        });

        socket.on('disconnect', function(){
            var slot = _this.getSlotBySocketId(socket.id);
            if (slot){
                slot.socketId = null;
                slot.bike = null;
            }
        });

        _this.updateRoomsClients();

        if (Object.keys(_this.rooms).length === 0){
            _this.addRoom(socket, 'default');
        }
    });

    this.resetSlots();

    setInterval(function(){
        _this.mainLoop();
    }, _this.mainLoopInterval);
};

GameServer.prototype.addRoom = function(ownerSocket, name) {
    var room = new _this.roomModule.Room(ownerSocket, _this.removeTags(name));
    this.rooms[room.id] = room;
    this.updateRoomsClients();
};

GameServer.prototype.initializePlayer = function(slot, socket, name) {
    var bikeModule = require('./../public/javascripts/bike.js');
            slot.socketId = socket.id;
            var bike = new bikeModule.Bike(slot.id, slot.pos);
            bike.x = slot.pos[0];
            bike.y = slot.pos[1];
            bike.direction = slot.direction;
            bike.name = _this.removeTags(name);
            bike.setOnCollideCallback(_this.onBikeCollided);


            socket.emit('state', {
                'state': 'addBike',
                'bike': bike.getData()
            });

            slot.bike = bike;

            socket.broadcast.emit('state', {
                'state': 'newPlayer',
                'bike': bike.getData()
            });


};

GameServer.prototype.resetSlots = function() {
    this.slots = [];
    for (var is in this.initialSlots){
        var islot = this.initialSlots[is];
        var slotData = {};
        slotData['id'] = islot.id;
        slotData['pos'] = islot.pos;
        slotData['direction'] = islot.direction;
        slotData['socketId'] = null;
        slotData['bike'] = null;
        this.slots.push(slotData);
    }
};

GameServer.prototype.endGame = function(winnerBike) {
    _this.gameStarted = false;
    _this.sockets.emit('state', {
        'state': 'endGame',
        'winnerBike': winnerBike.getData(),
        'time': _this.gameTime
    });
    _this.gameTime = 0;
    _this.resetSlots();
};

GameServer.prototype.onBikeCollided = function(bike) {
    var last = true;
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.bike && !slot.bike.collided) {
            last = false;
        }
    }
    if (last){
        _this.endGame(bike);
    }

};

GameServer.prototype.getBikeBySocketId = function(socketId) {
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.socketId === socketId) {
            return slot.bike;
        }
    }
};

GameServer.prototype.getSlotBySocketId = function(socketId) {
    for (var s in this.slots) {
        var slot = this.slots[s];
        if (slot.socketId === socketId) {
            return slot;
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
    _this.gameTime += _this.mainLoopInterval;
    this.updateClients();
};

GameServer.prototype.updateClients = function() {
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

GameServer.prototype.updateRoomsClients = function() {
    var roomsData = [];
    for (var r in _this.rooms){
        roomsData.push(_this.rooms[r].getData());
    }
    this.sockets.emit('state', {
        'state': 'update-rooms',
        'rooms': roomsData
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

var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';

var tagOrComment = new RegExp(
    '<(?:'
    // Comment body.
    + '!--(?:(?:-*[^->])*--+|-?)'
    // Special "raw text" elements whose content should be elided.
    + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*'
    + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
    // Regular name
    + '|/?[a-z]'
    + tagBody
    + ')>',
    'gi');

GameServer.prototype.removeTags = function(html) {
  var oldHtml;
  do {
    oldHtml = html;
    html = html.replace(tagOrComment, '');
  } while (html !== oldHtml);
  return html.replace(/</g, '&lt;');
};

exports.GameServer = GameServer;
