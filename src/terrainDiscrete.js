/**
 *
 * var LW = ludorum_wargame,
   game1 = LW.test.example1(),
   moves1 = game1.moves().Red,
   game2 = game1.next({ Red: moves1[0] }),
	asd  = new LW.TerrainDiscrete(),grid= asd.trueClearanceMetric();RENDERER.renderGrid(grid);

asd  = new LW.TerrainDiscrete(); asd.areaOfSight({x:20,y:10},12)

 */

var TerrainDiscrete = exports.TerrainDiscrete = declare({
    /*
	SURROUNDINGS: Iterable.product([-1,0,+1], [-1,0,+1]).filterApply(function (dx, dy) {
			return dx || dy;
		}, function (dx, dy) {
			return { dx: dx, dy: dy, cost: Math.sqrt(dx*dx + dy*dy) };
		}).toArray(),
	*/

    SURROUNDINGS: [
        {dx:-1,dy:-1,cost:1.4142135623730951},
        {dx:-1,dy:0,cost:1},
        {dx:-1,dy:1,cost:1.4142135623730951},
        {dx:0,dy:-1,cost:1},
        {dx:0,dy:1,cost:1},
        {dx:1,dy:-1,cost:1.4142135623730951},
        {dx:1,dy:0,cost:1},
        {dx:1,dy:1,cost:1.4142135623730951}],
    /**
    Terrain is a discrete representation of the map with out units. in the form [x][y]
     */
 terrainAux:function terrainAux(){
    var t=this.t;
    return [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,t,0,0,0,0,0,0,0,0,t,t,t,t,t,t,t,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [t,t,t,t,t,t,0,0,0,0,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [t,t,t,t,t,t,0,0,0,0,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [t,0,0,0,0,0,0,0,0,0,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [t,0,0,0,0,0,0,0,0,t,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [t,0,0,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [t,0,0,t,t,0,0,0,0,t,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,t,0,0,0,0,0,0,0,0,t,t,t,t,t,t,t,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [t,t,t,t,t,t,0,0,0,0,t,t,t,t,t,t,t,t,t,t,t,0,0,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]];
    },

	constructor: function TerrainDiscrete() {
        this.t="t";
        this.noview="v";
        this.noPass="-";
        this.graphed=false;
        this.terrain= this.terrainAux();
        this.trueClarenceMaps={};
		this.WorldWidth  =48 ; //x
		this.WorldHeight =48 ; //y
		this.squareSize=1  ;
		this.matrix=[];
        this.matrixNxN=[];
		this.wi = Math.floor(this.WorldWidth/(this.squareSize));//x
        this.he = Math.floor(this.WorldHeight/(this.squareSize));//y
        this.CacheSight={};
        this.CachePreCalc={};
        this.CacheRechablePositions={};
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

	},
    resetTerrain: function resetTerrain(wargame){
        this.terrain= this.terrainAux();
        this.loadUnitsBut(wargame,this.terrain);
        this.trueClarenceMaps={};
        this.CacheSight={};
        this.CacheRechablePositions={};
        this.graphed=false;
    },
    loadUnitsBut: function loadUnitsBut(wargame,terrain,externalUnit){
		var armies = wargame.armies;
		for (var team in armies) {
			armies[team].units.forEach(function (unit) {

				if (!unit.isDead() && !(externalUnit && externalUnit.id===unit.id)){
                    terrain[unit.position[0]][unit.position[1]]=unit;
				}
			});
		}
    },

	canSee: function canSee(fromUnit, toUnit) {
		return this.lineOfSight(fromUnit.position, toUnit.position);
	},
    inBounds: function inBounds(spot){
        return !( spot.x < 0 || spot.x >= this.wi || spot.y < 0 || spot.y >= this.he);
    },
    bresenham: function bresenham(point1, point2,maxRuns){
        var targetInPath = 0,
            spotsMark = [],
            dx = Math.abs(point2.x-point1.x),
            dy = Math.abs(point2.y-point1.y),
            sx = (point1.x < point2.x) ? 1 : -1,
            sy = (point1.y < point2.y) ? 1 : -1,
            curLoc = {'x':point1.x,'y':point1.y},
            err = dx - dy,e2;
        maxRuns = maxRuns ||1000;
        while(maxRuns--){
            spotsMark.push({'x':curLoc.x,'y':curLoc.y});
            if( curLoc.x == point2.x && curLoc.y == point2.y ) break;
            e2 = err << 1;
            if(e2 >-dy) { err -= dy; curLoc.x += sx; }
            if(e2 < dx) { err += dx; curLoc.y += sy; }
        }
    	return spotsMark;
    },
    getDistance:function getDistance(point1,point2) {
        point1=point1.x!==undefined ? point1 : {x:point1[0],y:point1[1]};
        point2=point2.x!==undefined ? point2 : {x:point2[0],y:point2[1]};
        return Math.sqrt(((point1.x - point2.x) * (point1.x - point2.x))+
                         ((point1.y - point2.y) * (point1.y - point2.y))
                        );
    },
	lineOfSight: function lineOfSight(point1, point2) {
        var bres= this.bresenham(point1,point2);
    	return this.getDistance(point1,point2)===this.getDistance(point1,bres[bres.length-1]);
	},
    calculate: function calculate(radius) {
        if (this.CachePreCalc[radius]!==undefined){
            return this.CachePreCalc[radius];
        }

        var origin = { x: 0, y: 0 },
            preCalc = [],
            minCoord = origin.x - radius,
	        maxCoord = origin.y + radius,
            path,
            i,x,y;
        for(x = minCoord; x <= maxCoord; x++ ) {
            path = this.bresenham( origin, { x: x, y: minCoord } );
            for(i = 0; i < path.length; i++){
                path[i].distance = this.getDistance(origin,{x: path[i].x, y: path[i].y});
            }
            preCalc.push(path);

            path = this.bresenham( origin, { x: x, y: maxCoord } );
            for(i = 0; i < path.length; i++){
                path[i].distance = this.getDistance(origin,{x: path[i].x, y: path[i].y});
            }
            preCalc.push(path);
        }

        for(y = minCoord + 1; y < maxCoord; y++ ) { //we already checked the top-most and bottom-most
            path = this.bresenham( origin, { x: minCoord, y: y } );
            for(  i = 0; i < path.length; i++){
                path[i].distance = this.getDistance(origin,{x: path[i].x, y: path[i].y});
            }
            preCalc.push(path);

            path = this.bresenham( origin, { x: maxCoord, y: y } );
            for(  i = 0; i < path.length; i++){
                path[i].distance = this.getDistance(origin,{x: path[i].x, y: path[i].y});
            }
            preCalc.push(path);
        }
        this.CachePreCalc[radius]=preCalc;
        return preCalc;
    },
    areaOfSight :function areaOfSight(character, sightRadius,wargame ){
        var characterSpot=character.position;

        if (this.CacheSight[characterSpot+"-"+sightRadius]!==undefined){
            return this.CacheSight[characterSpot+"-"+sightRadius];
        }
        var radius = Math.max(this.wi,this.he) >> 1,
            map = this.terrainAux(),
            isVisible,
            area={},
            x,y,i,
            preCalc=this.calculate(24);
        this.loadUnitsBut(wargame,map);


     	map[characterSpot[0]][characterSpot[1]] ={'visible': false, 'tile':'@'};
        for(  i = 0; i <  preCalc.length; i++ ) {
            isVisible = true;
            for( var j = 0; j <  preCalc[i].length; j++ ) {
                var curTile =  preCalc[i][j];
                var mapSpot = { x: characterSpot[0] + curTile.x, y: characterSpot[1] + curTile.y };
                if( this.inBounds(mapSpot,map)) { //is a valid spot
                    if (map[mapSpot.x][mapSpot.y].visible === undefined ){
                       map[mapSpot.x][mapSpot.y]= {'visible': false, 'tile': map[mapSpot.x][mapSpot.y] };
                    }
                    if( curTile.distance > sightRadius ) {
                        isVisible = false;
                    }
                    if( isVisible ) {

                        area[[mapSpot.x,mapSpot.y]]=true;
                        map[mapSpot.x][mapSpot.y].visible = isVisible;
                    }

                    if( map[mapSpot.x][mapSpot.y].tile == 't' ||
                        (map[mapSpot.x][mapSpot.y].tile.id!==undefined && map[mapSpot.x][mapSpot.y].tile.id!==character.id)   ) {
                        isVisible = false;
                    }
                } else { //not inside the map... don't worry about this location
                    j =  preCalc[i].length;
                }
            }
        }

       // this.logMap(map);
        this.CacheSight[characterSpot+"-"+sightRadius]=[area];
        RENDERER.renderGridSight(area);
        return [area];
        },


    canShoot:function canShoot(shooterUnit, targetUnit, range,wargame){
        var areaOfSight,
            ret=Infinity,
            distance=this.getDistance(shooterUnit.position,targetUnit.position);
        if (shooterUnit.army !== targetUnit.army && distance<= shooterUnit.maxRange()){
            areaOfSight=this.areaOfSight(shooterUnit, range ,wargame)[0];
            if (areaOfSight[targetUnit.position]){
                ret= distance;
            }
        }
        return ret;
    },


	reachablePositionsBad: function reachablePositionsBad(unit, maxTravelDistance,wargame,args) {
		maxTravelDistance = maxTravelDistance || 12;
		var terrain = this,
            visited = {},
            unitPosition=unit.position,
			toExplore = [unitPosition],
			width = this.WorldWidth,
            height = this.WorldHeight,
            unitSize=args.unitSize || 1,
            calctrueClearanceMetric= unitSize!==1 ? this.trueClearanceMetric(unit,wargame):false,
			step = args.Step || 1, //FIXME
            pos, pos2,i,surr,surrStep,graph,
            upperLeft = [Math.max(unit.position[0] -maxTravelDistance, 0)    ,Math.max(unit.position[1] -maxTravelDistance, 0)],
            lowerRight= [Math.min(unit.position[0] +maxTravelDistance,width),Math.min(unit.position[1] +maxTravelDistance, height)];



            if (this.CacheRechablePositions[unit.position+"-"+maxTravelDistance]!== undefined){
                return this.CacheRechablePositions[unit.position+"-"+maxTravelDistance];
            }

            if (this.graphed===false){
                graph=new ludorum_wargame.Graph(terrain.terrain);
            }else{
                graph=this.graphed;

            }


        var x,y,end,result,
    	    start = graph.grid[unit.position[0]][unit.position[1]];

        for(x = upperLeft[0]; x < lowerRight[0];x ++ ) {
            for(y = upperLeft[1]; y < lowerRight[1]; y++ ) {

                if (typeof visited[[x,y]] === 'undefined'){
                    if (terrain.terrain[x][y]===0  ){
                        end= graph.grid[x][y];
                    result = graph.astar.search(graph, start, end);
                    if(result.length!==0){
                        for(i = 0;i < result.length;i ++ ) {
                          visited[[result[i].x,result[i].y]]=i;
                        }
                    }
                }
               }
            }
        }

			//unitPosition = new Float32Array(unitPosition);

        this.CacheRechablePositions[unit.position+"-"+maxTravelDistance]=visited;
		return visited;
	},

	/** Returns all reachable positions of the given unit.
	*/
	//TODO Take the position and not the unit.
	//TODO Take step as argument.
	reachablePositions: function reachablePositions(unit, maxTravelDistance,wargame,args) {
		maxTravelDistance = maxTravelDistance || 12;
		var terrain = this,
            visited = {},
            unitPosition=unit.position,
			toExplore = [unitPosition],
			width = this.WorldWidth,
            height = this.WorldHeight,
            unitSize=args.unitSize || 1,
            calctrueClearanceMetric= unitSize!==1 ? this.trueClearanceMetric(unit,wargame):false,
			step = args.Step ||1, //FIXME
            pos, pos2,i,surr,surrStep;
		visited[unitPosition] = 0;
        if (this.CacheRechablePositions[unit.position+"-"+maxTravelDistance]!== undefined){
            return this.CacheRechablePositions[unit.position+"-"+maxTravelDistance];
        }

		while (toExplore.length > 0) {
			pos = toExplore.shift();

            for (i = 0; i < this.SURROUNDINGS.length; i++) {
                surr=this.SURROUNDINGS[i];
                surrStep= visited[pos] + surr.cost * step;
                pos2 = [pos[0] + surr.dx * step, pos[1] + surr.dy * step];
				if (
                    surrStep < maxTravelDistance &&
                    pos2[0] >= 0 && pos2[1] >= 0 &&
                    pos2[0] < width && pos[1] < height &&
                   (typeof   visited[pos2] === 'undefined')
                  ) {

                    if  (calctrueClearanceMetric!==false && calctrueClearanceMetric[pos2[0]][pos2[1]]>=unitSize){
                        visited[pos2] =surrStep;
                        toExplore.push(pos2);
                    }else if (terrain.terrain[pos2[0]][pos2[1]]===0){
                        visited[pos2] =surrStep;
                        toExplore.push(pos2);
                    }


				}
			}
		}
        this.CacheRechablePositions[unit.position+"-"+maxTravelDistance]=visited;
		return visited;
	},
	terrainGrid: function terrainGrid(){
		return this.terrain;
    },


    trueClearanceMetric: function trueClearanceMetric(currentUnit,wargame){
        if (this.trueClarenceMaps[currentUnit.id]!==undefined){
            return this.trueClarenceMaps[currentUnit.id];
        }

        var grid = this.terrainAux(),
            x=0,
            y=0;
        this.loadUnitsBut(wargame,grid,currentUnit);
        for (y = 0; y < grid[0].length ; y++) {
            for (x = 0; x < grid.length; x++) {

                if (grid[x][y]===0){
                    this.trueCMPosition(x,y,grid);
                }
            }
        }
        this.trueClarenceMaps[currentUnit.id]=grid;
        return grid;
    },
    trueCMPosition: function trueCMPosition(posx,posy,grid){
        var size=1,
            i,
            gridX=grid.length,
            gridY=grid[0].length;

            stop:for (size=1; size < gridX;size++) {
                for (i=0; i != size;i++) {
                    if (size+posx>=gridX ||size+posy>=gridY || i+posy>=gridY || i+posx>=gridX){
                        break stop;
                    }else if (grid[size+posx][i+posy]!==0|| grid[i+posx][size+posy]!==0 || grid[size+posx][size+posy]!==0 ) {

                        break stop;
                    }
                }
            }
        grid[posx][posy]=size;
    },
    logMap:function logMap(losMap){

        var output = '',
            map=Sermat.clone(losMap),
            x,y;

        for(y = 0; y < map[0].length; y++ ) {
            for(x = 0; x < map.length; x++ ) {
                if (map[x][y].visible === undefined ){
                       map[x][y]= {'visible': false, 'tile': map[x][y] };
                }
                output += ( map[x][y].visible ? map[x][y].tile : '&nbsp;');
            }
            output += "<br>";
        }
        console.log(output);


    },



	'static __SERMAT__': {
		serializer: function serialize_TerrainDiscrete(obj) {
			return [ ];
		}
	}
}); // declare Terrain

//var inf= new LW.InfluenceMap(game2,"Red")

var InfluenceMap = exports.InfluenceMap = declare({
	momentum: 0.67,
	decay: 0.21,
	iterations: 5,

	constructor: function InfluenceMap(game, role){
		this.grid = game.terrain.terrainGrid();
		this.role = role;
    },

	update: function update(game) {
		var influenceMap = this,
			grid = this.grid,
			pos;
		this.unitsInfluences(game);
		for (var i = 0; i < this.iterations; i++) {
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
			sign = army === this.role ? +1 : -1;
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
					grid[posX][posY] = imap.influence(unit) * sign;
				}
			});
		}
	},

	influence: function influence(unit) {
		return unit.worth(); //FIXME Too simple?
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
			inf;

		for (var r= 0; r <grid.length; r++) {
			for (var c = 0; c < grid[r].length;c++) {
				value=grid[r][c];
				if (!isNaN(value)) {
					inf = this.getMomentumInf(grid,r,c,decays);
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  value * (1 - momentum) + inf * momentum;
				}else{
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  "t";
				}
			}
		}
		//console.log(Date.now()- start);
		return oneGrid;

    },


}); // declare InfluenceMap
