import { WORLD, PALETTE } from './config.js';
import { createRandom, range, int, pick, chance } from './random.js';

export function buildCity(seed) {
  const rng = createRandom(seed);
  const avenues = [320,760,1200,1640,2080,2520,2960,3340];
  const streets = [300,640,980,1320,1660,2000];
  const roadHalf = 46, sidewalk = 14, buildings = [], colliders = [], lots = [], trees = [], lamps = [];
  const signNames = ['HOTEL SOLANA','CAFE MAREA','PALMERA ARMS','SUNSET CUSTOMS','BAR LUNA','MOTEL CORAL','DINER AZUL','CLUB FARO','TACOS REY','HOTEL BRISA'];
  const blocksX = [[0, avenues[0]], ...avenues.slice(0,-1).map((x,i)=>[x,avenues[i+1]]), [avenues.at(-1),WORLD.width]];
  const blocksY = [[0,streets[0]], ...streets.slice(0,-1).map((y,i)=>[y,streets[i+1]]), [streets.at(-1),WORLD.beachY]];
  const plaza = { x: 1245, y: 1015, w: 350, h: 250 };
  for (let by=0; by<blocksY.length; by++) for(let bx=0; bx<blocksX.length; bx++) {
    const [x0,x1]=blocksX[bx], [y0,y1]=blocksY[by];
    const area={x:x0+roadHalf+sidewalk,y:y0+roadHalf+sidewalk,w:x1-x0-2*(roadHalf+sidewalk),h:y1-y0-2*(roadHalf+sidewalk)};
    if(area.w<100 || area.h<90) continue;
    if ((bx===4&&by===3) || chance(rng,0.09)) { lots.push(area); continue; }
    if (bx===2&&by===3) { lots.push(plaza); continue; }
    const count=int(rng,2,6);
    for(let i=0;i<count;i++) {
      const w=Math.min(range(rng,90,190),area.w-8), h=Math.min(range(rng,80,170),area.h-8);
      const b={x:range(rng,area.x,area.x+Math.max(0,area.w-w)),y:range(rng,area.y,area.y+Math.max(0,area.h-h)),w,h,floors:int(rng,2,9),color:pick(rng,PALETTE.buildings),roof:pick(rng,PALETTE.roofs),sign:chance(rng,0.22)?pick(rng,PALETTE.neon):null};
      b.height=b.floors*13; if(b.sign) b.signText=pick(rng,signNames);
      buildings.push(b); colliders.push({x:b.x,y:b.y,w:b.w,h:b.h});
    }
  }
  // Signature terminal and compound structures.
  const terminal={x:2525,y:150,w:180,h:92,floors:2,height:26,color:'#e9d4ae',roof:'#426e70',sign:PALETTE.neon[1],signText:'PALMERA AIR'};
  buildings.push(terminal); colliders.push({x:terminal.x,y:terminal.y,w:terminal.w,h:terminal.h});
  const compound={x:3170,y:70,w:300,h:270,floors:3,height:39,color:'#c8757e',roof:'#8c6876',sign:PALETTE.neon[0],signText:'CLUB FARO'};
  buildings.push(compound); colliders.push({x:compound.x,y:compound.y,w:compound.w,h:compound.h});
  const pois={
    garage:{x:760,y:1370,label:'Sol Vega Garage'},safehouse:{x:850,y:1410,label:'Safehouse'},
    policeStation:{x:2080,y:1020,label:'Palmera Police'},gunStore:{x:1640,y:680,label:'Palmera Arms'},
    sprayShop:{x:1200,y:340,label:'Sunset Customs'},airport:{x:2810,y:150,label:'Palmera Airfield'},
    docks:{x:2960,y:2290,label:'Docks'},warehouse:{x:2780,y:2160,label:'Warehouse'},marina:{x:600,y:2200,label:'Marina'},
    compound:{x:3320,y:300,label:'El Faro Compound'},foodStands:[{x:320,y:640},{x:1200,y:980},{x:1640,y:1320},{x:2520,y:1660},{x:2960,y:980}],
    runway:{x:2400,y:95,w:1000,h:42}, pier:{x:2860,y:2160,w:200,h:280}, boardwalk:{x:300,y:2172,w:600,h:48}, lots, plaza,
  };
  // Seeded palms along the beach and sidewalk margins; reject road and building overlaps.
  for(let i=0;i<140;i++) {
    let x,y,tries=0;
    do { x=range(rng,50,3550); y=i<70?range(rng,35,2140):range(rng,2185,2365); tries++; }
    while(tries<40 && (isRoadLocal(x,y)||colliders.some(c=>x>=c.x-20&&x<=c.x+c.w+20&&y>=c.y-20&&y<=c.y+c.h+20)||[pois.pier,pois.boardwalk].some(q=>x>=q.x-18&&x<=q.x+q.w+18&&y>=q.y-18&&y<=q.y+q.h+18)));
    trees.push({x,y,phase:rng()*Math.PI*2});
  }
  for(const x of avenues) for(let y=100;y<2140;y+=220) lamps.push({x:x+(x<1800?-63:63),y});
  for(const y of streets) for(let x=110;x<3500;x+=330) lamps.push({x,y:y-63});
  const packages=[];
  const packagePlaces=[[470,465],[990,480],[1460,470],[1900,470],[2320,470],[2780,470],[530,810],[1000,820],[1480,820],[1900,820],[2350,820],[2780,820],[500,1510],[1050,1510],[1460,1510],[1900,1840],[2380,1840],[2640,2260],[2960,2320],[3300,285]];
  packagePlaces.forEach(([x,y],id)=>packages.push({id,x,y}));
  function isRoadLocal(x,y) { return y<WORLD.beachY && (avenues.some(a=>Math.abs(x-a)<=roadHalf)||streets.some(s=>Math.abs(y-s)<=roadHalf)); }
  function isRoad(x,y){return isRoadLocal(x,y);}
  function isSidewalk(x,y){return y<WORLD.beachY && !isRoad(x,y) && (avenues.some(a=>Math.abs(x-a)<=roadHalf+sidewalk)||streets.some(s=>Math.abs(y-s)<=roadHalf+sidewalk));}
  function isBeach(x,y){return y>=WORLD.beachY&&y<=WORLD.waterY;}
  function onPier(x,y){return x>=2860&&x<=3060&&y>=2160&&y<=2400;}
  function isWater(x,y){return y>WORLD.waterY&&!onPier(x,y);}
  function collideCircle(px,py,r){let x=Math.max(r,Math.min(WORLD.width-r,px)),y=Math.max(r,Math.min(WORLD.height-r,py)),hit=x!==px||y!==py;
    for(const c of colliders){const qx=Math.max(c.x,Math.min(x,c.x+c.w)),qy=Math.max(c.y,Math.min(y,c.y+c.h)),dx=x-qx,dy=y-qy,d=Math.hypot(dx,dy);if(d<r){if(d===0){const edges=[[Math.abs(x-c.x),-1,0],[Math.abs(c.x+c.w-x),1,0],[Math.abs(y-c.y),0,-1],[Math.abs(c.y+c.h-y),0,1]].sort((a,b)=>a[0]-b[0]);x+=edges[0][1]*(r+edges[0][0]+.01);y+=edges[0][2]*(r+edges[0][0]+.01);}else{const push=r-d+.01;x+=dx/d*push;y+=dy/d*push;}hit=true;}}
    if(isWater(x,y)){y=WORLD.waterY-r;hit=true;} return {x,y,hit}; }
  for(const pkg of packages){for(let i=0;i<colliders.length;i++){const q=collideCircle(pkg.x,pkg.y,10);pkg.x=q.x;pkg.y=q.y;if(!q.hit)break;}}
  function roadPoint(random,nearX,nearY,minD,maxD){for(let i=0;i<3000;i++){const vertical=random()<0.5,a=vertical?pick(random,avenues):pick(random,streets),x=vertical?range(random,a-roadHalf+8,a+roadHalf-8):range(random,0,WORLD.width),y=vertical?range(random,0,WORLD.beachY):range(random,a-roadHalf+8,a+roadHalf-8),d=Math.hypot(x-nearX,y-nearY);if(isRoad(x,y)&&d>=minD&&d<=maxD)return{x,y};}return{x:avenues[0],y:streets[0]};}
  function lanePoint(random,nearX,nearY,minD=0,maxD=600){return roadPoint(random,nearX,nearY,minD,maxD);}
  return {width:WORLD.width,height:WORLD.height,seed,avenues,streets,roadHalf,sidewalk,buildings,trees,lamps,pois,packages,colliders,lots,beachY:WORLD.beachY,waterY:WORLD.waterY,isRoad,isSidewalk,isBeach,isWater,collideCircle,roadPoint,lanePoint};
}
