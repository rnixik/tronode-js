function GameServer(sockets){
    this.sockets = sockets;

    this.rooms = {};
    this.roomModule = require('./Room');
    var utilsModule = require('./utils');
    this.utils = utilsModule.utils;
}

GameServer.prototype.start = function() {
    var defaultRoom = this.addDefaultRoom();
    var _this = this;

    this.sockets.on('connection', function (socket) {

        socket.emit('state', {'state': 'connected'});

        socket.on('control', function(data){
            if (data.button === 'create-room') {
                var room = _this.addRoom(socket, data.name);
                _this.moveSocketToRoom(socket, room);
            } else if (data.button === 'join-room'){
                var room = _this.rooms[data.roomId];
                if (room){
                    _this.moveSocketToRoom(socket, room);
                }
            } else {
                var room = _this.getRoomWithSocketId(socket.id);
                if (room){
                    room.game.onControl(socket, data);
                }
            }
        });

        socket.on('disconnect', function(){
            var room = _this.getRoomWithSocketId(socket.id);
            if (room){
                room.leave(socket);
            }
        });

        _this.moveSocketToRoom(socket, defaultRoom);
        _this.updateRoomsClients();
    });
};


GameServer.prototype.moveSocketToRoom = function(socket, room) {
    var r, iroom, s;
    for (r in this.rooms){
        iroom = this.rooms[r];
        if (iroom.id === room.id){
            iroom.join(socket);
            socket.emit('state', {
                'state': 'change-room',
                'room': iroom.getData()
            });
        } else {
            iroom.leave(socket);
        }
    }
};

GameServer.prototype.getRoomWithSocketId = function(socketId){
    var r, iroom, s;
    for (r in this.rooms){
        iroom = this.rooms[r];
        for (s in iroom.sockets){
            if (iroom.sockets[s].id === socketId){
                return iroom;
            }
        }
    }
};

GameServer.prototype.addRoom = function(ownerSocket, name) {
    var room = new this.roomModule.Room(ownerSocket, this.utils.removeTags(name));
    room.startGame();
    this.rooms[room.id] = room;
    this.updateRoomsClients();
    return room;
};

GameServer.prototype.addDefaultRoom = function() {
    var room = new this.roomModule.Room(null, 'default');
    room.id = 'default';
    room.startGame();
    this.rooms[room.id] = room;
    return room;
};

GameServer.prototype.updateRoomsClients = function() {
    var roomsData = [];
    for (var r in this.rooms){
        roomsData.push(this.rooms[r].getData());
    }
    this.sockets.emit('state', {
        'state': 'update-rooms',
        'rooms': roomsData
    });
};


exports.GameServer = GameServer;
