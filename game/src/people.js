import { PLAYER, WEAPONS, POLICE, HEAT, ECONOMY } from './config.js';
import { createRandom, range, int, pick, chance } from './random.js';
import { enterExitCar, addHeat } from './vehicles.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const shirts=['#d75d68','#e4a747','#438d91','#586bb0','#84a45d','#d4d0bd','#ab6da0'];
const skins=['#f1c79e','#d99c70','#9a6248','#eddbbd','#6d463a'];
function rngFor(state){if(!state.rng)state.rng=createRandom(state.seed||1);return state.rng;}
function newPed(state,x,y,faction='civilian',name){const rng=rngFor(state);return{x,y,angle:range(rng,0,Math.PI*2),speed:range(rng,40,70),state:'walk',health:100,color:pick(rng,skins),shirtColor:pick(rng,shirts),homeX:x,homeY:y,targetX:x,targetY:y,panic:0,weapon:null,faction,name,walkTimer:0,attackCd:range(rng,.3,1.2),strafe:chance(rng,.5)?-1:1};}
export function createSol(state){if(state._sol)return state._sol;const q=state.city.pois.garage;const sol=newPed(state,q.x+22,q.y+12,'sol','Sol Vega');sol.state='stand';sol.speed=0;state.peds.push(sol);state._sol=sol;return sol;}
export function spawnPeds(state){const rng=rngFor(state),p=state.player;for(let i=state.peds.length-1;i>=0;i--)if(state.peds[i].faction!=='sol'&&dist(state.peds[i],p)>1300)state.peds.splice(i,1);
  while(state.peds.filter(v=>v.faction!=='sol'&&v.state!=='down').length<36){let pt=null;for(let tries=0;tries<200;tries++){const x=range(rng,Math.max(30,p.x-1000),Math.min(state.city.width-30,p.x+1000)),y=range(rng,Math.max(30,p.y-1000),Math.min(state.city.beachY-20,p.y+1000));if(state.city.isSidewalk(x,y)&&dist({x,y},p)>500){pt={x,y};break;}}if(!pt)break;const ped=newPed(state,pt.x,pt.y);ped.targetX=pt.x;ped.targetY=pt.y;state.peds.push(ped);}}

function worldMouse(state,input){const cam=state.camera||{x:0,y:0};return{x:input.mouse.x+cam.x,y:input.mouse.y+cam.y};}
function collidePlayerCars(state,p){for(const c of state.cars){if(c.dead)continue;const r=p.radius+c.length*.35,d=dist(c,p);if(d<r){const k=(r-d)/(d||1);p.x+=(p.x-c.x)/(d||1)*k;p.y+=(p.y-c.y)/(d||1)*k;}}}
function interact(state,input){if(!input.wasPressed('KeyE'))return false;const p=state.player,pois=state.city.pois;
  for(const stand of pois.foodStands||[])if(Math.hypot(p.x-stand.x,p.y-stand.y)<46&&state.money>=ECONOMY.healCost&&p.health<p.maxHealth){state.money-=ECONOMY.healCost;p.health=Math.min(p.maxHealth,p.health+50);state.events.push({type:'heal'});return true;}
  if(Math.hypot(p.x-pois.gunStore.x,p.y-pois.gunStore.y)<60){if(!p.weapons.pistol&&state.money>=WEAPONS.pistol.price){state.money-=WEAPONS.pistol.price;p.weapons.pistol=true;p.ammo.pistol=(p.ammo.pistol||0)+48;state.events.push({type:'weaponBought',weapon:'pistol'});}else if(state.flags?.smgUnlocked&&!p.weapons.smg&&state.money>=WEAPONS.smg.price){state.money-=WEAPONS.smg.price;p.weapons.smg=true;p.ammo.smg=(p.ammo.smg||0)+90;state.events.push({type:'weaponBought',weapon:'smg'});}else{const w=p.weapon==='smg'?'smg':'pistol',price=WEAPONS[w].ammoPrice* (w==='smg'?3:3);if(state.money>=price){state.money-=price;p.ammo[w]=(p.ammo[w]||0)+(w==='smg'?30:12);state.events.push({type:'ammoBought',weapon:w});}}return true;}
  if(Math.hypot(p.x-pois.safehouse.x,p.y-pois.safehouse.y)<60){state.events.push({type:'saveGame'});return true;}
  if(Math.hypot(p.x-pois.garage.x,p.y-pois.garage.y)<60){state.events.push({type:'talkSol'});state.flags.talkedToSol=true;return true;}
  const pkg=state.city.packages.find(v=>!state.packagesFound.has(v.id)&&Math.hypot(p.x-v.x,p.y-v.y)<30);if(pkg){state.packagesFound.add(pkg.id);state.money+=ECONOMY.packageReward;state.events.push({type:'package',id:pkg.id});if(state.packagesFound.size===state.packagesTotal){state.money+=ECONOMY.packageBonusAll;state.events.push({type:'packageAll'});}return true;}
  return enterExitCar(state);
}

