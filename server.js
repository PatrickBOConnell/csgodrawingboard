/*
This file is part of CSGO Drawing Board.

    CSGO Drawing Board is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    CSGO Drawing Board is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with CSGO Drawing Board.  If not, see <http://www.gnu.org/licenses/>.
*/
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	path = require('path'),
	winston = require('winston'),
	passport = require('passport'),
	util = require('util'),
	SteamStrategy = require('passport-steam').Strategy;
	
var db = require('mongojs').connect('localhost/csgodrawingboard', ['strats', 'logs']);
require('winston-mongodb').MongoDB;

var options = {
		db: 'csgodrawingboard',
		collection: 'logs'
};

winston.add(winston.transports.MongoDB, options);
	
	
//winston.add(winston.transports.File, {filename: ')
	
process.on('uncaughtException', function(err) {
	console.log('uncaught exception: ' + err);
});

passport.serializeUser(function(user, done){
    done(null, user);
});

passport.deserializeUser(function(obj,done){
    done(null, obj);
});
	

passport.use(new SteamStrategy({
    returnURL: 'http://localhost:8080/auth/steam/return',//return url here
	realm: 'http://localhost:8080/',
    },
	function(identifier, profile, done) {
		process.nextTick(function() {
		    //I guess this is where I put in the query for local user from steam data?
			console.log('the identifier is: ' + identifier);
			
		    profile.itendifier = identifier;
			return done(null, profile);
		});
	}
));	


var port = process.env.PORT || 8080;	
server.listen(port);

/* io.configure(function () { 
	io.set("transports", ["xhr-polling"]); 
	io.set("polling duration", 10); 
}); */

var rooms = {};
var indexes_served = 0;
var rooms_served = 0;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret: 'this is secret'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

//POSTS
app.post('/test', function(req, res) {
	console.log('got make_room post');
	console.log(req.body);
	var map = req.body.map;
	console.log('map is: ' + map);
	var roomname;
	do{
		var crypto = require('crypto'),
			shasum = crypto.createHash('sha1');
		shasum.update('' + Math.random() + new Date().getTime());
		roomname = shasum.digest('hex');
	}while(rooms[roomname] !== undefined);
	rooms[roomname] = new Room(roomname);
	rooms[roomname].map = map;
	res.redirect('/room=' + roomname);
});


//GETS
app.get('/', function(req, res) {
	console.log('sent index');
	indexes_served++;
	winston.log('info', 'indexes served: %d', indexes_served);
	res.render('index', {user: req.user});
});
app.get('/auth/steam',
    passport.authenticate('steam', {failureRedirect: '/'}),
    function(req, res) {
        res.redirect('/');
});

app.get('/auth/steam/return',
    passport.authenticate('steam', {failureRedirect: '/'}),
    function(req, res) {
        res.redirect('/');
});

app.get('/room=:roomId', function(req, res) {
	var roomId = req.params.roomId;
	console.log('room id is: ' + roomId);
	rooms_served++;
	winston.log('info', 'rooms served: %d', rooms_served);
	if(rooms[roomId] !== undefined) {
		var mapurl = getMap(rooms[roomId].map);
		res.render('editor', {imgurl: mapurl, user:req.user});
	}
	else
		res.send('invalid room!');
});


function getMap(map) {
	switch(map) {
		case 'dust2':
			return 'imgs/de_dust2_radar_spectate.png';
			break;
		case 'inferno':
			return 'imgs/de_inferno_radar_spectate.png';
			break;
		case 'dust':
			return 'imgs/de_dust_radar_spectate.png';
			break;
		case 'train':
			return 'imgs/de_train_radar_spectate.png';
			break;
		case 'vertigo':
			return 'imgs/de_vertigo_radar.png';
			break;
		case 'nuke':
			return 'imgs/de_nuke_radar_spectate.png';
			break;
		case 'mirage':
			return 'imgs/de_mirage_radar_spectate.png';
			break;
		default:
			return 'imgs/de_dust2_radar_spectate_default.png';
			break;
	}
}



function Shape(id, type, x, y, points) {
	this.id = id;
	this.type = type;
	this.user = 'none';
	this.xPos = x;
	this.yPos = y;
	this.points = points;
	this.setX = function(newX) {
		this.xPos = newX;
	}
	this.setY = function(newY) {
		this.yPos = newY;
	}
}

