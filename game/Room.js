function Room(ownerSocket, name) {
    if (ownerSocket){
        this.ownerSocket = ownerSocket;
        this.id = ownerSocket.id.substring(0, 12);
    }
    this.name = name;
    this.withBots = 0;

    if (/^test bot|bot test/i.test(this.name)){
        this.withBots = 1;
    }

    this.sockets = {};
    this.bikes = {};

    this.game = null;
}

Room.prototype.startGame = function() {
    var gameModule = require('./Game');
    this.game = new gameModule.Game(this.sockets);
    this.game.start();
};

Room.prototype.getData = function() {
    var data = {};
    data.name = this.name;
    data.id = this.id;
    data.bikes = {};
    for (var b in this.bikes){
        var bike = this.bikes[b];
        data.bikes[bike.number] = bike.getData();
    }
    data.socketsNum = 0;
    for (var s in this.sockets) {
        if (typeof this.sockets[s].isBot === 'undefined') {
            data.socketsNum++;
        }
    }

    data.withBots = this.withBots;

    return data;
};

Room.prototype.join = function(socket) {
    this.sockets[socket.id] = socket;
    this.game.onJoin(socket);
};

Room.prototype.leave = function(socket) {
    for (var s in this.sockets){
        if (this.sockets[s].id === socket.id){
            this.game.onLeave(socket);
            delete this.sockets[s];
        }
    }
};

exports.Room = Room;