function policeNear(state,r){return state.cars.some(c=>c.kind==='police'&&!c.dead&&dist(c,state.player)<r);}
function attack(state,input,dt){const p=state.player; p.attackCd=Math.max(0,(p.attackCd||0)-dt);p.reloadTimer=Math.max(0,(p.reloadTimer||0)-dt);
  const aimed=input.mouse.down||input.down('KeyQ');if(aimed){const m=worldMouse(state,input);p.angle=Math.atan2(m.y-p.y,m.x-p.x);}
  if(input.wasPressed('KeyR')){const w=p.weapon;if(w==='pistol'||w==='smg'){const spec=WEAPONS[w],current=p.magazine?.[w]??spec.magazine,missing=spec.magazine-current;if(missing>0&&p.ammo[w]>0){const n=Math.min(missing,p.ammo[w]);p.ammo[w]-=n;p.magazine=p.magazine||{};p.magazine[w]=current+n;p.reloadTimer=spec.reloadTime;}}}
  const pressed=(input.mouse.clicked||input.wasPressed('KeyF'))&&p.attackCd<=0;if(!pressed)return;
  if(p.weapon==='fists'){const target=state.peds.filter(v=>v.state!=='down'&&v.faction!=='sol'&&dist(v,p)<PLAYER.fistsRange).sort((a,b)=>dist(a,p)-dist(b,p)).find(v=>Math.abs(wrap(Math.atan2(v.y-p.y,v.x-p.x)-p.angle))<1.1);const car=state.cars.find(c=>!c.dead&&dist(c,p)<PLAYER.fistsRange);if(target){target.health-=PLAYER.fistsDamage;target.state=target.health<=0?'down':'flee';target.panic=2;state.events.push({type:'hitPed',x:target.x,y:target.y});if(target.health>0&&chance(rngFor(state),.3))state.pickups.push({kind:'cash',x:target.x,y:target.y,amount:int(rngFor(state),5,40)});if(policeNear(state,700)||state.peds.some(v=>v!==target&&dist(v,target)<260))addHeat(state,HEAT.hitPed,target.x,target.y);}else if(car){car.health-=25;state.events.push({type:'hitCar',x:car.x,y:car.y});}p.attackCd=WEAPONS.fists.cooldown;return;}
  const w=p.weapon;if(!p.weapons?.[w])return;const spec=WEAPONS[w];p.magazine=p.magazine||{};p.magazine[w]=p.magazine[w]??spec.magazine;if(p.magazine[w]<=0){const reserve=p.ammo[w]||0;if(reserve>0){const n=Math.min(spec.magazine,reserve);p.ammo[w]-=n;p.magazine[w]=n;p.reloadTimer=spec.reloadTime;}return;}
  const m=worldMouse(state,input),aim=Math.atan2(m.y-p.y,m.x-p.x),spread=(rngFor(state)()-.5)*spec.spread;p.angle=aim;p.magazine[w]--;state.bullets.push({x:p.x+Math.cos(aim)*14,y:p.y+Math.sin(aim)*14,angle:aim+spread,speed:spec.bulletSpeed,damage:spec.damage,from:'player',life:spec.range/spec.bulletSpeed});state.particles.push({x:p.x+Math.cos(aim)*17,y:p.y+Math.sin(aim)*17,vx:0,vy:0,life:.12,maxLife:.12,size:7,color:'#ffd278',kind:'muzzle'});state.stats.shotsFired++;state.events.push({type:'shot',weapon:w,x:p.x,y:p.y});if(policeNear(state,700))addHeat(state,HEAT.shootNear,p.x,p.y);p.attackCd=spec.cooldown;
}

