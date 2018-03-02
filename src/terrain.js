/** # Terrain

*/


var Terrain = exports.Terrain = declare({
	SURROUNDINGS: [
		{dx:-1, dy:-1, cost: Math.SQRT2},
		{dx:-1, dy: 0, cost: 1},
		{dx:-1, dy: 1, cost: Math.SQRT2},
		{dx: 0, dy:-1, cost: 1},
		{dx: 0, dy: 1, cost: 1},
		{dx: 1, dy:-1, cost: Math.SQRT2},
		{dx: 1, dy: 0, cost: 1},
		{dx: 1, dy: 1, cost: Math.SQRT2}
	],

	/** The map of the terrain is made of tiles taken from a tileSet. This is the default tile set.
	*/
	tileSet: [
		//{ passable: true, visible: true },
		{ passable: true, visible: true },
		{ passable: false, visible: false }
	],

	map: [
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"111100000000000011110000000011110000000000001111",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000001000000000000000000000000"
	].map(function (line) {
		return new Uint8Array(line.split(''));
	}),

	__unitsByPosition__: {},

	constructor: function Terrain(args) {
		//TODO initialization
		this.width = this.map.length;
		this.height = this.map[0].length;
	
	},

	resetTerrain: function resetTerrain(wargame){
		this.__unitsByPosition__ = this.unitsByPosition(wargame);
	},

	unitsByPosition: function unitsByPosition(wargame){
		var armies = wargame.armies,
			result = {};
		for (var team in armies) {
			armies[team].units.forEach(function (unit) {
				if (!unit.isDead()){
		          	result[unit.position] = unit;
				}
			});
		}
		return result;
	},

	tileAt: function tileAt(position) {
		var tile = this.map[position[0]] && this.map[position[0]][position[1]];
		return this.tileSet[tile];
	},

	isPassable: function isPassable(position, checkUnits) {
		var tile = this.tileAt(position);
		return !!(tile && tile.passable &&
			(!checkUnits || !this.__unitsByPosition__.hasOwnProperty(position)));
	},

	isVisible: function isVisible(position, checkUnits) {
		var tile = this.tileAt(position);
		return !!(tile && tile.visible &&
			(!checkUnits || !this.__unitsByPosition__.hasOwnProperty(position)));
	},

	distance: function distance(p1, p2) {
		var d0 = Math.abs(p1[0] - p2[0]),
			d1 = Math.abs(p1[1] - p2[1]);
		return Math.sqrt(d0 * d0 + d1 * d1);
	},

	// ## Movement ################################################################################

	/** Returns all reachable positions of the given unit.
	*/
	reachablePositions: function reachablePositions(unit, range) {

		range = range || 12;
		var visited = {},
			pending = [unit.position],
			width = this.width,
			height = this.height,
			SURROUNDINGS = this.SURROUNDINGS,
            	pos, pos2, cost, cost2, delta, tile;
		visited[unit.position] = 0;

		for (var i = 0; i < pending.length; i++) {
			pos = pending[i];
			cost = visited[pos];
			for (var j = 0; j < SURROUNDINGS.length; j++) {
				delta = SURROUNDINGS[j];
				cost2 = cost + delta.cost;
				if (cost2 > range) continue;
				pos2 = [pos[0] + delta.dx, pos[1] + delta.dy];
				if (visited.hasOwnProperty(pos2) || !this.isPassable(pos2, true)) continue;
				visited[pos2] = cost2;
				pending.push(pos2);
			}
		}
	
		return visited;
	},
	canReachAStarInf: function canReachAStarInf(args){
		var graph = new Graph(this, {diagonal:true,end:args.target.position,start:args.attacker.position}),
			end = graph.grid[args.target.position[0]][args.target.position[1]],
			start = graph.grid[args.attacker.position[0]][args.attacker.position[1]],
			result=graph.astar.search(graph, start, end,{exitCondition:args.exitCondition,heuristic:this.heuristicInfluence,influenceMap:args.influenceMap,role:args.role});

		return result;

	},
	canReachAStar: function canReachAStar(args){
		var graph = new Graph(this, {diagonal:true}),
			end = graph.grid[args.target.position[0]][args.target.position[1]],
			start = graph.grid[args.attacker.position[0]][args.attacker.position[1]],
			result =graph.astar.search(graph, start, end,{exitCondition:args.exitCondition});

		return result;

	},
	getInf:function getInf(pos,role,grid){
		var x=pos[0],
			y=pos[1];
		if (role=="Red")
			return grid[x][y];
		return -grid[x][y];

	},
	heuristicInfluence: function heuristicInfluence(pos0, pos1,grid,role){
		var d1 = Math.abs(pos1.x - pos0.x),
			d2 = Math.abs(pos1.y - pos0.y),
			inf= role=="Red" ? grid[pos0.x][pos0.y]: -grid[pos0.x][pos0.y];
		return d1 + d2+inf*60;
		
	},
	distanceToTurns:function distanceToTurns(distance){
		var turns =0;
		if (distance<=6){
			return turns;
		}
		return turns =distance % 12===0 ?distance / 12:( distance/12)+1;
	},
	undefinedAsignArray: function undefinedAsign(matrix,position) {
		matrix[position]=matrix[position]!==undefined ? matrix[position] : [];
	},
	sparseMatrix:function sparseMatrix(matrix,distanceVal,pos,object){
		if (object.value!=undefined){
		matrix[pos[0]]=matrix[pos[0]]!==undefined ? matrix[pos[0]] : [];
		matrix[pos[0]][[pos[1]]]=matrix[pos[0]][[pos[1]]]!==undefined  ? matrix[pos[0]][[pos[1]]] : {};
		matrix[pos[0]][[pos[1]]][object.key]=object.value;
		}
	},

	// ## Visibility ##############################################################################

	'dual bresenham': function bresenham(point1, point2, maxRange){
		maxRange = maxRange || Infinity;
		var result = [],
			dx = Math.abs(point2[0] - point1[0]),
			dy = Math.abs(point2[1] - point1[1]),
			sx = (point1[0] < point2[0]) ? 1 : -1,
			sy = (point1[1] < point2[1]) ? 1 : -1,
			curLoc = point1.slice(),
			err = dx - dy,
			e2;
		while (maxRange--){
			result.push(curLoc.slice());
			if (curLoc[0] === point2[0] && curLoc[1] === point2[1]) break;
			e2 = err * 2;
			if (e2 > -dy) {
				err -= dy;
				curLoc[0] += sx;
			}
			if (e2 < dx) {
				err += dx;
				curLoc[1] += sy;
			}
		}
		return result;
	},

	canShoot:function canShoot(shooterUnit, targetUnit){
		if (shooterUnit.army === targetUnit.army) {
			return Infinity;
		}
		var distance = this.distance(shooterUnit.position, targetUnit.position);
		if (distance > shooterUnit.maxRange()) {
			return Infinity;
		} else {
			var sight = this.bresenham(shooterUnit.position, targetUnit.position, distance),
				pos;
			for (var i = 0; i < sight.length; i++) {
				pos = sight[i];
				if (!this.isVisible(pos) || this.__unitsByPosition__[pos] &&
						this.__unitsByPosition__[pos].id !== shooterUnit.id &&
						this.__unitsByPosition__[pos].id !== targetUnit.id) {
					return Infinity;
				}
			}

			return distance;
		}
	},

	

	areaOfSight: function areaOfSight(unit, radius) {
		radius = radius || Infinity;
		var pos = unit.position,
			terrain = this,
			area = {};
		iterable(this.BRESENHAM_CACHE).forEachApply(function (_, path) {
			var pos2;
			for (var i = 1; i < path.length && i <= radius; i++) {
				pos2 = path[i];
				pos2 = [pos[0] + pos2[0], pos[1] + pos2[1]];
				if (!terrain.isVisible(pos2)) break;
				area[pos2] = i;
				if (terrain.__unitsByPosition__[pos2]) break;
			}
		});
		return area;
	},

	// ## Utilities ###############################################################################

	'static __SERMAT__': {
		serializer: function serialize_Terrain(obj) {
			return [];
		}
	}
}); // declare Terrain

