/** # Terrain
El terrain tiene que tener tamaño de una grid
TODO
*/
//DELETE var world,WorldWidth,WorldHeight,squareSize,matrixNxN;

var Terrain = exports.Terrain = declare({
	SURROUNDINGS: Iterable.product([-1,0,+1], [-1,0,+1]).filterApply(function (dx, dy) {
			return dx || dy;
		}, function (dx, dy) {
			return { dx: dx, dy: dy, cost: Math.sqrt(dx*dx + dy*dy) };
		}).toArray(),
	
	constructor: function Terrain(xTerrains) {
		this.world = new p2.World({ gravity:[0,0] });
		this.WorldWidth  =48 ; //x
		this.WorldHeight =48 ; //y
		this.squareSize=1  ;
		this.matrix=[];
		this.matrixNxN=[];
		this.obstacles= [];
		this.terrains=xTerrains || [{radius: 2, position:[12,24]},{radius: 2, position:[12,10]},{radius: 2, position:[12,15]},{radius: 2, position:[12,6]}];
		this.wi = Math.floor(this.WorldWidth/(this.squareSize));
    	this.he = Math.floor(this.WorldHeight/(this.squareSize));
		this.explore=[
			    	{rePos:[ 0 , 1],cost: 1 },
					{rePos:[ 0 ,-1],cost: 1 },
					{rePos:[ 1 , 0],cost: 1 },
					{rePos:[-1 , 0],cost: 1 },
					{rePos:[ 1 , 1],cost: Math.SQRT2 },
					{rePos:[-1 , 1],cost: Math.SQRT2 },
					{rePos:[-1 ,-1],cost: Math.SQRT2 },
					{rePos:[ 1 ,-1],cost: Math.SQRT2 },
					];
		this.addTerrainToWorld();
		//this.losMap= this.losMap();
	},
	
	canSee: function canSee(fromUnit, toUnit) {
		return this.canSeeFromPosition(fromUnit.position, toUnit, fromUnit.army.player);
	},
	
	canSeeFromPosition: function canSeeFromPosition(fromPosition, toUnit, fromTeam) {
	/*	if (!this.losMap[toUnit.position]){
			return Infinity;
		}
		else{*/
			var ray = new p2.Ray({
					mode: p2.Ray.ALL,
					from: fromPosition,
					to: toUnit.position
				});
			var rayResult = new p2.RaycastResult();
			this.world.raycast(rayResult, ray);
			if (rayResult.body && rayResult.body.id === this.bodiesByUnitId[toUnit.id]) {
				return rayResult.getHitDistance(ray);
			}
			else{
				return Infinity;
			}
		//}
	},
	canSeeFromPosPos: function canSeeFromPosPos(fromPos, toPos){
		var rayResult = new p2.RaycastResult(),
			ray = new p2.Ray({
				mode: p2.Ray.ALL,
				from: fromPos,
				to: toPos
			});
		this.world.raycast(rayResult, ray);
		if (rayResult.body) {
			return Infinity;
		}else{
			return p2.vec2.distance(fromPos,toPos);
		}
	},
	losMapSinglePosition: function losMapSinglePosition(from,grid,gridNoLos){
		var w=this.WorldWidth, //x
			h=this.WorldHeight, //y
			world=this.world,
			positionsCanSee,
			to,x,y;
			//start=Date.now();
		for ( x=0; x<w;x++){
			for ( y=0; y<h;y++){
				to=new Float32Array([x,y]);
				if ((!grid[from] || !grid[from][to]) || (!gridNoLos[from] || !gridNoLos[from][to])){
					if (p2.vec2.distance(from, to)<=12){
						positionsCanSee = this.canSeeFromPosPos(from, to);
						if (isFinite(positionsCanSee)){
							positionsCanSee=Math.ceil(positionsCanSee);
							grid[from]= !grid[from] ? {}: grid[from];
							grid[to]  = !grid[to] ? {}: grid[to];
							grid[from][to]= !grid[from][to] ? {}: grid[from][to];
							grid[to][from]= !grid[to][from] ? {}: grid[to][from];
							grid[from][to]=positionsCanSee;
							grid[to][from]=positionsCanSee;
						}else{
							gridNoLos[from]=!gridNoLos[from]?{}:gridNoLos[from];
							gridNoLos[to]=!gridNoLos[to]?{}:gridNoLos[to];
							gridNoLos[from][to]=!gridNoLos[from][to]?{}:gridNoLos[from][to];
							gridNoLos[to][from]=!gridNoLos[to][from]?{}:gridNoLos[to][from];
							gridNoLos[from][to]=false;	
							gridNoLos[to][from]=false;	
						}
					}
				}
			}
		}
		//console.log(Date.now()- start);
		//res= Object.keys(res).length ===0 ? false : res;
		//return res;
	},
	losMap: function losMap(){
		var w=this.WorldWidth, //x
			h=this.WorldHeight, //y
			world=this.world,
			grid={},
			gridNoLos={},
			positionsCanSee,
			xyPos,x,y;
			//start=Date.now();
		for (x=0; x<w;x++){
			for (y=0; y<h;y++){
				xyPos=new Float32Array([x,y]);
				this.losMapSinglePosition(xyPos,grid,gridNoLos);
			}
		}
	//	console.log(Date.now()- start);
		return grid;
		//return JSON.stringify(grid);
		
		 
		
	},
	canShoot:function canShoot(shooterUnit, targetUnit, range){
		return shooterUnit.army !== targetUnit.army &&
			this.canSee(shooterUnit, targetUnit) < range;
	},
	
	/** Removes all units' bodies from the world.
	*/
	killAll:function killAll(){
		var world = this.world;
		this.world.bodies.slice().forEach(function (body) {
			if (body.team !== 'Terrain') {
				world.removeBody(body);
			}
		});
	},
	
	/** Updates the unit bodies in the world.
	*/
	addArmiesToWorld:function addArmiesToWorld(wargame) {
		this.killAll();
		this.bodiesByUnitId = {};
		var armies = wargame.armies,
			terrain = this;
		for (var team in armies) {
			armies[team].units.forEach(function (unit) {
				if (!unit.isDead()){
					var unitShape = new p2.Circle({ radius: unit.radius }),
						unitBody = new p2.Body({ mass:0, damping:0, position: unit.position });
					unitBody.team = unit.army.player;
					unitBody.unit = unit;
					unitBody.addShape(unitShape);
					terrain.bodiesByUnitId[unit.id] = unitBody.id;
					terrain.world.addBody(unitBody);
				}
			});
		}
	},
	/**
	 * Add terrains to the terrain.world 
	 */
	addTerrainToWorld:function addTerrainToWorld(){
		var world=this.world,
			terrains=this.terrains,
			xTerrain,
			terrainBody,
			terrainShape;
		for(var ter in terrains){
			xTerrain= terrains[ter];
			terrainBody = new p2.Body({ mass:0, position:new Float32Array([xTerrain.x,xTerrain.y])});
			switch(xTerrain.type){
				case p2.Shape.CIRCLE:
					terrainShape = new p2.Circle({ radius: xTerrain.radius });
					break;
				default: // p2.Shape.BOX
					terrainShape = new p2.Box({ width:xTerrain.width, height:xTerrain.height});
					break;
					
			}
			terrainBody.team="Terrain";
			terrainBody.addShape(terrainShape);
			world.addBody(terrainBody);
		}
	},
	
	/** Returns the bodies at the given `position` in a square of size `size`.
	*/
	bodiesAt: function bodiesAt(position, size) {
		var radius = size / 2,
			sensor = new p2.AABB({
				lowerBound: new Float32Array([position[0] - radius, position[1] - radius]),
				upperBound: new Float32Array([position[0] + radius, position[1] + radius])
			});
		return this.world.broadphase.aabbQuery(this.world, sensor);
	},
	
	/** Checks if the given box `aabb` collides with any body at the given `position`.
	 * size: unit diameter 
	*/
	isBlocked: function isBlocked(unitPosition, position, size,blockCondition) {
		var ret;
		if (blockCondition===null){
			ret= this.bodiesAt(position, size).filter(function (a){
				return !(a.position[0] === unitPosition[0] && a.position[1] === unitPosition[1]);
			}).length > 0;
		}else{
			ret= blockCondition(unitPosition,position,size,this.world);
		}	
		return ret;
	},
	
	/** Returns all reachable positions of the given unit.
	*/
	//TODO Take the position and not the unit.
	//TODO Take step as argument.
	reachablePositions: function reachablePositions(unitPosition, maxTravelDistance,args) {
		maxTravelDistance = maxTravelDistance || 12;	
		var terrain = this,
			visited = {},
			toExplore = [unitPosition],
			width = this.WorldWidth,
			height = this.WorldHeight,
			step = args.Step || 2, //FIXME
			blockCondition = args.isBlocked || null,
			pos, pos2;
			unitPosition = new Float32Array(unitPosition);
		visited[unitPosition] = 0;
		while (toExplore.length > 0) {
			pos = toExplore.shift();
			this.SURROUNDINGS.forEach(function (surr) {
				pos2 = new Float32Array([pos[0] + surr.dx * step, pos[1] + surr.dy * step]);
				if (pos2[0] >= 0 && pos2[1] >= 0 && pos2[0] < width && pos[1] < height &&
						!visited.hasOwnProperty(pos2 +'') &&
						visited[pos] + surr.cost * step < maxTravelDistance &&
						!terrain.isBlocked(unitPosition,pos2, 2,blockCondition)) {
					visited[pos2] = visited[pos] + surr.cost * step;
					toExplore.push(pos2);
				}
			});
		}
		return visited;
	},
	infBlockCondition : function infBlockCondition(unitPosition,position,size,world){
		var radius = size / 2,
		sensor = new p2.AABB({
			lowerBound: new Float32Array([position[0] - radius, position[1] - radius]),
			upperBound: new Float32Array([position[0] + radius, position[1] + radius])
		});
		world.broadphase.aabbQuery(world, sensor).filter(function (a){
			return a.team =="Terrain";
		});
	},
	paintTerrains: function paintGrid(grid,x,y){
		var sensor = new p2.AABB({
					lowerBound: new Float32Array([x,y]),
					upperBound: new Float32Array([x+1,y+1])}),
			res=0,
			terrains = this.world.broadphase.aabbQuery(this.world, sensor).filter(
				function (body) {

					return body.team==="Terrain";
				});		

		if (terrains.length!==0){
			res="t";	
			this.obstacles.push({ x: x, y:y});	
		}	
		grid[x][y]=res;	
	},
	terrainGrid: function terrainGrid(){
		var w=this.WorldWidth, //x
			h=this.WorldHeight, //y
			world=this.world,
			grid=[],
			x,
			y;
		for ( x=0; x<w;x++){
			grid[x]=[];
			for ( y=0; y<h;y++){
				this.paintTerrains(grid,x,y);
			}
		}
		return grid;
	},
	influenceMap: function influenceMap(game){
		//Para cada unidad en army  obtengo la influencia 
		//La propago con un algoritmo de
	
 
		var grid=this.terrainGrid(),
			xArmy,
			isActivePlayer,
			terrain=this;
			//start=Date.now();
		for (xArmy in game.armies){
			isActivePlayer= game.activePlayer()===xArmy? 1:-1;
			game.armies[xArmy].units.forEach(
				function (unit){
					if (!unit.isDead()) {
						terrain.setUnitInfluence(unit.position, unit.cost()*isActivePlayer,	grid);
					}
				});
		}
				//console.log(Date.now()- start);

		return grid;
	},
	setUnitInfluence: function setUnitInfluence(unitPosition,unitCost,grid){
		var infRange06=unitCost,
			infRange12=unitCost*0.5,
			infRange18=unitCost*(1/3),
			pos,v,x,y,k,
			recheablePos= this.reachablePositions(unitPosition,18,{Step:1,isBlocked:this.infBlockCondition});
		for (k in recheablePos)
		{
			v= recheablePos[k];
			pos = k.split(',');
			x=pos[0];
			y=pos[1];
			if (v<=6){
				grid[x][y]=grid[x][y]!="t" ?grid[x][y]+ infRange06: "t";
			}else if (v>6 && v<=12){
				grid[x][y]=grid[x][y]!="t" ?grid[x][y]+ infRange12: "t";
			}else{
				grid[x][y]=grid[x][y]!="t" ?grid[x][y]+ infRange18: "t";
			}
		}
	},
	

	// ## Serialization ############################################################################
	__constructorArgs__: function __constructorArgs__() {
		var terrain = this;
		return this.world.bodies.filter(function (body) {
			return body.team === "Terrain";
		}).map(function (body) {
			var shape = body.shapes[0];
			switch (shape.type){
				case p2.Shape.CIRCLE: 
					return { type: shape.type, 
						radius: shape.radius, x: body.position[0], y: body.position[1]
					};
				case p2.Shape.CONVEX: //FIXME Which one is it?
					return { type: p2.Shape.BOX,
						x: body.position[0], y: body.position[1],
						width: shape.width, height: shape.height
					};
				case p2.Shape.BOX:
					break;
				default:
					throw new Error("Unsupported shape type "+ shape.type +"!");
			}
		});
	},

	
	
	'static __SERMAT__': {
		serializer: function serialize_Terrain(obj) {
			return [obj.__constructorArgs__()];
		}
	}
}); // declare Terrain