function Player(name, num, img) {
	this.num = num;
	this.name = name;
	this.img = img;
	this.color;
	this.drawings = [];
}

function Room(name) {
	this.name = name;
	this.shapesBeingUsed = false;
	this.shapes = {};
	this.players = [];
	this.colors = ["#FF0000", "#0000FF", "#FF00FF", "#00FF00", "#FF6600"];
	this.getShapes = function() {
		return this.shapes;
	}
}

io.on('connection', function(socket) {
	socket.on('info', function(data){
		try{
			console.log('got here');
			if(rooms[data.room] === undefined) {
				console.log('BAD ROOM!');
				socket.disconnect();
				return;
			}
			//if(rooms[data.room] === undefined) rooms[data.room] = new Room(data.room);
			var pnum = rooms[data.room].players.length;
			var tmpname = 'player ' + pnum;
			var player = new Player(tmpname, pnum, 'http://upload.wikimedia.org/wikipedia/en/a/af/Question_mark.png');
			if(rooms[data.room].colors.length > 0)
				player.color = rooms[data.room].colors.pop();
			else player.color = "#FF0000";
			rooms[data.room].players.push(player);
			var crypto = require('crypto')
				, shasum = crypto.createHash('sha1');
			var timestamp = (new Date).getTime();
			console.log('timestamp is: ' + timestamp);
			shasum.update(data.room + player.name + player.img + player.num + timestamp);
			var locid = shasum.digest('hex');
			console.log('LOCID IS: ' + locid);
			rooms[data.room].shapes[locid] = new Shape(locid, 'player', 200, 200);
			rooms[data.room].shapes[locid].img = player.img;
			player.imgid = locid;
			socket.emit('pinfo', player);
			socket.emit('all players', rooms[data.room].players);
			socket.emit('all shapes', rooms[data.room].getShapes());
			socket.join(data.room);
			io.sockets.in(data.room).emit('player change', {type: 'new', players: rooms[data.room].players, newPlayer: player});
			socket.set('room', {room: data.room, player: player}, function(){});
			socket.broadcast.to(data.room).emit('new shape', rooms[data.room].shapes[locid]);
		}
		catch(err) {
			console.log('error in info: ' + err);
		}
	});
	socket.on('disconnect', function(data){
		try{
			socket.get('room', function(err, room) {
				if(room === undefined || room === null) {
					console.log('disconnecting bad request...');
					return;
				}
				for(var i=0; i<room.player.drawings.length; i++) {
					delete rooms[room.room].shapes[room.player.drawings[i]];
					io.sockets.in(room.room).emit('remove shape', room.player.drawings[i]);
				}
				io.sockets.in(room.room).emit('remove shape', room.player.imgid);
				delete rooms[room.room].shapes[room.player.imgid];
				rooms[room.room].colors.push(room.player.color);
				var index = room.player.num;
				rooms[room.room].players.splice(index,1);
				if(rooms[room.room].players.length < 1) {
					console.log('deleteing room: ' + room.room);
					delete rooms[room.room];
					return;
				}
				for(var i=index; i<rooms[room.room].players.length; i++){
					rooms[room.room].players[i].num--;
				}
				io.sockets.in(room.room).emit('player change', {type: 'disconnect', players: rooms[room.room].players, dcid: room.player.imgid});
			});
		}
		catch(err) {
			console.log('error in disconnect: ' + err);
		}
	});
	socket.on('send stage', function(data){
		if(data === null || data === undefined) return;
		try{
		    socket.get('room', function(err, room){
				rooms[room.room].stage = data;
			});
		}
		catch(err){
		    console.log('error in send stage: ' + err);
		}
	});
	socket.on('draw', function(data){
		if(data === null || data === undefined) return;
		try{
			socket.get('room', function(err, room) {
				var i=0;
				do {
					var crypto = require('crypto')
						, shasum = crypto.createHash('sha1');
					if(room === null) return;
					shasum.update(data.type + data.xPos + data.yPos + data.points + i);
					var locid = shasum.digest('hex');
					console.log(locid);
					i++;
				}
				while(rooms[room.room].shapes[locid] !== undefined);
				rooms[room.room].shapes[locid] = new Shape(locid, data.type, data.xPos, data.yPos, data.points);
				rooms[room.room].shapes[locid].color = room.player.color;
				if(data.type === 'brush'){ 
					rooms[room.room].players[room.player.num].drawings.push(locid);
					console.log("drawings are: " + rooms[room.room].players[room.player.num].drawings);
				}
				io.sockets.in(room.room).emit('new shape', rooms[room.room].shapes[locid]);
			});
		}
		catch(err) {
			console.log('error in draw: ' + err);
		}
	});
	socket.on('taking control', function(data) {
		console.log('got into taking control');
		try{
			socket.get('room', function(err, room) {
				if (data === null || data === undefined || rooms[room.room].shapes[data] === undefined) return;
				console.log('data is: ' + data);
				if(rooms[room.room].shapes[data].user === 'none' ||
					rooms[room.room].shapes[data].user === socket) {
						rooms[room.room].shapesBeingUsed = true;
						rooms[room.room].shapes[data].user = socket;
						socket.broadcast.to(room.room).emit('being used', data);
				}
			});
		}
		catch(err) {
			console.log('error in taking control: ' + err);
		}
	});
	socket.on('relinquish control', function(data) {
		if(data === null || data === undefined) return;
		try{
			socket.get('room', function(err, room) {
				rooms[room.room].shapes[data].user = 'none';
				rooms[room.room].shapesBeingUsed = false;
				io.sockets.in(room.room).emit('not used', {shape: data, color: room.player.color});
			});
		}
		catch(err) {
			console.log('error in relinquish control: ' + err);
		}
	});
	socket.on('move obj', function(data) {
		if(data === null || data === undefined) return;
		try{
			socket.get('room', function(err, room) {
				console.log('got into here');
				if(rooms[room.room].shapes[data.id] === null || rooms[room.room].shapes[data.id] === undefined) return;
				if(rooms[room.room].shapes[data.id].user === socket) {
					console.log('also, correct user');
					rooms[room.room].getShapes()[data.id].setX(data.xPos);
					rooms[room.room].getShapes()[data.id].setY(data.yPos);
					socket.broadcast.to(room.room).emit('shape move', {id: data.id, xPos: data.xPos, yPos: data.yPos});
				}
			});
		}
		catch(err) {
			console.log('error in move obj: ' + err);
		}
	});
	socket.on('remove elm', function(data) {
		if(data === null || data === undefined) return;
		try{
			socket.get('room', function(err, room){
				delete rooms[room.room].shapes[data];
				rooms[room.room].players[room.player.num].drawings.splice(rooms[room.room].players[room.player.num].drawings.indexOf(data), 1);
				io.sockets.in(room.room).emit('remove shape', data);
			});
		}
		catch(err) {
			console.log('error in remove elm: ' + err);
		}
	});
	socket.on('steam info', function(data) {
		console.log('got into steam info befoer html');
		try {
			socket.get('room', function(err, room) {
			var http = require('http');
				var options = {
					hostname: 'steamcommunity.com',
					port: 80,
					path: '/id/' + data,
					method: 'GET'
				};
				var req = http.request(options, function(resp){
					console.log('got into steam info during html');
					var html = '';
					resp.on('data', function(chunk) {
						html += chunk;
					});
					resp.on('end', function(){
						console.log('got into steam info after html');
						var imgregex = new RegExp("img src=\"(.*\_full.jpg)");
						var execs = imgregex.exec(html);
						if(execs === null) {
							console.log('bad login: ' + data);
							socket.emit('bad login');
							return;
						}
						else {
							var imgurl = imgregex.exec(html)[1];
							rooms[room.room].players[room.player.num].name = data;
							rooms[room.room].players[room.player.num].img = imgurl;
							rooms[room.room].shapes[room.player.imgid].img = imgurl;
							io.sockets.in(room.room).emit('player change', {type: 'change', players: rooms[room.room].players});
							io.sockets.in(room.room).emit('shape move', {type: 'image change', img: imgurl, id: rooms[room.room].players[room.player.num].imgid});
						}
					});
				});
				
				req.on('error', function(e) {
					console.log('error: ' + e.message);
				});
				
				req.end();
			});
		}
		catch(err) {
			console.log('error in steam info: ' + err);
		}
	});
	socket.on('request drawings', function(data) {
		try{
			socket.get('room', function(err, room) {
				socket.emit('player drawings', room.player.drawings);
			});
		}
		catch(err) {
			console.log('error in request drawings: ' + err);
		}
	});
});