Terrain.BRESENHAM_CACHE = Terrain.prototype.BRESENHAM_CACHE = (function (radius) {
	var pointCache = {},
		result = { radius: radius };

	function cachePath(path) {
		return path.map(function (point) {
			return pointCache[point] || (pointCache[point] = point);
		});
	}

	for (var i = -radius; i <= radius; i++) {
		result[[i, -radius]] = Terrain.bresenham([0, 0], [i, -radius]);
		result[[i, +radius]] = Terrain.bresenham([0, 0], [i, +radius]);
		if (i !== -radius && i !== radius) {
			result[[-radius, i]] = Terrain.bresenham([0, 0], [-radius, i]);
			result[[+radius, i]] = Terrain.bresenham([0, 0], [+radius, i]);
		}
	}
	return result;
})(50);

//var inf= new LW.InfluenceMap(game2,"Red")

var InfluenceMap = exports.InfluenceMap = declare({
	momentum: 0.7,
	decay: 0.5,
	iterations: 25,

	constructor: function InfluenceMap(game, role){
		this.width= game.terrain.width;
		this.height= game.terrain.height;
		this.grid= this.matrix(this.width);
		this.terrain= game.terrain;
		//this.role = role;
		
	},
	getInf:function getInf(pos){
		var x=pos[0],
			y=pos[1];
		if (this.role=="Red")
			return this.grid[x][y];
		return -this.grid[x][y];

	},
	matrix:function matrix(dim){
		return  Array(dim).fill(0).map(function(v) {return   Array(dim).fill(0).map(function(v){return 0;});});
	},
	update: function update(game,iterations) {
		var influenceMap = this,
			grid =game.concreteInfluence|| this.grid,
			it=iterations || this.iterations,
			pos;
		this.role = game.activePlayer();
		this.unitsInfluences(game);
		for (var i = 0; i < it; i++) {
			grid=this.spread(grid);
		}
		return grid;
	},
	unitsInfluences: function unitsInfluences(game) {
		var imap = this,
			sign,
			grid = this.grid,
			posX,
			posY;
		for (var army in game.armies){
			sign = "Red" ===army ? +1 : -1;
			game.armies[army].units.forEach(function (unit){
				if (!unit.isDead()) {
					posX = unit.position[0] |0;
					posY = unit.position[1] |0;
					if (!grid[posX]) {
						grid[posX]=[];
						grid[posX][posY]=0;
					}else if (!grid[posX][posY]){
						grid[posX][posY]= 0;
					}
					grid[posX][posY] = imap.influence(unit,sign) ;
				}
			});
		}
	},

	influence: function influence(unit,sign) {
		return unit.worth()*sign*1000; //FIXME Too simple?
	},
	getMomentumInf: function getMomentumInf(grid,r,c,decays){
		var v,
			di,dj,inf=0,absInf,absV;
		for ( di = -1; di < 2; di++) {
			for (dj = -1; dj < 2; dj++) {
				if ((di !== 0 || dj !== 0) && grid[r+di] && (v = grid[r+di][c+dj])) {
					v *= decays[di*di+dj*dj];
					absInf =inf<0 ? -inf: inf;
					absV   =v<0 ?   -v  : v;
					//	if (Math.abs(inf) < Math.abs(v)) {
					if (absInf < absV) {
						inf = v;
					}
				}
			}
		}
		return inf;
	},

	spread: function spread(grid) {
	//	var start=Date.now();
		var decay = this.decay,
			decays = [NaN, Math.exp(-1 * decay), Math.exp(-Math.SQRT2 * decay)],
			momentum = this.momentum,
			oneGrid=[],
			value,
			inf,
			terrain=this.terrain;

		for (var r= 0; r <grid.length; r++) {
			for (var c = 0; c < grid[r].length;c++) {
				value=grid[r][c];
				if (terrain.map[r][c]===1){
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  "t";
				}
				else{
					inf = this.getMomentumInf(grid,r,c,decays);
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  value * (1 - momentum) + inf * momentum;
				}
			}
		}
		return oneGrid;

    },


}); // declare InfluenceMap
