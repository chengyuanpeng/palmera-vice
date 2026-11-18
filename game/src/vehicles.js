import { CARS, POLICE, HEAT } from './config.js';
import { createRandom, range, int, pick, chance } from './random.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function randomFor(state){if(!state.rng)state.rng=createRandom(state.seed||1);return state.rng;}

export function createCar(city,rng,kind='traffic',opts={}) {
  const model=opts.model||(kind==='police'?'police':pick(rng,['sedan','sedan','cabrio','sport','truck']));
  const spec=CARS[model], p=opts.x!=null?{x:opts.x,y:opts.y}:kind==='parked'?city.roadPoint(rng,city.width/2,city.height/2,0,1800):city.roadPoint(rng,opts.nearX??1800,opts.nearY??1300,opts.minD??700,opts.maxD??1100);
  const onVertical=city.avenues.some(x=>Math.abs(x-p.x)<city.roadHalf);
  const angle=opts.angle??(onVertical?(chance(rng,.5)?Math.PI/2:-Math.PI/2):(chance(rng,.5)?0:Math.PI));
  const locked=kind==='parked'&&chance(rng,model==='sport'||model==='cabrio'?.75:.35);
  return {id:opts.id??`car-${int(rng,1,1e9)}`,kind,model,x:p.x,y:p.y,angle,speed:0,steer:0,length:spec.length,width:spec.width,color:kind==='police'?'#f2f4f1':pick(rng,spec.colorPool),accent:kind==='police'?'#29b9b1':null,health:spec.health,maxHealth:spec.health,driver:kind==='traffic'?'traffic':kind==='police'?'police':null,targetLane:0,honkCd:0,dead:false,alarm:locked,locked,missionId:null,vx:0,vy:0,aiTimer:range(rng,1,4),turnRng:rng,blockTime:0,stuckTime:0,stolenCounted:false,smokeTimer:0};
}

function crash(state,x,y,intensity){state.events.push({type:'crash',x,y,intensity});}
export function stepCarPhysics(car,control,dt,city,state=null){
  if(car.dead){car.speed*=Math.exp(-5*dt);return;}
  const s=CARS[car.model], throttle=clamp(control.throttle||0,-1,1), steer=clamp(control.steer||0,-1,1), hb=!!control.handbrake;
  const oldSpeed=car.speed; car.speed+=s.accel*throttle*dt;
  car.speed*=Math.max(0,1-(.38+(Math.abs(car.speed)<8?1.2:0))*dt);
  car.speed=clamp(car.speed,-s.reverseSpeed,s.maxSpeed);
  if(Math.sign(oldSpeed)!==Math.sign(car.speed)&&Math.abs(car.speed)<5)car.speed=0;
  car.steer=steer; const speedFactor=.22+.78*Math.min(1,Math.abs(car.speed)/105);
  car.angle=wrap(car.angle+steer*speedFactor*(car.speed<0?-1:1)*dt*(1.8-Math.min(.8,Math.abs(car.speed)/650)));
  const fx=Math.cos(car.angle),fy=Math.sin(car.angle),sideX=-fy,sideY=fx;
  let vx=car.vx??fx*car.speed,vy=car.vy??fy*car.speed;
  const forward=vx*fx+vy*fy, lateral=vx*sideX+vy*sideY;
  const grip=s.grip*(hb?.19:1); vx=fx*forward+sideX*lateral*Math.exp(-grip*dt);vy=fy*forward+sideY*lateral*Math.exp(-grip*dt);
  vx+=fx*(car.speed-forward)*Math.min(1,dt*8);vy+=fy*(car.speed-forward)*Math.min(1,dt*8);
  let nx=car.x+vx*dt,ny=car.y+vy*dt,hit=city.collideCircle(nx,ny,car.length*.36);
  if(hit.hit){nx=hit.x;ny=hit.y;car.speed*=-.25;vx*= -.25;vy*= -.25;if(state)crash(state,nx,ny,Math.min(1.5,Math.abs(oldSpeed)/180));car.health-=Math.max(2,Math.abs(oldSpeed)*.045);}
  car.x=nx;car.y=ny;car.vx=vx;car.vy=vy;
  if(car.health<=0&&!car.dead){car.dead=true;car.speed=0;car.driver=null;if(state){car.smokeTimer=0;state.events.push({type:'carDestroyed',x:car.x,y:car.y});}}
  if(state&&Math.abs(car.speed)>35)for(const other of state.cars){if(other===car||other.dead)continue;const d=dist(car,other),r=(car.length+other.length)*.36;if(d<r){const nx=(car.x-other.x)/(d||1),ny=(car.y-other.y)/(d||1),impact=Math.abs(car.speed-(other.speed||0));car.x+=nx*(r-d)*.55;car.y+=ny*(r-d)*.55;other.x-=nx*(r-d)*.45;other.y-=ny*(r-d)*.45;car.speed*=.72;other.speed=(other.speed||0)*.75+car.speed*.12;car.health-=impact*.035;other.health-=impact*.035;crash(state,car.x,car.y,Math.min(1.5,impact/180));}}
  if(state&&car.dead){car.smokeTimer=(car.smokeTimer||0)+dt;if(car.smokeTimer>.12){car.smokeTimer=0;state.particles.push({x:car.x,y:car.y,vx:range(car.turnRng,-10,10),vy:-24,life:1.1,maxLife:1.1,size:5,color:'#686b68',kind:'smoke'});}}
}

