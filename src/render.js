exports.Renderer = declare({
	constructor: function Renderer(canvas) {
		canvas = this.canvas = canvas || document.getElementById('wargame-canvas');
		var ctx = this.ctx = canvas.getContext('2d');
		ctx.fillStyle = 'white';
	},

	renderScope: function renderScope(width, height, block) {
		var canvas = this.canvas,
			ctx = this.ctx;
		ctx.save();
		ctx.scale(canvas.width / width, canvas.height / height);
		try {
			block.call(this, ctx);
		} finally {
			ctx.restore();
		}
	},

	render: function render(wargame) {
		var terrain = wargame.terrain;
		this.renderScope(terrain.width, terrain.height, function (ctx) {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for (var x = 0, width = terrain.width; x < width; x++) {
				for (var y = 0, height = terrain.height; y < height; y++) {
					if (!terrain.isPassable([x, y])) {
						this.drawSquare(x, y, 1, 1, "black");
					} else {
						this.drawSquare(x, y, 1, 1, "#CCCCCC");
					}
				}
			}
			var renderer = this,
				armies = wargame.armies;
			ctx.strokeStyle = 'black';
			ctx.font = "1px Arial";
			for (var team in armies) {
				armies[team].units.forEach(function (unit) {
					if (!unit.isDead()){
						renderer.drawSquare(unit.position[0], unit.position[1], 1, 1, unit.army.player);
						ctx.fillStyle = 'black';
						ctx.fillText(unit.id, unit.position[0], unit.position[1]);
					}
				});
			}
		});
	},
	renderPath: function renderPath(wargame,path,color) {
		var terrain = wargame.terrain;
		this.renderScope(terrain.width, terrain.height, function (ctx) {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for (var x = 0, width = terrain.width; x < width; x++) {
				for (var y = 0, height = terrain.height; y < height; y++) {
					if (!terrain.isPassable([x, y])) {
						this.drawSquare(x, y, 1, 1, "black");
					} else {
						this.drawSquare(x, y, 1, 1, "#CCCCCC");
					}
				}
			}
			var renderer = this,
				armies = wargame.armies;
			ctx.strokeStyle = 'black';
			ctx.font = "1px Arial";
			for (var team in armies) {
				armies[team].units.forEach(function (unit) {
					if (!unit.isDead()){
						renderer.drawSquare(unit.position[0], unit.position[1], 1, 1, unit.army.player);
						ctx.fillStyle = 'black';
						ctx.fillText(unit.id, unit.position[0], unit.position[1]);
					}
				});
			}
			for (var move in path) {
			
				renderer.drawSquare(path[move].x, path[move].y, 1, 1, color || 'red');
				
			}
		});
	},

	renderSight: function renderSight(wargame, unit) {
		unit = unit || wargame.__activeUnit__;
		if (unit) {
			var terrain = wargame.terrain;
			this.renderScope(terrain.width, terrain.height, function (ctx) {
				var range = unit.maxRange(),
				 	sight = terrain.areaOfSight(unit, range),
					alpha, pos;
				for (var p in sight) {
					alpha = (1 - sight[p] / range) * 0.8 + 0.2;
					pos = p.split(',');
					this.drawSquare(+pos[0], +pos[1], 1, 1, 'rgba(255,255,0,'+ alpha +')');
				}
			});
		}
	},
	renderMoves : function renderMoves(wargame,moves){
		
				var renderer = this,
					canvas = this.canvas,
					ctx = this.ctx,
					terrain = wargame.terrain,
					world = terrain.world;
				this.render(wargame);
				ctx.save();
				ctx.scale(canvas.width / terrain.WorldWidth, canvas.height / terrain.WorldHeight);
		
				for (var army in moves){
					moves[army].forEach(function (move){
						if (move.constructor==MoveAction){
							ctx.save();
							ctx.fillStyle = '#32CD32';
							ctx.beginPath();
							ctx.arc(move.position[0], move.position[1],1, 0, 2 * Math.PI);
							ctx.fill();
							ctx.restore();
						}
					});
				}
				ctx.restore();
		},

	drawSquare: function drawSquare(x, y, height, width, color){
		var ctx = this.ctx;
		ctx.fillStyle = color;
		ctx.fillRect(x, y, 1, 1);
	},
	renderInfluence: function renderInfluence(wargame,grid){
		
		var terrain = wargame.terrain;
		this.renderScope(terrain.width, terrain.height, function (ctx) {
			var w=grid.length,
			h=grid[0].length,
			renderer = this,
			canvas = this.canvas,
			terrain = wargame.terrain,
			world = terrain.world,
			value,
			min=Number.POSITIVE_INFINITY,
			max=Number.NEGATIVE_INFINITY,
			absMax,
			opacity,x,y,
			width = terrain.width,
			height = terrain.height;
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for ( x = 0, width; x < width; x++) {
				for ( y = 0, height; y < height; y++) {
					if (!terrain.isPassable([x, y])) {
						this.drawSquare(x, y, 1, 1, "black");
					} else {
						this.drawSquare(x, y, 1, 1, "#CCCCCC");
					}
				}
			}
			for ( x=0; x<w;x++){
				for ( y=0; y<h;y++){
					if (!isNaN(grid[x][y])){
						max= Math.max(max,grid[x][y]);
						min= Math.min(min,grid[x][y]);
					}
				}
			}
		absMax= Math.max(max,Math.abs(min));
			for ( x=0; x<w;x++){
				for ( y=0; y<h;y++){
					value=grid[x][y];
					if (value =="t" ){
						this.drawSquare(x,y,1,1,"black");
					}
					else if (value >0 ){
						opacity = value / absMax;
						this.drawSquare(x,y,1,1,"rgba(255,0,0,"+opacity+")" );
					}
					else if (value <0 ){
						opacity = -value / absMax;
						this.drawSquare(x,y,1,1,"rgba(0,0,255,"+opacity+")");
					}
				}
			}
		});
	},

////////////////////////////////////////////////////////////////////////////////////////////////////
/*
	render2: function render2(wargame) {
		var renderer = this,
			canvas = this.canvas,
			ctx = this.ctx,
			terrain = wargame.terrain,
			world = terrain.world;
		terrain.addArmiesToWorld(wargame);
		ctx.save();
		ctx.scale(canvas.width / terrain.WorldWidth, canvas.height / terrain.WorldHeight);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		world.bodies.forEach(function (body) {
			switch (body.shapes[0].type){
				case 1:
					renderer.drawCircle(body);
					break;
				case 8:
					renderer.drawBox(body);
					break;
			}
		});
		ctx.restore();
	},
	renderMoves : function renderrenderMoves(wargame,moves){

		var renderer = this,
			canvas = this.canvas,
			ctx = this.ctx,
			terrain = wargame.terrain,
			world = terrain.world;
		this.renderGrid(wargame.terrain.terrain);
		ctx.save();
		ctx.scale(canvas.width / terrain.WorldWidth, canvas.height / terrain.WorldHeight);

		for (var army in moves){
			moves[army].forEach(function (move){
				if (move.constructor==MoveAction){
					ctx.save();
					ctx.fillStyle = '#32CD32';
					ctx.beginPath();
					ctx.arc(move.position[0], move.position[1],1, 0, 2 * Math.PI);
					ctx.fill();
					ctx.restore();
				}
			});
		}
		ctx.restore();
	},
	drawCircle: function drawCircle(body) {
		var ctx = this.ctx;
		ctx.beginPath();
		var x = body.position[0],
			y = body.position[1];
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(body.interpolatedAngle);//FIXME
		ctx.fillStyle = {
			Blue: 'blue', Red: 'red', Terrain: 'black'
		}[body.team];
		ctx.arc(0, 0, body.shapes[0].radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	},
	drawBox:function drawBox(boxBody){
		var renderer = this,
			canvas = this.canvas,
			ctx = this.ctx,
			boxShape=boxBody.shapes[0],
			x = boxBody.position[0],
			y = boxBody.position[1];
				ctx.save();
			ctx.beginPath();

		//	ctx.translate(x, y);        // Translate to the center of the box
			ctx.rotate(boxBody.interpolatedAngle);  // Rotate to the box body frame
			ctx.rect(x - boxShape.width/2, y - boxShape.height/2, boxShape.width, boxShape.height);
			ctx.stroke();
			ctx.fill();
			ctx.restore();
	},

	renderGrid:function renderGrid(grid){
		var canvas = this.canvas,
			ctx = this.ctx,x,y,value,w=grid.length,
			h=grid[0].length;
					ctx.save();

		ctx.scale(canvas.width / 48, canvas.height / 48);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.strokeStyle = 'black';
		ctx.fillStyle = 'black';
		ctx.font = "1px Arial";

		for ( x=0; x<w;x++){
			for ( y=0; y<h;y++){
				value=grid[x][y];
				if (value =="t"){
					this.drawSquare(x,y,1,1,"black");
				}else if(value.army){
					this.drawSquare(value.position[0],value.position[1],1,1,value.army.player);

					ctx.fillStyle = 'black';
					ctx.font = "2px Arial";
					ctx.fillText(value.id,value.position[0],value.position[1]);
					ctx.font = "1px Arial";
				}
				else{
				ctx.fillText(value,x-0.5, y+0.5);
				}

			}
		}
		ctx.restore();

	},
	renderGridSight:function renderGridSight(grid){
		var canvas = this.canvas,
			ctx = this.ctx,x,y,value;
					ctx.save();

		ctx.scale(canvas.width / 48, canvas.height / 48);
		ctx.strokeStyle = 'black';
		ctx.fillStyle = 'black';
		ctx.font = "1px Arial";

		for (var a in grid){
			 x=a.split(",")[0];
			 y=a.split(",")[1];
			this.drawSquare(x,y,1,1, "rgba(0, 255, 0, 0.7)");

		}
		ctx.restore();

	},
	*/
}); //declare Renderer.

/*




// Interpolates two [r,g,b] colors and returns an [r,g,b] of the result
// Taken from the awesome ROT.js roguelike dev library at
// https://github.com/ondras/rot.js
var _interpolateColor = function(color1, color2, factor) {
  if (arguments.length < 3) { factor = 0.5; }
  var result = color1.slice();
  for (var i=0;i<3;i++) {
    result[i] = Math.round(result[i] + factor*(color2[i]-color1[i]));
  }
  return result;
};
*/
