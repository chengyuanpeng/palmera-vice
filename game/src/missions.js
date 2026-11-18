import { createRandom, pick } from './random.js';
import { CARS } from './config.js';

export const MISSION_LIST = [
  {id:'first-wheels',title:'First Wheels',giver:'Sol',reward:400,intro:[['Sol','A little parcel is waiting by the docks. Bring it back unopened.'],['Jax','You know I hate errands.'],['Sol','You hate being broke more.']]},
  {id:'borrowed-ride',title:'Borrowed Ride',giver:'Sol',reward:650,intro:[['Sol','Gold cabrio at the marina. Bring it home with all four wheels.']]},
  {id:'palm-run',title:'Palm Run',giver:'Sol',reward:500,intro:[['Sol','Eight stops, one clean lap. Think you can keep up?']]},
  {id:'hot-cargo',title:'Hot Cargo',giver:'Sol',reward:900,intro:[['Sol','Load at the airfield, drop at the docks. Keep your head down.']]},
  {id:'dockside-defense',title:'Dockside Defense',giver:'Sol',reward:1200,intro:[['Sol','El Faro’s crew is moving in. Hold the pier with me.']]},
  {id:'lighthouse-job',title:'The Lighthouse Job',giver:'Sol',reward:2500,intro:[['Sol','One armored truck, one compound, one very short window.'],['El Faro','That truck belongs to me, Moreno.'],['Jax','Then you should have parked it better.']]},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function createMissionState(){return {index:0,phase:'offer',step:0,marker:null,dialogue:[],dialogueT:0,timer:null,race:null,waves:null,cargoCar:null,targetCar:null,message:'',messageT:0};}
function msg(m,text,t=3){m.message=text;m.messageT=t;}
function marker(m,p,label,r=58){m.marker={x:p.x,y:p.y,r,label};}
function clearMarker(m){m.marker=null;}
function event(state,type,extra={}){state.events.push({type,...extra});}
function takeEvents(state,type){const found=[];state.events=state.events.filter(e=>{if((typeof e==='string'?e:e.type)===type){found.push(e);return false;}return true;});return found;}
function addDialogue(m,lines){m.dialogue=lines.map(([speaker,text])=>({speaker,text}));m.dialogueT=0;}
function poi(state,key){return state.city.pois[key];}
function near(state,p,r=58){const a=state.player.inCar||state.player;return d(a,p)<=r;}
function setMissionCar(state,model,kind,x,y,color,health){let c=state.cars.find(v=>v.missionId===`m${state.mission.index+1}`&&!v.dead);if(!c){const spec=CARS[model];c={id:`mission-${state.mission.index+1}`,kind,model,x,y,angle:0,speed:0,steer:0,length:spec.length,width:spec.width,color,health:health||spec.health,maxHealth:health||spec.health,driver:null,targetLane:0,honkCd:0,dead:false,alarm:false,missionId:`m${state.mission.index+1}`,vx:0,vy:0};state.cars.push(c);}return c;}
export function startMission(state){const m=state.mission;if(m.phase!=='offer')return false;m.phase='active';m.step=0;m.timer=null;m.race=null;m.waves=null;m.cargoCar=null;m.targetCar=null;addDialogue(m,MISSION_LIST[m.index]?.intro||MISSION_LIST[2].intro);msg(m,MISSION_LIST[m.index]?.title||'Palm Run',4);
  if(m.index===0){marker(m,poi(state,'garage'),'Talk to Sol');}
  if(m.index===1){m.targetCar=setMissionCar(state,'cabrio','mission',poi(state,'marina').x+55,poi(state,'marina').y-50,'#e9c34c');m.targetCar.alarm=false;marker(m,m.targetCar,'Gold cabrio');}
  if(m.index===2){m.timer=150;m.race={checkpoints:[poi(state,'airport'),poi(state,'compound'),poi(state,'policeStation'),poi(state,'marina'),poi(state,'docks'),poi(state,'gunStore'),poi(state,'sprayShop'),poi(state,'garage')],next:0};marker(m,m.race.checkpoints[0],'Checkpoint 1',70);}
  if(m.index===3)marker(m,poi(state,'airport'),'Load cargo');
  if(m.index===4)marker(m,poi(state,'warehouse'),'Defend the pier');
  if(m.index===5){m.targetCar=setMissionCar(state,'truck','mission',poi(state,'compound').x-75,poi(state,'compound').y+80,'#737d79',240);marker(m,m.targetCar,'Armored truck');}
  return true;}
function fail(state){const m=state.mission;m.phase='failed';m.timer=null;m.race=null;m.waves=null;clearMarker(m);msg(m,'Job blown — talk to Sol to retry.',5);event(state,'missionFailed');}
function finish(state){const m=state.mission,def=MISSION_LIST[m.index];m.phase='done';clearMarker(m);m.timer=null;m.race=null;m.waves=null;state.money+=def.reward;event(state,'missionDone',{mission:def.id,reward:def.reward});event(state,'saveGame');msg(m,`${def.title} complete  +$${def.reward}`,5);if(m.index===4)state.flags.smgUnlocked=true;if(m.index===5){state.flags.storyDone=true;event(state,'storyDone');} }
export function updateMissions(state,dt){const m=state.mission;if(!m)return;m.messageT=Math.max(0,(m.messageT||0)-dt);const advances=takeEvents(state,'advanceDialogue');if(m.dialogue?.length){if(advances.length){m.dialogue.shift();m.dialogueT=0;}else{m.dialogueT=(m.dialogueT||0)+dt;if(m.dialogueT>=3.2){m.dialogue.shift();m.dialogueT=0;}}}
  const talks=takeEvents(state,'talkSol'),busted=takeEvents(state,'busted').length||takeEvents(state,'wasted').length;
  if(m.phase==='done'){if(state.flags.storyDone){if(talks.length){m.index=2;m.phase='offer';m.endless=true;m.step=0;msg(m,'The city is yours. Want another lap?',4);}}else if(talks.length&&m.index<5){m.index++;m.phase='offer';m.step=0;msg(m,`${MISSION_LIST[m.index].title} — talk to Sol to begin.`,4);}return;}
  if(m.phase==='failed'){if(talks.length){m.phase='offer';m.step=0;clearMarker(m);}return;}
  if(m.phase==='offer'){if(talks.length){startMission(state);if(m.index===0){m.step=1;addDialogue(m,[['Sol','Docks, by the old pier. Grab the parcel and come straight back.']]);marker(m,poi(state,'docks'),'Pick up the parcel');}if(m.index===4){m.step=1;m.waves={left:5,wave:1,total:3,breather:0};spawnWave(state,5);marker(m,poi(state,'warehouse'),'Hold the pier');}}return;}
  if(m.phase!=='active')return;
  if(busted&&(m.index===1||m.index===3||m.index===5)){fail(state);return;}
  if(m.index===0){if(m.step===0){marker(m,poi(state,'garage'),'Talk to Sol');if(talks.length){m.step=1;addDialogue(m,[['Sol','Docks, by the old pier. Grab the parcel and come straight back.']]);marker(m,poi(state,'docks'),'Pick up the parcel');}}
    else if(m.step===1){if(near(state,poi(state,'docks'),74)){m.step=2;addDialogue(m,[['Jax','Got it. Smells like trouble.'],['Sol','That’s the Palmera signature. Bring it in.']]);marker(m,poi(state,'garage'),'Return to Sol');}}
    else if(m.step===2&&near(state,poi(state,'garage'),70))finish(state);
  } else if(m.index===1){if(m.targetCar?.dead||m.targetCar?.health<=0){fail(state);return;}if(m.step===0&&state.player.inCar===m.targetCar){m.step=1;m.targetCar.driver='player';state.heat=1.2;state.wanted=1;marker(m,poi(state,'garage'),'Park at Sol’s garage');msg(m,'Ride acquired — heat is up.',4);}else if(m.step===1&&state.player.inCar===m.targetCar&&near(state,poi(state,'garage'),68))finish(state);
  } else if(m.index===2){m.timer-=dt;if(m.timer<=0){fail(state);return;}const cp=m.race.checkpoints[m.race.next];if(state.player.inCar&&near(state,cp,70)){m.race.next++;if(m.race.next>=m.race.checkpoints.length){state.money+=8*50;finish(state);return;}marker(m,m.race.checkpoints[m.race.next],`Checkpoint ${m.race.next+1}`,70);}}
  else if(m.index===3){if(m.step===0&&state.player.inCar&&near(state,poi(state,'airport'),95)){m.cargoCar=state.player.inCar;m.step=1;state.heat=2.2;state.wanted=2;marker(m,poi(state,'warehouse'),'Deliver hot cargo');msg(m,'Cargo loaded — two stars.',4);}else if(m.step===1&&state.player.inCar===m.cargoCar&&near(state,poi(state,'warehouse'),95))finish(state);}
  else if(m.index===4){if(m.step===0&&talks.length){m.step=1;m.waves={left:5,wave:1,total:3,breather:0};spawnWave(state,5);marker(m,poi(state,'warehouse'),'Hold the pier');}if(m.waves){takeEvents(state,'rivalDown');const alive=state.peds.filter(p=>p.faction==='rival'&&p.state!=='down').length;if(alive===0){if(m.waves.wave>=3){finish(state);return;}m.waves.breather=(m.waves.breather||0)+dt;if(m.waves.breather>=4){m.waves.wave++;m.waves.left=[0,5,7,9][m.waves.wave];m.waves.breather=0;addDialogue(m,[['Sol',`Wave ${m.waves.wave}. Stay sharp.`]]);spawnWave(state,m.waves.left);}}}}
  else if(m.index===5){if(m.targetCar?.dead||m.targetCar?.health<=0){fail(state);return;}if(m.step===0&&state.player.inCar===m.targetCar){m.step=1;m.targetCar.driver='player';state.heat=3.2;state.wanted=3;addDialogue(m,[['El Faro','You just made a very expensive mistake, Jax.']]);marker(m,poi(state,'garage'),'Deliver the truck');}else if(m.step===1&&state.player.inCar===m.targetCar&&near(state,poi(state,'garage'),80))finish(state);}
}
export function spawnWave(state,count){const rng=state.rng||createRandom(state.seed||1),p=state.city.pois.pier;for(let i=0;i<count;i++){const edge=i%2? p.x+18:p.x+p.w-18, y=p.y+30+(i*37)%(p.h-55);const skin=['#edc8a0','#d69a72','#8e5c48'][i%3],shirt=['#554754','#7e3945','#354f65'][i%3];state.peds.push({x:edge,y,angle:0,speed:58,state:'fight',health:100,color:skin,shirtColor:shirt,homeX:edge,homeY:y,targetX:state.player.x,targetY:state.player.y,panic:0,weapon:'pistol',faction:'rival',name:`Dock rival ${i+1}`,attackCd:.4+i*.13,strafe:i%2?1:-1});}}
export function objectiveText(state){const m=state.mission;if(!m)return'';if(m.phase==='offer')return m.index===0?'Talk to Sol at the garage':m.index===2&&m.endless?'Talk to Sol for another Palm Run':'Talk to Sol to start the next job';if(m.phase==='failed')return'Talk to Sol to retry';if(m.phase==='done')return state.flags.storyDone?'The Palms are yours':'Job complete';const names=['Return to Sol','Bring the gold cabrio to the garage','Follow the Palm Run checkpoints','Deliver cargo to the docks warehouse','Defend the pier','Bring the armored truck to Sol'];return names[m.index]||'Explore Palmera';}
export function currentDialogue(state){const line=state.mission?.dialogue?.[0];return line||null;}
let sprayProgress=0,safeInside=false;
export function updatePlaces(state,dt){const p=state.player.inCar||state.player,spray=poi(state,'sprayShop'),safe=poi(state,'safehouse'),car=state.player.inCar;const inSpray=!!car&&d(p,spray)<70&&state.wanted>0&&state.money>=300&&Math.abs(car.speed)<35;if(inSpray){sprayProgress+=dt;if(sprayProgress>=1.2){sprayProgress=0;state.money-=300;state.heat=0;state.wanted=0;const rng=state.rng||(state.rng=createRandom(state.seed||1));car.color=pick(rng,['#ff5cad','#58e4ec','#ffc45b','#b9f36a','#e6ede8']);event(state,'respray');}}else sprayProgress=0;const inside=!car&&d(p,safe)<60;if(inside&&state.player.health<state.player.maxHealth)state.player.health=Math.min(state.player.maxHealth,state.player.health+8*dt);if(inside&&!safeInside)event(state,'saveGame');safeInside=inside;}