function refreshWanted(state){const old=state.wanted;state.wanted=clamp(Math.floor(state.heat),0,5);if(state.wanted>old)state.events.push({type:'wantedUp',level:state.wanted});}
export function addHeat(state,points,x=state.player.x,y=state.player.y){state.heat=clamp(state.heat+points,0,5.6);refreshWanted(state);if(points>0)state.events.push({type:'heat',x,y});}
export function updateHeat(state,dt){if(state.wanted&&state.unseenTime>POLICE.sightLoseTime){const before=state.wanted;state.heat=Math.max(0,state.heat-HEAT.decayPerSecond*dt);refreshWanted(state);if(state.wanted<before)state.events.push({type:'wantedDown',level:state.wanted});}}

function spawnTraffic(state){const p=state.player,rng=randomFor(state);const c=createCar(state.city,rng,'traffic',{nearX:p.x,nearY:p.y,minD:700,maxD:1100});c.targetLane=rng()<.5?-1:1;c.driver='traffic';state.cars.push(c);}
export function updateTraffic(state,dt){const player=state.player;for(const c of state.cars){if(c.kind!=='traffic'||c.dead)continue;
  if(dist(c,player)>1400){state.cars.splice(state.cars.indexOf(c),1);continue;}
  const vertical=state.city.avenues.some(x=>Math.abs(x-c.x)<state.city.roadHalf);
  const verticalDir=Math.sin(c.angle)>=0?Math.PI/2:-Math.PI/2,horizontalDir=Math.cos(c.angle)>=0?0:Math.PI;
  let targetAngle=vertical?verticalDir:horizontalDir;
  const intersection=vertical?state.city.streets.some(y=>Math.abs(y-c.y)<18):state.city.avenues.some(x=>Math.abs(x-c.x)<18);
  c.aiTimer-=dt;if(intersection&&c.aiTimer<=0){c.aiTimer=range(c.turnRng,2,5);if(chance(c.turnRng,.22))targetAngle=vertical?(chance(c.turnRng,.5)?0:Math.PI):(chance(c.turnRng,.5)?Math.PI/2:-Math.PI/2);}
  const offset=23*c.targetLane;
  const laneX=vertical?state.city.avenues.reduce((a,b)=>Math.abs(b-c.x)<Math.abs(a-c.x)?b:a, state.city.avenues[0])-Math.sin(targetAngle)*offset:c.x;
  const laneY=!vertical?state.city.streets.reduce((a,b)=>Math.abs(b-c.y)<Math.abs(a-c.y)?b:a, state.city.streets[0])+Math.cos(targetAngle)*offset:c.y;
  const laneError=vertical?(laneX-c.x)*-Math.sin(targetAngle):(laneY-c.y)*Math.cos(targetAngle);
  let steer=clamp(wrap(targetAngle-c.angle)*1.8+clamp(laneError*.025,-.35,.35),-1,1);const targetSpeed=CARS[c.model].maxSpeed*.42;
  let blocked=false;for(const o of state.cars){if(o===c||o.dead)continue;const dx=o.x-c.x,dy=o.y-c.y,forward=dx*Math.cos(c.angle)+dy*Math.sin(c.angle),side=Math.abs(-dx*Math.sin(c.angle)+dy*Math.cos(c.angle));if(forward>0&&forward<95&&side<28){blocked=true;break;}}
  const foot=!player.inCar&&Math.hypot(player.x-c.x,player.y-c.y)<70&&Math.cos(c.angle)*(player.x-c.x)+Math.sin(c.angle)*(player.y-c.y)>0;
  c.blockTime=blocked||foot?c.blockTime+dt:0;if(c.blockTime>1.5&&c.honkCd<=0){state.events.push({type:'honk',x:c.x,y:c.y});c.honkCd=2;}c.honkCd=Math.max(0,c.honkCd-dt);
  stepCarPhysics(c,{throttle:blocked||foot?-0.65:clamp((targetSpeed-c.speed)/90,-1,1),steer,handbrake:false},dt,state.city,state);
  if(Math.abs(c.speed)<2)c.speed=blocked||foot?0:targetSpeed*.25;
 }
 while(state.cars.filter(c=>c.kind==='traffic'&&!c.dead).length<12)spawnTraffic(state);
}

