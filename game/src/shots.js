import { createCar } from './vehicles.js';
import { spawnWave } from './missions.js';

const many=(api,n,keys,mouse={x:0,y:0,down:false})=>{for(let i=0;i<n;i++)api.step({keys:new Set(keys),mouse});};
const ped=(x,y)=>({x,y,angle:0,speed:50,state:'walk',health:100,color:'#d99c70',shirtColor:'#e4a747',homeX:x,homeY:y,targetX:x+30,targetY:y,panic:0,weapon:null,faction:'civilian',name:'Boardwalk local'});
function reset(s){s.mode='play';s.events.length=0;s.bullets.length=0;s.particles.length=0;s.pickups.length=0;s.peds=s.peds.filter(p=>p.faction==='sol');s.cars=s.cars.filter(c=>c.kind==='parked'||c.kind==='traffic');s.packagesFound.clear();s.mission.index=0;s.mission.phase='active';s.mission.step=0;s.mission.dialogue=[];s.mission.marker=null;s.heat=0;s.wanted=0;s.bustMeter=0;s.player.inCar=null;s.player.weapons={pistol:true,smg:true};s.player.ammo={pistol:60,smg:120};s.player.weapon='pistol';s.time=0;}
const cop=(s,x,y,a)=>{const c=createCar(s.city,s.rng,'police',{x,y,angle:a});c.speed=130;s.cars.push(c);return c;};
const traffic=(s,x,y,a)=>{const c=createCar(s.city,s.rng,'traffic',{x,y,angle:a,model:'sedan'});c.speed=100;s.cars.push(c);return c;};

export function stageShot(name,api){
 const s=api.state,c=s.city;reset(s);if(!['cover','docks','chase','defense'].includes(name))name='cover';
 if(name==='cover'){
  const car=createCar(c,s.rng,'mission',{model:'sport',x:1640,y:980,angle:0});car.speed=280;car.driver='player';s.cars.push(car);s.player.inCar=car;s.player.x=car.x;s.player.y=car.y;s.heat=3.1;s.wanted=3;s.mission.step=2;s.mission.marker={x:c.pois.garage.x,y:c.pois.garage.y,r:60,label:'Return to Sol'};
  cop(s,1500,1003,0);cop(s,1390,957,0);many(api,30,['KeyW']);car.x=1700;car.y=980;car.speed=310;s.player.x=car.x;s.player.y=car.y;
  const cops=s.cars.filter(q=>q.kind==='police');cops[0].x=car.x-155;cops[0].y=car.y+4;cops[0].angle=0;cops[0].speed=220;cops[1].x=car.x-290;cops[1].y=car.y-28;cops[1].angle=0;cops[1].speed=190;
  traffic(s,car.x+210,car.y+105,Math.PI/2);s.camera.x=car.x;s.camera.y=car.y;
 } else if(name==='docks'){
  const p=c.packages.find(q=>q.id===18);s.player.x=p.x-340;s.player.y=p.y;s.mission.step=1;s.mission.marker={x:p.x,y:p.y,r:58,label:'Pick up the parcel'};s.peds.push(ped(2895,2210),ped(3000,2240));many(api,90,['KeyD']);
 } else if(name==='chase'){
  const car=createCar(c,s.rng,'mission',{model:'cabrio',x:2180,y:980,angle:0});car.speed=300;car.driver='player';s.cars.push(car);s.player.inCar=car;s.player.x=car.x;s.player.y=car.y;s.heat=5.2;s.wanted=5;
  cop(s,2040,1003,0);cop(s,1880,957,0);cop(s,2630,980,Math.PI);
  many(api,88,['KeyW']);many(api,27,['KeyW','KeyD','Space']);
  // End just beyond the junction, heading south after a hard right turn.
  car.x=2520;car.y=1050;car.angle=Math.PI/2;car.speed=365;car.vx=12;car.vy=355;s.player.x=car.x;s.player.y=car.y;s.player.angle=car.angle;
  const cops=s.cars.filter(q=>q.kind==='police');[[2520,910,Math.PI/2],[2520,750,Math.PI/2],[2660,1320,Math.PI]].forEach((v,i)=>{cops[i].x=v[0];cops[i].y=v[1];cops[i].angle=v[2];cops[i].speed=220-i*18;});s.bustMeter=0;
  for(let i=0;i<10;i++)s.particles.push({x:car.x-13-i*7,y:car.y+3,vx:-35-i*5,vy:8+i*2,life:.62+(i%3)*.12,maxLife:.9,size:8,color:'#aaaeb0',kind:'smoke'});
  s.camera.x=car.x;s.camera.y=car.y;
 } else {
  const w=c.pois.warehouse;s.city.trees=s.city.trees.filter(t=>!(t.x>2480&&t.x<3100&&t.y>2070&&t.y<2380));s.player.x=w.x-55;s.player.y=w.y-35;s.player.angle=Math.PI/2;s.player.health=62;s.player.armor=20;s.player.weapon='smg';s.mission.index=4;s.mission.step=1;s.mission.waves={left:7,wave:2,total:3,breather:0};s.mission.marker={x:c.pois.pier.x+80,y:c.pois.pier.y+130,r:58,label:'Hold the pier'};spawnWave(s,7);
  const rivals=s.peds.filter(q=>q.faction==='rival');for(let i=0;i<rivals.length;i++){const p=rivals[i];p.x=2850+(i%3)*48;p.y=2190+Math.floor(i/3)*54;p.angle=Math.PI;p.targetX=s.player.x;p.targetY=s.player.y;p.state='fight';p.health=100;if(i===6){p.health=0;p.state='down';}}
  const target=rivals[0];many(api,12,['KeyF'],{x:target.x,y:target.y,down:true});
  s.player.x=w.x-55;s.player.y=w.y-35;s.player.angle=Math.PI/2;
  for(let i=0;i<rivals.length;i++){const p=rivals[i];p.x=2850+(i%3)*48;p.y=2190+Math.floor(i/3)*54;p.angle=Math.PI;p.targetX=s.player.x;p.targetY=s.player.y;if(i===6){p.health=0;p.state='down';}}
  s.bullets.push({x:s.player.x+28,y:s.player.y+4,vx:340,vy:70},{x:s.player.x+32,y:s.player.y+6,vx:350,vy:38});s.particles.push({x:s.player.x+17,y:s.player.y+3,life:.12,maxLife:.12,size:14,color:'#ffe070',kind:'flash'},{x:s.player.x+42,y:s.player.y+18,life:.8,maxLife:.8,size:11,color:'#929393',kind:'smoke'});s.camera.x=s.player.x;s.camera.y=s.player.y;
 }
 s.camera.x=s.player.inCar?s.player.inCar.x:s.player.x;s.camera.y=s.player.inCar?s.player.inCar.y:s.player.y;return s;
}
