function GameServer(sockets){
  this.sockets = sockets;

  this.rooms = {};
  this.roomModule = require('./Room');
  this.botModule = require('./../public/javascripts/BotSocket');
  var utilsModule = require('./utils');
  this.utils = utilsModule.utils;
}

GameServer.prototype.start = function() {
  var defaultRoom = this.addDefaultRoom();
  this.addBotRoom();
  var _this = this;

  this.sockets.on('connection', function (socket) {

    socket.emit('state', {'state': 'connected'});

    socket.on('control', function(data) {
      try {
        if (data.button === 'create-room') {
          var room = _this.addRoom(socket, data.name);
          _this.moveSocketToRoom(socket, room);
          _this.updateRoomsClients();
        } else if (data.button === 'join-room'){
          var room = _this.rooms[data.roomId];
          if (room){
            _this.moveSocketToRoom(socket, room);
            _this.updateRoomsClients();
          }
        } else if (data.button === 'add-bot'){
          var room = _this.getRoomWithSocketId(socket.id);
          if (room && room.withBots && room.id !== 'bot'){
            _this.addBots(room, 1);
          }
        } else {
          var room = _this.getRoomWithSocketId(socket.id);
          if (room){
            room.game.onControl(socket, data);
          }
        }
      } catch (e) {
        console.log(e);
      }
    });

    socket.on('disconnect', function(){
      var room = _this.getRoomWithSocketId(socket.id);
      if (room){
        room.leave(socket);
      }
    });

    var pingStartTime;
    socket.on('ping', function(data){
      if (data.step === 'request') {
        pingStartTime = new Date().getTime();
        socket.emit('state', {'state': 'ping-need-response'});
      } else if (data.step === 'response') {
        var latency = new Date().getTime() - pingStartTime;
        socket.emit('state', {'state': 'ping', 'latency': latency});
      }
    });

    _this.moveSocketToRoom(socket, defaultRoom);
    _this.updateRoomsClients();
  });

  setInterval(function(){
    _this.cleanRooms();
  }, 10000);
};

GameServer.prototype.cleanRooms = function() {
  var r, room;
  for (r in this.rooms){
    if (r === 'default' || r === 'bot') {
      continue;
    }
    if (this.rooms[r].getData().socketsNum === 0) {
      delete this.rooms[r];
      this.updateRoomsClients();
    }
  }
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

GameServer.prototype.addBotRoom = function() {
  var room = new this.roomModule.Room(null, 'With bots');
  room.id = 'bot';
  room.startGame();
  room.withBots = 1;
  this.rooms[room.id] = room;

  this.addBots(room, 3);

  return room;
};

GameServer.prototype.addBots = function(room, quantity) {
  for (var i=0; i<quantity; i++) {
    var botSocket = new this.botModule.BotSocket();
    botSocket.setGameObject(room.game);
    room.sockets[botSocket.id] = botSocket;
    botSocket.start();
  }
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