export function updatePolice(state,dt){const rng=randomFor(state),target=state.player.inCar||state.player;const cops=state.cars.filter(c=>c.kind==='police');const count=POLICE.maxCarsByStars[state.wanted]||0;
  for(let i=cops.length-1;i>=0;i--){const c=cops[i];if(c.dead){const p=state.city.roadPoint(rng,target.x,target.y,650,950);Object.assign(c,{x:p.x,y:p.y,health:c.maxHealth,dead:false,speed:0,vx:0,vy:0,stuckTime:0});}}
  while(state.wanted>0&&state.cars.filter(c=>c.kind==='police'&&!c.dead).length<count){state.cars.push(createCar(state.city,rng,'police',{nearX:target.x,nearY:target.y,minD:650,maxD:950}));}
  let seen=false,near=false;for(const c of state.cars){if(c.kind!=='police'||c.dead)continue;const d=dist(c,target);if(d<520&&state.city.isRoad(c.x,c.y)===state.city.isRoad(target.x,target.y))seen=true;if(d<POLICE.bustRadius)near=true;
    const stopping=!state.player.inCar&&d<50;const aim=stopping?c: {x:target.x+(target.vx||Math.cos(target.angle||0)*0)*.3,y:target.y+(target.vy||0)*.3};const desired=ang(c,aim);const steer=clamp(wrap(desired-c.angle)*1.5,-1,1);stepCarPhysics(c,{throttle:stopping?-.8:clamp((CARS.police.maxSpeed*POLICE.chaseSpeedFactor-c.speed)/110,-1,1),steer,handbrake:false},dt,state.city,state);
    c.stuckTime=Math.abs(c.speed)<3&&d>90?c.stuckTime+dt:0;if(c.stuckTime>3){const p=state.city.roadPoint(state.rng,target.x,target.y,650,950);c.x=p.x;c.y=p.y;c.speed=0;c.stuckTime=0;}
  }
  state.policeSeenPlayer=seen;state.unseenTime=seen?0:(state.unseenTime||0)+dt;
  const slow=!state.player.inCar||Math.abs(state.player.inCar.speed)<40;if(near&&slow)state.bustMeter=clamp(state.bustMeter+dt/POLICE.bustFillTime,0,1);else state.bustMeter=Math.max(0,state.bustMeter-dt*2);
  if(state.bustMeter>=1&&!state._bustedEvent){state.events.push({type:'busted'});state._bustedEvent=true;}
}

export function enterExitCar(state){const p=state.player;if(p.inCar){const c=p.inCar;let spot=null;for(const side of [-1,1]){const x=c.x+Math.cos(c.angle+Math.PI/2*side)*(c.width/2+18),y=c.y+Math.sin(c.angle+Math.PI/2*side)*(c.width/2+18),q=state.city.collideCircle(x,y,p.radius);if(!q.hit){spot={x:q.x,y:q.y};break;}}if(spot){p.x=spot.x;p.y=spot.y;}p.inCar=null;c.driver=null;state.events.push({type:'exitCar',x:p.x,y:p.y});return true;}
  const c=state.cars.filter(v=>!v.dead&&dist(v,p)<76).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(!c)return false;
  p.inCar=c;c.driver='player';p.x=c.x;p.y=c.y;if((c.kind==='parked'||c.kind==='traffic')&&!c.stolenCounted){c.stolenCounted=true;state.stats.carsStolen++;addHeat(state,HEAT.steal,c.x,c.y);}if(c.alarm){state.events.push({type:'alarm',x:c.x,y:c.y});addHeat(state,.5,c.x,c.y);c.alarm=false;}
  for(const ped of state.peds)if(dist(c,ped)<120)ped.state='flee';state.events.push({type:'carjack',x:c.x,y:c.y});return true;
}