export function damagePlayer(state,amount,sourceX=state.player.x,sourceY=state.player.y){const p=state.player;let damage=amount;if(p.armor>0){const absorb=Math.min(p.armor,damage*.6);p.armor-=absorb;damage-=absorb;}p.health=Math.max(0,p.health-damage);state.stats.hitsTaken++;state.events.push({type:'playerHurt',amount:damage,x:sourceX,y:sourceY});if(p.health<=0)state.events.push({type:'wasted'});}
export function updatePlayer(state,input,dt){const p=state.player;if(p.inCar)return;const ix=input.axisX(),iy=input.axisY(),len=Math.hypot(ix,iy);if(len){const speed=input.down('ShiftLeft')||input.down('ShiftRight')?PLAYER.sprintSpeed:PLAYER.walkSpeed,dx=ix/len*speed*dt,dy=iy/len*speed*dt;p.x+=dx;p.y+=dy;p.angle=Math.atan2(dy,dx);p.walkPhase=(p.walkPhase||0)+dt*speed/18;}else if(input.mouse.down||p.weapon!=='fists'){const m=worldMouse(state,input);p.angle=Math.atan2(m.y-p.y,m.x-p.x);}
  const q=state.city.collideCircle(p.x,p.y,p.radius);p.x=q.x;p.y=q.y;collidePlayerCars(state,p);
  if(state.mission?.dialogue?.length&&input.wasPressed('KeyE'))state.events.push({type:'advanceDialogue'});else interact(state,input);
  attack(state,input,dt);
  for(let i=state.pickups.length-1;i>=0;i--){const item=state.pickups[i];if(dist(item,p)<20){state.money+=item.amount;state.pickups.splice(i,1);state.events.push({type:'pickupCash',amount:item.amount});}}
}

