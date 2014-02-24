
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
var shapehash = {};



$(document).ready(function(){
    var sessionstuff = '<%=Session["user"]%>'
	console.log('session: ' + sessionstuff);
	$('#pageLink').val(window.location.href);
	
	$("#pageLink").click(function(){
		// Select input field contents
		this.select();
	});
	
	var toolhidden = false;
	var socket = io.connect(window.location.hostname, {reconnect: false});
	var URL = document.URL;
	var roomregex = new RegExp("room=(.{40})");
	var urlexec = roomregex.exec(URL);
	var roomFromUrl = urlexec[1];
	console.log('room from url is: ' + roomFromUrl);
	socket.emit('info', {room: roomFromUrl});
	
	
	$( "#toolbox" ).dialog({
	  dialogClass: "nohighlight",
	  resizable: false,
	  draggable: true,
	  width: 225,
	  position: {at: 'right', of: '#map'}
	});
	
	
	$("#testcheck").on('mousedown', function(){
		console.log($(this).is(':checked'));
		$(".playercheck").remove();
	});
	var stage = new Kinetic.Stage({
		container: 'map',
		width: 1024,
		height: 1024
	});
	var displayLayer = new Kinetic.Layer();
	var tempLayer = new Kinetic.Layer();
	var clickLayer = new Kinetic.Layer();
	var clickEvent = new Kinetic.Rect({
		x: 0,
		y: 0,
		width: stage.getWidth(),
		height: stage.getHeight()
	});
	clickLayer.add(clickEvent);
	stage.add(tempLayer);
	stage.add(displayLayer);
	stage.add(clickLayer);
	var imgObj = new Image();
	imgObj.src = 'imgs/icons/smoke_temp.png';
	
	$('#map').attr('tabindex', 0);
	$('#map').keydown(function(e) {
		if(e.keyCode === 32) {
			e.preventDefault();
			socket.emit('request drawings');
		}
	});
	$(document).keydown(function(e) {
		if (e.which == 49)
			handleClick('smoke');
		else if (e.which == 50)
			handleClick('hand');
		else if (e.which == 51)
			handleClick('brush');
	});
	$('#comid').keydown(function(e) {
		if(e.keyCode === 13) {
			e.preventDefault();
			steamInfo();
		}
	});
	$('#mintool').click(function() {
		$('#toolbox').toggle();
		toolhidden = !toolhidden;
		if(toolhidden) $('#mintool').html('[+]');
		else $('#mintool').html('[-]');
	});
	
	
	var tool = 'hand';
	var color = "#FF0000";
	var painting = false;
	var linePoints = [];
	var playerimgs = [];
	
	clickEvent.on('click', function(){
		switch(tool) {
			case 'hand':
				break;
			case 'smoke':
				var xPos = stage.getMousePosition().x - 37.5;
				var yPos = stage.getMousePosition().y - 37.5;
				socket.emit('draw', {type: 'smoke', xPos: xPos, yPos: yPos});
				//SEND BOARD STATE HERE.
				break;
			case 'brush':
				break;
			default:
				break;
		}
	});
	clickEvent.on('mousedown', function() {
		switch(tool){
			case 'hand':
				break;
			case 'brush':
				painting = true;
				break;
			default:
				break;
		}
	});
	clickEvent.on('mousemove', function() {
		var xPos = stage.getMousePosition().x;
		var yPos = stage.getMousePosition().y;
		var cursor;
		tempLayer.removeChildren();
		switch(tool){
			case 'hand':
				cursor = new Kinetic.Circle({});
				break;
			case 'smoke':
				cursor = new Kinetic.Image({
					x: xPos - 37.5,
					y: yPos - 37.5,
					image: imgObj,
					height: 75,
					width: 75
				});
				break;
			case 'brush':
				cursor = new Kinetic.Circle({
					x: xPos,
					y: yPos,
					radius: 3,
					fill: color
				});
				break;
		}
		tempLayer.add(cursor);
		if(painting) {
			linePoints.push(xPos);
			linePoints.push(yPos);
			var tempLine = new Kinetic.Line({
				points: linePoints,
				stroke: color,
				strokeWidth: 6,
				lineCap: 'round',
				lineJoin: 'round'
			});
			tempLayer.add(tempLine);
		}
		tempLayer.draw();
	});
	clickEvent.on('mouseup', function() {
		if(tool === 'brush'){
			var xPos = stage.getMousePosition().x;
			var yPos = stage.getMousePosition().y;
			tempLayer.removeChildren();
			painting = false;
			linePoints.push(xPos);
			linePoints.push(yPos);
			console.log('linePoints: ' + linePoints);
			socket.emit('draw', {type: 'brush', points: linePoints, xPos: xPos, yPos: yPos});
			//SEND BOARD STATE HERE!
			linePoints = [];
		}
	});
	// clickEvent.on('mouseleave', function() {
		// if(tool === 'brush'){
			// var xPos = stage.getMousePosition().x;
			// var yPos = stage.getMousePosition().y;
			// tempLayer.removeChildren();
			// painting = false;
			// linePoints.push(xPos);
			// linePoints.push(yPos);
			// var permLine;
			// if(linePoints.length == 2) {
				// permLine = new Kinetic.Circle({
					// x: xPos,
					// y: yPos,
					// radius: 5,
					// fill: '#FF0000'
				// });
			// }
			// else {
				// permLine = new Kinetic.Line({
					// points: linePoints,
					// stroke: '#FF0000',
					// strokeWidth: 10,
					// lineCap: 'round',
					// lineJoin: 'round'
				// });
			// }
			// permLine.on('dblclick', function(){
				// this.remove();
				// stage.draw();
			// });
			// displayLayer.add(permLine);
			// stage.draw();
			// linePoints = [];
		// }
	// });
	handleClick = function(clickedIcon) {
		tool = clickedIcon;
		removeAllBorders();
		switch(tool) {
			case 'hand':
				$('#map').css('cursor', 'pointer');
				$('#hand-id').css('border', '2px solid ' + color);
				$('#hand-id').css('margin', '2.5px');
				displayLayer.moveToTop();
				break;
			case 'brush':
				$('#map').css('cursor', 'none');
				$('#brush-id').css('border', '2px solid ' + color);
				$('#brush-id').css('margin', '2.5px');
				clickLayer.moveToTop();
				break;
			case 'smoke':
				$('#map').css('cursor', 'none');
				$('#smoke-icon').css('border', '2px solid ' + color);
				$('#smoke-icon').css('margin', '2.5px');
				clickLayer.moveToTop();
				break;
			default:
				$('#map').css('cursor', 'pointer');
				break;
		}
	}
	socket.on('connect', function(data) {
		console.log('connected to socket.io');
	});
	socket.on('new shape', function(data){
		makeShape(data);
	});
	socket.on('shape move', function(data){
		if(data.type === 'image change') {
			$('#badlogin').remove();
			console.log('before img');
			var tmpimg = new Image();
			tmpimg.src = data.img;
			tmpimg.onload = function(){
				var tmpplayer = new Kinetic.Image({
					x: shapehash[data.id].getX(),
					y: shapehash[data.id].getY(),
					image: tmpimg,
					draggable: true,
					height: 50,
					width: 50
				});
				tmpplayer.selected = false;
				console.log(data.id);
				tmpplayer.setId(data.id);
				tmpplayer.on('mousedown', function(){
					if(tool === 'hand'){
						console.log('requesting control of: ' + this.getId());
						socket.emit('taking control', this.getId());
						this.selected = true;
						updateTimer = window.setInterval(function(){
							socket.emit('move obj', {id: tmpplayer.getId(), xPos: tmpplayer.getX(), yPos: tmpplayer.getY()});
						}, 100);
					}
				});
				tmpplayer.on('mouseup', function(){
					console.log('calling mouse up');
					if(tool === 'hand' && this.selected){
						socket.emit('relinquish control', this.getId());
						this.selected = false;
						clearInterval(updateTimer);
					}
				});
				tmpplayer.on('mouseleave', function(){
					console.log('calling mouse up');
					if(tool === 'hand' && this.selected){
						socket.emit('relinquish control', this.getId());
						this.selected = false;
						clearInterval(updateTimer);
					}
				});
				shapehash[data.id].remove();
				shapehash[data.id] = tmpplayer;
				displayLayer.add(shapehash[data.id]);
				stage.draw();
				console.log('after img');
			}
		}
		else {
			console.log('shape: ' + data.id + ' is being moved to ' + data.xPos + ', ' + data.yPos);
			shapehash[data.id].setX(data.xPos);
			shapehash[data.id].setY(data.yPos);
			stage.draw();
		}
	});
	socket.on('being used', function(data){
		console.log(data  + ' is being used by someone else');
		this.selected = false;
		shapehash[data.shape].setDraggable(false);
	});
	socket.on('not used', function(data) {
		console.log(data + ' stopped being used');
		shapehash[data.shape].setDraggable(true);
		stage.draw();
	});
	socket.on('remove shape', function(data) {
		shapehash[data].remove();
		stage.draw();
	});
	socket.on('all shapes', function(data) {
		shapehash = data;
		for(var id in shapehash) {
			console.log(id);
			makeShape(shapehash[id]);
		}
		stage.draw();
	});
	socket.on('player change', function(data) {
		$('#playerList').empty();
		for(var i=0; i<data.players.length; i++) {
			console.log(data.players[i].img);
			$('#playerList').append('<img class="tool" src="' + data.players[i].img + '" /><br /><span style="color:'+data.players[i].color+';">' + data.players[i].name + '</span><br/>');
		}
		if(data.type === 'disconnect') {
			shapehash[data.dcid].remove();
			delete shapehash[data.dcid];
		}
		stage.draw();
	});
	socket.on('pinfo', function(data) {
		color = data.color;
		handleClick('hand');
	});
	socket.on('bad login', function(data) {
		$('#steamstuff').append('<p id="badlogin">BAD LOGIN</p>');
	});
	socket.on('player drawings', function(data) {
		for (var i=0; i<data.length; i++) {
			socket.emit('remove elm', data[i]);
		}
	});
	socket.on('disconnect', function(data) {
		console.log('WOW DISCONNECT GEWD');
		alert('DISCONNECTED FROM SERVER');
		if(socket) socket.disconnect();
	});
	function makeShape(data){
		switch(data.type) {
			case 'smoke':
				var updateTimer;
				console.log('got in smoke ' + data.img);
				var smoke = new Kinetic.Image({
					x: data.xPos,
					y: data.yPos,
					image: imgObj,
					draggable: true,
					height: 75,
					width: 75
				});
				smoke.selected = false;
				console.log(data.id);
				smoke.setId(data.id);
				smoke.on('dblclick', function(){
					socket.emit('remove elm', data.id);
					stage.draw();
					//UPDATE BOARD STATE HERE!
				});
				smoke.on('mousedown', function(){
					if(tool === 'hand'){
						console.log('requesting control of: ' + this.getId());
						socket.emit('taking control', this.getId());
						this.selected = true;
						updateTimer = window.setInterval(function(){
							socket.emit('move obj', {id: smoke.getId(), xPos: smoke.getX(), yPos: smoke.getY()});
							//KEEP THIS THE SAME (DON'T UPDATE BOARD STATE).
						}, 100);
					}
				});
				smoke.on('mouseup', function(){
					console.log('calling mouse up');
					if(tool === 'hand' && this.selected){
						socket.emit('relinquish control', this.getId());
						//UPDATE BOARD STATE HERE!
						this.selected = false;
						clearInterval(updateTimer);
					}
				});
				console.log(smoke.getId());
				shapehash[smoke.getId()] = smoke;
				displayLayer.add(smoke);
				stage.draw();
				var json = stage.toJSON();
				console.log(json);
				break;
			case 'player':
				var locimgobj = new Image();
				locimgobj.src = data.img;
				console.log('player image and url is: ' + data.img);
				var updateTimer;
				locimgobj.onload = function() {
					var playerimg = new Kinetic.Image({
						x: data.xPos,
						y: data.yPos,
						image: locimgobj,
						draggable: true,
						height: 50,
						width: 50
					});
					playerimg.selected = false;
					console.log(data.id);
					playerimg.setId(data.id);
					playerimg.on('mousedown', function(){
						if(tool === 'hand'){
							console.log('requesting control of: ' + this.getId());
							socket.emit('taking control', this.getId());
							this.selected = true;
							updateTimer = window.setInterval(function(){
								socket.emit('move obj', {id: playerimg.getId(), xPos: playerimg.getX(), yPos: playerimg.getY()});
							}, 100);
						}
					});
					playerimg.on('mouseup', function(){
						console.log('calling mouse up');
						if(tool === 'hand' && this.selected){
							socket.emit('relinquish control', this.getId());
							this.selected = false;
							clearInterval(updateTimer);
						}
					});
					console.log(playerimg.getId());
					shapehash[playerimg.getId()] = playerimg;
					displayLayer.add(playerimg);
					stage.draw();
					console.log(playerimg.isDraggable());
				}
				break;
			case 'brush':
				console.log('id: ' + data.id);
				console.log('type: ' + data.type);
				console.log('xPos: ' + data.xPos);
				console.log('points: ' + data.points);
				var permLine;
				if(data.points.length == 2) {
					permLine = new Kinetic.Circle({
						x: data.xPos,
						y: data.yPos,
						radius: 3,
						fill: data.color
					});
				}
				else {
					permLine = new Kinetic.Line({
						points: data.points,
						stroke: data.color,
						strokeWidth: 6,
						lineCap: 'round',
						lineJoin: 'round'
					});
				}
				permLine.setId(data.id);
				shapehash[permLine.getId()] = permLine;
				permLine.on('dblclick', function(){
					console.log('current id is: ' + this.getId());
					socket.emit('remove elm', this.getId());
					stage.draw();
				});
				console.log(permLine.getId());
				displayLayer.add(permLine);
				displayLayer.draw();
				break;
			default:
				break;
		}
	}
	removeAllBorders = function() {
		$('#hand-id').css('border', 'none');
		$('#smoke-icon').css('border', 'none');
		$('#brush-id').css('border', 'none');
		$('#hand-id').css('margin', '4.5px');
		$('#smoke-icon').css('margin', '4.5px');
		$('#brush-id').css('margin', '4.5px');
	}
	steamInfo = function() {
		var name = $('#comid').val();
		socket.emit('steam info', name);
	}
	addAllShapes = function() {
		for(var id in shapehash) {
			displayLayer.add(shapehash[id]);
		}
		stage.draw();
	}
    showSave = function() {
        $('#save-menu').modal();
    }
	submitSave = function() {
		var name = $('#savetitle').val();
		socket.emit('save attempt', {name: name});
	}
});
