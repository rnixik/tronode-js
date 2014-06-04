var gameWidth = 800;
var gameHeight = 600;
var myBike;
var bikes = [];
var gameContainer;
var myRoomId;
var rooms;

var botSocket = null;

var keyUp = 38;
var keyW = 87;
var keyRight = 39;
var keyD = 68;
var keyDown = 40;
var keyS = 83;
var keyLeft = 37;
var keyA = 65;

var moveStepSize = 10;
var serverMainLoopInterval = 70;

if (/heroku/.test(document.location.hostname)) {
  var wsAdress = location.origin.replace(/^http/, 'ws');
} else {
  // var port comes from server
  var wsAdress = 'http://' + document.location.hostname + ':' + port;
}

var socket = io.connect(wsAdress);
socket.on('state', function(data) {

   sendStateToBot(data);

   if (data.state === 'connected'){
      startGame();
   } else if (data.state === 'gameJoined'){
      gameContainer.innerHTML = '';
      for (var b in data.existedBikes){
        var bikeData = data.existedBikes[b];
        var bike = new Bike(bikeData.number);
        bike.allocate(gameContainer);
        bike.setData(bikeData);
        bikes.push(bike);
      }
   } else if (data.state === 'addBike'){
      myBike = new Bike(data.bike.number);
      myBike.allocate(gameContainer);
      myBike.setData(data.bike);
      bikes.push(myBike);

      var bikeExample = document.getElementById('bike-example');
      bikeExample.className = 'bike-' + myBike.number;
      document.getElementById('bike-example-name').innerHTML = myBike.name;
      bikeExample.style.display = 'block';

   } else if (data.state === 'update'){
      for (var lb in bikes){
        var localBike = bikes[lb];
        for (var b in data.bikes){
           var bike = data.bikes[b];
           if (bike.number === localBike.number){
              localBike.setData(bike);
              localBike.move(moveStepSize);
           }
        }
      }
   } else if (data.state === 'endGame'){
      document.getElementById('winner-name').innerHTML = data.winnerBike.name;
      document.getElementById('winner-time').innerHTML = Math.round(data.time / 1000);
      document.getElementById('endgame-container').style.display = 'block';

      bikes = [];
   } else if (data.state === 'newPlayer'){
      var bike = new Bike(data.bike.number);
      bike.allocate(gameContainer);
      bike.setData(data.bike);
      bikes.push(bike);
   } else if (data.state === 'update-rooms'){
      rooms = data.rooms;
      updateRoomsList();
   } else if (data.state === 'change-room') {
      document.getElementById('join-container').style.display = 'block';
      myRoomId = data.room.id;
      updateRoomsList();
   } else if (data.state === 'restart'){
      gameContainer.innerHTML = '';
      document.getElementById('endgame-container').style.display = 'none';
      var myBikeNumber = null;
      if (myBike) {
        myBikeNumber = myBike.number;
      }
      bikes = [];
      for (var b in data.bikes){
        var bikeData = data.bikes[b];
        var bike = new Bike(bikeData.number);
        bike.allocate(gameContainer);
        bike.setData(bikeData);
        bikes.push(bike);
        if (myBikeNumber && bike.number === myBikeNumber){
           myBike = bike;
        }
      }
   } else if (data.state === 'no-slot') {
      alert('There are not slots in this room. Create your own room.');
   } else if (data.state === 'ping-need-response') {
      socket.emit('ping', {'step': 'response'});
   } else if (data.state === 'ping') {
      //nothing to do with data.latency
   }

});

function initializeBotSocket() {
  botSocket = new BotSocket();
  botSocket.setGameParameters({
    'gameWidth': gameWidth,
    'gameHeight': gameHeight,
    'moveStepSize': moveStepSize,
    'mainLoopInterval': serverMainLoopInterval,
    'socket': socket
    });
  botSocket.start();
  window.botSocket = botSocket;
}

function sendStateToBot(data) {
   var botRoom = false;
   if (rooms && myRoomId) {
      for (var r in rooms) {
        if (rooms[r].id === myRoomId && rooms[r].withBots) {
           botRoom = true;
        }
      }
   }

   if (!botRoom) {
    return;
   }

   if (botSocket) {
     botSocket.emit('state', data);
   } else {
     //initializeBotSocket();
   }
}

function updateRoomsList() {
   var roomTpl = document.getElementById('room-tpl').innerHTML;
   var container = document.getElementById('rooms');
   var template = new EJS({text: roomTpl});
   container.innerHTML = template.render({'rooms': rooms, 'myRoomId': myRoomId});
}

function startGame() {
   gameContainer = document.getElementById('game-container');
   var body = document.getElementsByTagName('body')[0];
   bindEvents(body);

   document.getElementById('join-btn').onclick = join;
   document.getElementById('join-room-btn').onclick = joinRoom;
   document.getElementById('create-room-btn').onclick = createRoom;
   document.getElementById('create-bot-test-room-btn').onclick = createTestBotRoom;
   document.getElementById('add-bot-btn').onclick = addServerBot;
   document.getElementById('load-url-btn').onclick = loadAiScriptUrl;
   document.getElementById('bot-room-control-toggler').onclick = toggleBotControl;

   checkMobile();
   body.className = '';
}

function joinRoom() {
   var checked = document.querySelector('.room-option:checked');
   if (checked) {
      var roomId = checked.value;
      socket.emit('control', {'button': 'join-room', 'roomId': roomId});
   }
}

function createRoom() {
   var roomName = document.getElementById('join-room-name').value;
   if (roomName) {
      socket.emit('control', {'button': 'create-room', 'name': roomName});
   }
}

function createTestBotRoom() {
   socket.emit('control', {'button': 'create-room', 'name': 'Test bot ' + Math.floor(Math.random() * 1000)});
}

function addServerBot() {
   socket.emit('control', {'button': 'add-bot'});
}

function loadAiScriptUrl() {
  var urlInput = document.getElementById('custom-ai-url');
  if (urlInput) {
    BotSocket.loadScript(urlInput.value, function() {
      socket.emit('control', {'button': 'leave'});
      initializeBotSocket();
    });
  }
}

function toggleBotControl() {
  var toggle = document.getElementById('custom-bot-container-toggle');
  if (!toggle) {
    return;
  }
  if (toggle.style.display === 'none') {
    toggle.style.display = 'block';
  } else {
    toggle.style.display = 'none';
  }
}

function join() {
   var joinName = document.getElementById('join-name').value;
   if (joinName) {
      socket.emit('control', {'button': 'joinBattle', 'name': joinName});
      document.getElementById('join-container').style.display = 'none';
   }
}

function bindEvents(container) {
   container.onkeydown = function(e) {
      if (!myBike){
        return;
      }
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

function checkMobile() {
  if( !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ) {
    return;
  }
  var mobileControllerContainer = document.getElementById('mobile-controller-container');
  var wrapper = document.getElementById('game-container').parentNode;
  wrapper.appendChild(mobileControllerContainer);
  mobileControllerContainer.style.width = (wrapper.offsetWidth - 2) + 'px';

  document.getElementById('mobile-left-btn').onclick = function() {
    if (myBike) {
      myBike.turnLeft();
      socket.emit('control', {'button': 'left'});
    }
  };
  document.getElementById('mobile-right-btn').onclick = function() {
    if (myBike) {
      myBike.turnRight();
      socket.emit('control', {'button': 'right'});
    }
  };

  mobileControllerContainer.style.display = 'block';
}