function flee(p,fromX,fromY){const a=Math.atan2(p.y-fromY,p.x-fromX);p.state='flee';p.panic=range(rngFor(p._state),2,4);p.targetX=p.x+Math.cos(a)*260;p.targetY=p.y+Math.sin(a)*260;}
export function updatePeds(state,dt){const rng=rngFor(state),shots=state.events.filter(e=>e.type==='shot'),downs=state.events.filter(e=>e.type==='pedDown'||e.type==='rivalDown');
  for(const p of state.peds){if(p.faction==='sol'){p.angle+=Math.sin(state.time*1.4)*dt*.02;continue;}if(p.state==='down')continue;
    if(p.faction==='civilian'){
      const shot=shots.find(e=>Math.hypot(e.x-p.x,e.y-p.y)<300);if(shot){p.state='flee';p.panic=2;p.targetX=p.x+(p.x-shot.x);p.targetY=p.y+(p.y-shot.y);}
      for(const c of state.cars)if(!c.dead&&Math.abs(c.speed)>150&&dist(c,p)<90){p.state='flee';p.panic=2;p.targetX=p.x+(p.x-c.x);p.targetY=p.y+(p.y-c.y);break;}
      const alarm=state.events.find(e=>(e.type==='alarm'||e.type==='carjack')&&Math.hypot(e.x-p.x,e.y-p.y)<180);if(alarm){p.state='flee';p.panic=3;p.targetX=p.x+(p.x-alarm.x);p.targetY=p.y+(p.y-alarm.y);}
      if(downs.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<180)){p.state='flee';p.panic=2;}
    }
    if(p.faction==='rival'){const player=state.player,d=dist(p,player);p.angle=Math.atan2(player.y-p.y,player.x-p.x);if(d>245){p.x+=Math.cos(p.angle)*75*dt;p.y+=Math.sin(p.angle)*75*dt;}else{p.x+=Math.cos(p.angle+Math.PI/2*p.strafe)*26*dt;p.y+=Math.sin(p.angle+Math.PI/2*p.strafe)*26*dt;p.attackCd-=dt;if(d<310&&p.attackCd<=0){p.attackCd=range(rng,1.1,2);const a=p.angle+range(rng,-.16,.16);state.bullets.push({x:p.x,y:p.y,angle:a,speed:520,damage:9,from:'rival',life:.8});state.events.push({type:'rivalShot',x:p.x,y:p.y});}}}
    else {p.walkTimer=(p.walkTimer||0)-dt;if(p.state==='flee')p.panic-=dt;if(p.state==='flee'&&p.panic<=0)p.state='walk';if(p.state==='walk'&&(!p.targetX||dist(p,{x:p.targetX,y:p.targetY})<18||p.walkTimer<=0)){let pt=null;for(let i=0;i<80;i++){const a=range(rng,0,Math.PI*2),r=range(rng,50,180),x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;if(state.city.isSidewalk(x,y)){pt={x,y};break;}}if(pt){p.targetX=pt.x;p.targetY=pt.y;}p.walkTimer=range(rng,2,5);}
      const speed=p.state==='flee'?190:p.speed,a=Math.atan2(p.targetY-p.y,p.targetX-p.x);p.angle=a;p.x+=Math.cos(a)*speed*dt;p.y+=Math.sin(a)*speed*dt;}
    const q=state.city.collideCircle(p.x,p.y,9);p.x=q.x;p.y=q.y;if(state.city.isWater(p.x,p.y)||p.y>state.city.beachY+200){p.x=p.homeX;p.y=p.homeY;}
  }
}

export function updateBullets(state,dt){for(let i=state.bullets.length-1;i>=0;i--){const b=state.bullets[i];b.x+=Math.cos(b.angle)*b.speed*dt;b.y+=Math.sin(b.angle)*b.speed*dt;b.life-=dt;let hit=false;
    if(b.from==='player'){for(const p of state.peds){if(p.state==='down'||p.faction==='sol'||dist(b,p)>12)continue;p.health-=b.damage;hit=true;if(p.health<=0){p.state='down';state.events.push({type:'pedDown',x:p.x,y:p.y,faction:p.faction});if(p.faction==='rival')state.events.push({type:'rivalDown',x:p.x,y:p.y});else if(policeNear(state,700))addHeat(state,HEAT.hitPed,p.x,p.y);}else{p.state='flee';p.panic=3;}break;}
      if(!hit)for(const c of state.cars){if(c.dead||dist(b,c)>c.length*.36)continue;c.health-=b.damage;hit=true;if(c.kind==='police'&&c.health<=0&&!c.dead){c.dead=true;addHeat(state,HEAT.hitPoliceCar,b.x,b.y);}break;}
    }else if(b.from==='rival'&&dist(b,state.player)<state.player.radius){damagePlayer(state,b.damage,b.x,b.y);hit=true;}
    if(!hit&&state.city.colliders.some(c=>b.x>=c.x&&b.x<=c.x+c.w&&b.y>=c.y&&b.y<=c.y+c.h)){state.particles.push({x:b.x,y:b.y,vx:0,vy:0,life:.16,maxLife:.16,size:4,color:'#ffd278',kind:'spark'});hit=true;}
    if(hit||b.life<=0||b.x<0||b.y<0||b.x>state.city.width||b.y>state.city.height)state.bullets.splice(i,1);
  }}
