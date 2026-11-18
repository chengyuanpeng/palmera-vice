import { PALETTE, WORLD, FONT, CAMERA_ZOOM } from './config.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;};
export function createCamera(){return{x:WORLD.width/2,y:WORLD.height/2};}
export function updateCamera(camera,state,dt){
  const p=state.player, target=p.inCar||p;
  const speed=p.inCar?target.speed:Math.hypot(p.vx||0,p.vy||0), angle=target.angle||0;
  const look=Math.min(150,speed*.28), tx=target.x+Math.cos(angle)*look,ty=target.y+Math.sin(angle)*look;
  const k=1-Math.exp(-5.5*dt), halfX=(innerWidth/2)/CAMERA_ZOOM,halfY=(innerHeight/2)/CAMERA_ZOOM; camera.x=clamp(lerp(camera.x,tx,k),halfX-140,WORLD.width-halfX+140); camera.y=clamp(lerp(camera.y,ty,k),halfY-140,WORLD.height-halfY+140);
}
function screen(ctx,x,y){ctx.translate(x,y);}
export function drawWorld(ctx,state,view){
  const city=state.city,t=state.time||0,cam=state.camera||{x:state.player.x,y:state.player.y}, w=view.w,h=view.h;
  const halfW=w/2/CAMERA_ZOOM,halfH=h/2/CAMERA_ZOOM,left=cam.x-halfW,top=cam.y-halfH,right=cam.x+halfW,bottom=cam.y+halfH;
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(CAMERA_ZOOM,CAMERA_ZOOM);ctx.translate(-cam.x,-cam.y);
  let sky=ctx.createLinearGradient(0,top,0,bottom);sky.addColorStop(0,PALETTE.skyTop);sky.addColorStop(1,PALETTE.skyBottom);ctx.fillStyle=sky;ctx.fillRect(left,top,right-left,bottom-top);
  ctx.fillStyle='#c8a77f';ctx.fillRect(0,0,city.width,city.height);
  ctx.fillStyle=PALETTE.sand;ctx.fillRect(0,city.beachY,city.width,city.waterY-city.beachY);
  ctx.fillStyle=PALETTE.water;ctx.fillRect(0,city.waterY,city.width,city.height-city.waterY);
  if(bottom>city.height){ctx.fillStyle=PALETTE.water;ctx.fillRect(left,Math.max(top,city.height),right-left,bottom-Math.max(top,city.height));}
  ctx.fillStyle=PALETTE.waterDeep;
  for(let y=city.waterY+16;y<city.height;y+=58){const off=(t*13+y*0.17)%180;for(let x=-180+off;x<city.width;x+=180)ctx.fillRect(x,y,82,2);}
  ctx.fillStyle='#d5b08b';
  for(const x of city.avenues)ctx.fillRect(x-city.roadHalf-city.sidewalk,0,city.roadHalf*2+city.sidewalk*2,city.beachY);
  for(const y of city.streets)ctx.fillRect(0,y-city.roadHalf-city.sidewalk,city.width,city.roadHalf*2+city.sidewalk*2);
  ctx.fillStyle=PALETTE.asphalt;
  for(const x of city.avenues)ctx.fillRect(x-city.roadHalf,0,city.roadHalf*2,city.beachY);
  for(const y of city.streets)ctx.fillRect(0,y-city.roadHalf,city.width,city.roadHalf*2);
  ctx.strokeStyle=PALETTE.roadMark;ctx.lineWidth=2;ctx.setLineDash([18,20]);
  for(const x of city.avenues){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,city.beachY);ctx.stroke();}
  for(const y of city.streets){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(city.width,y);ctx.stroke();}
  ctx.setLineDash([]);
  for(const x of city.avenues)for(const y of city.streets){ctx.fillStyle='rgba(244,214,138,.55)';for(let i=-2;i<=2;i++){ctx.fillRect(x-42+i*15,y-45,8,3);ctx.fillRect(x-42+i*15,y+42,8,3);}}
  const runway=city.pois.runway;ctx.fillStyle='#42464a';ctx.fillRect(runway.x,runway.y,runway.w,runway.h);ctx.fillStyle='#f4e8c8';ctx.fillRect(runway.x+20,runway.y+20,runway.w-40,2);for(let x=runway.x+35;x<runway.x+runway.w-35;x+=55)ctx.fillRect(x,runway.y+8,24,3);
  const pier=city.pois.pier,board=city.pois.boardwalk;for(const q of [pier,board]){ctx.fillStyle='#9a684b';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.strokeStyle='rgba(61,43,34,.55)';ctx.lineWidth=2;for(let y=q.y+7;y<q.y+q.h;y+=12){ctx.beginPath();ctx.moveTo(q.x,y);ctx.lineTo(q.x+q.w,y);ctx.stroke();}}
  for(const lot of city.lots||[]){if(lot.x+lot.w<left||lot.x>right||lot.y+lot.h<top||lot.y>bottom)continue;ctx.fillStyle='#c7b9a5';ctx.fillRect(lot.x,lot.y,lot.w,lot.h);ctx.strokeStyle='rgba(255,240,205,.38)';ctx.lineWidth=1;for(let x=lot.x+10;x<lot.x+lot.w-5;x+=30){ctx.beginPath();ctx.moveTo(x,lot.y+9);ctx.lineTo(x,lot.y+34);ctx.stroke();}}
  const objects=[];
  for(const b of city.buildings)if(b.x+b.w>=left-80&&b.x<=right+80&&b.y+b.h>=top-100&&b.y<=bottom+50)objects.push({y:b.y+b.h,draw:()=>drawBuilding(ctx,b)});
  for(const tree of city.trees)if(tree.x>left-50&&tree.x<right+50&&tree.y>top-60&&tree.y<bottom+60)objects.push({y:tree.y,draw:()=>drawPalm(ctx,tree,t)});
  for(const lamp of city.lamps)if(lamp.x>left-20&&lamp.x<right+20&&lamp.y>top-30&&lamp.y<bottom+30)objects.push({y:lamp.y,draw:()=>drawLamp(ctx,lamp)});
  for(const car of state.cars||[])if(car.x>left-70&&car.x<right+70&&car.y>top-70&&car.y<bottom+70)objects.push({y:car.y,draw:()=>drawCar(ctx,car,t,car===state.player.inCar)});
  for(const ped of state.peds||[])if(ped.x>left-30&&ped.x<right+30&&ped.y>top-30&&ped.y<bottom+30)objects.push({y:ped.y,draw:()=>drawPerson(ctx,ped,false)});
  if(!state.player.inCar)objects.push({y:state.player.y,draw:()=>{drawPerson(ctx,state.player,true);drawPlayerMarker(ctx,state.player,t);}});
  objects.sort((a,b)=>a.y-b.y);for(const o of objects)o.draw();
  for(const pkg of city.packages)if(!state.packagesFound?.has(pkg.id)&&pkg.x>left-25&&pkg.x<right+25&&pkg.y>top-25&&pkg.y<bottom+25)drawPackage(ctx,pkg,t);
  for(const item of state.pickups||[])if(item.x>left-30&&item.x<right+30&&item.y>top-30&&item.y<bottom+30)drawPickup(ctx,item,t);
  for(const ped of state.peds||[])void ped;
  for(const bullet of state.bullets||[]){if(bullet.x<left-30||bullet.x>right+30||bullet.y<top-30||bullet.y>bottom+30)continue;ctx.strokeStyle='#fff0a4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(bullet.x-(bullet.vx||0)*.025,bullet.y-(bullet.vy||0)*.025);ctx.stroke();}
  for(const p of state.particles||[]){if(p.x<left-30||p.x>right+30||p.y<top-30||p.y>bottom+30)continue;const f=clamp(p.life/(p.maxLife||1),0,1);ctx.globalAlpha=f;ctx.fillStyle=p.color|| (p.kind==='cash'?'#76e69a':'#ffe0a0');ctx.beginPath();ctx.arc(p.x,p.y-(p.kind==='smoke'?(1-f)*14:0),p.size||3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  for(const [key,label] of [['garage',"SOL'S GARAGE"],['sprayShop','SUNSET CUSTOMS'],['gunStore','PALMERA ARMS'],['safehouse','SAFEHOUSE'],['policeStation','POLICE'],['foodStands','']]){const list=key==='foodStands'?city.pois.foodStands:[city.pois[key]];for(const poi of list||[]){if(!poi||poi.x<left-100||poi.x>right+100||poi.y<top-100||poi.y>bottom+100)continue;ctx.font=`bold 11px ${FONT.body}`;ctx.textAlign='center';ctx.fillStyle='rgba(22,35,42,.78)';ctx.fillRect(poi.x-54,poi.y-36,108,18);ctx.fillStyle=key==='garage'?'#58e4ec':'#fff0d0';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.fillText(key==='foodStands'?'FOOD':label,poi.x,poi.y-23);ctx.shadowBlur=0;}}
  ctx.restore();
  const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.22,w/2,h/2,Math.max(w,h)*.7);vg.addColorStop(0,'rgba(29,23,43,0)');vg.addColorStop(1,'rgba(33,24,40,.38)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(255,173,105,.055)';ctx.fillRect(0,0,w,h);
}
function drawBuilding(ctx,b){const lift=Math.min(55,b.height*.32),dx=12,dy=-lift;ctx.fillStyle='rgba(50,35,42,.24)';ctx.fillRect(b.x+12,b.y+16,b.w,b.h);ctx.fillStyle=shade(b.color,.72);ctx.beginPath();ctx.moveTo(b.x+b.w,b.y);ctx.lineTo(b.x+b.w+dx,b.y+dy);ctx.lineTo(b.x+b.w+dx,b.y+b.h+dy);ctx.lineTo(b.x+b.w,b.y+b.h);ctx.closePath();ctx.fill();ctx.fillStyle=shade(b.color,.86);ctx.beginPath();ctx.moveTo(b.x,b.y+b.h);ctx.lineTo(b.x+dx,b.y+b.h+dy);ctx.lineTo(b.x+b.w+dx,b.y+b.h+dy);ctx.lineTo(b.x+b.w,b.y+b.h);ctx.closePath();ctx.fill();ctx.fillStyle=b.roof;ctx.fillRect(b.x,b.y-lift,b.w,b.h);ctx.strokeStyle='rgba(255,240,216,.22)';ctx.lineWidth=2;for(let x=b.x+12;x<b.x+b.w-5;x+=27){ctx.fillStyle='rgba(255,220,145,.8)';ctx.fillRect(x,b.y-4,10,5);}if(b.signText){ctx.font=`bold 10px ${FONT.body}`;ctx.textAlign='center';ctx.fillStyle=b.sign||'#ff5cad';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=12;ctx.fillText(b.signText,b.x+b.w/2,b.y+b.h-9);ctx.shadowBlur=0;}}
function shade(hex,f){const n=parseInt(hex.slice(1),16),r=Math.floor((n>>16)*f),g=Math.floor(((n>>8)&255)*f),b=Math.floor((n&255)*f);return `rgb(${r},${g},${b})`;}
function drawPalm(ctx,tr,t){const sway=Math.sin(t*.65+tr.phase)*5;ctx.strokeStyle='#80583c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(tr.x,tr.y+17);ctx.quadraticCurveTo(tr.x-5+sway,tr.y-7,tr.x+sway,tr.y-26);ctx.stroke();ctx.strokeStyle=PALETTE.palm;ctx.lineWidth=3;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(tr.x+sway,tr.y-26);ctx.quadraticCurveTo(tr.x+sway+Math.cos(a)*16,tr.y-37+Math.sin(a)*6,tr.x+sway+Math.cos(a)*30,tr.y-27+Math.sin(a)*15);ctx.stroke();}}
function drawLamp(ctx,l){ctx.strokeStyle='#564d49';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(l.x,l.y+10);ctx.lineTo(l.x,l.y-18);ctx.lineTo(l.x+7,l.y-18);ctx.stroke();ctx.fillStyle='#ffd995';ctx.shadowColor='#ffbd72';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(l.x+7,l.y-17,3,0,7);ctx.fill();ctx.shadowBlur=0;}
function drawCar(ctx,c,t,player){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.fillStyle='rgba(28,24,32,.35)';ctx.fillRect(-c.length/2+2,-c.width/2+3,c.length,c.width);ctx.fillStyle=c.dead?'#4c4a49':c.color;roundRect(ctx,-c.length/2,-c.width/2,c.length,c.width,5);ctx.fill();ctx.fillStyle=c.kind==='police'?'#ecf1f0':shade(c.color,.7);roundRect(ctx,-c.length*.16,-c.width*.39,c.length*.42,c.width*.78,4);ctx.fill();ctx.fillStyle='#344b5b';ctx.fillRect(c.length*.08,-c.width*.31,c.length*.22,c.width*.62);ctx.fillStyle=shade(c.color,.48);ctx.fillRect(-c.length*.34,-c.width*.31,c.length*.16,c.width*.62);ctx.fillStyle='#fff2be';ctx.fillRect(c.length/2-4,-c.width/2+2,3,5);ctx.fillRect(c.length/2-4,c.width/2-7,3,5);ctx.fillStyle='#e96863';ctx.fillRect(-c.length/2+1,-c.width/2+2,3,5);ctx.fillRect(-c.length/2+1,c.width/2-7,3,5);if(c.kind==='police'){const red=Math.floor(t*5)%2===0;ctx.save();ctx.shadowBlur=10;ctx.fillStyle=red?'#ff354f':'rgba(255,53,79,.38)';ctx.shadowColor='#ff354f';ctx.fillRect(-6,-3,6,6);ctx.fillStyle=red?'rgba(64,157,255,.38)':'#409dff';ctx.shadowColor='#409dff';ctx.fillRect(0,-3,6,6);ctx.restore();}if(player){ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-c.width);ctx.lineTo(-4,-c.width-8);ctx.lineTo(4,-c.width-8);ctx.fill();}ctx.restore();}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawPerson(ctx,p,player){ctx.save();ctx.translate(p.x,p.y);if(p.state==='down'){ctx.globalAlpha=.55;ctx.rotate(-Math.PI/2);}ctx.fillStyle='rgba(25,28,31,.25)';ctx.beginPath();ctx.ellipse(0,4,8,4,0,0,7);ctx.fill();ctx.fillStyle=player?'#168d8b':(p.shirtColor||p.color||'#d79b65');roundRect(ctx,-5,-4,10,12,4);ctx.fill();const swing=Math.sin(p.walkPhase||0)*2;ctx.strokeStyle='#382f32';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,6);ctx.lineTo(-3+swing,11);ctx.moveTo(2,6);ctx.lineTo(3-swing,11);ctx.stroke();ctx.fillStyle=player?'#553a2c':'#d9a77e';ctx.beginPath();ctx.arc(0,-8,4.5,0,7);ctx.fill();if(player){ctx.fillStyle='#263f4a';ctx.fillRect(-5,-13,10,3);ctx.strokeStyle='#fff1bb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,-1);ctx.lineTo(13,-1);ctx.stroke();}ctx.restore();}
function drawPlayerMarker(ctx,p,t){const pulse=14+Math.sin(t*4)*2;ctx.save();ctx.globalAlpha=.34;ctx.strokeStyle='#fff2dc';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+2,pulse,pulse*.52,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.82;ctx.fillStyle='#ffe6c3';ctx.beginPath();ctx.moveTo(p.x,p.y-30);ctx.lineTo(p.x-5,p.y-39);ctx.lineTo(p.x+5,p.y-39);ctx.closePath();ctx.fill();ctx.restore();}
function drawPackage(ctx,p,t){const pulse=.75+.25*Math.sin(t*4+p.id);ctx.fillStyle=`rgba(255,204,66,${.18*pulse})`;ctx.beginPath();ctx.arc(p.x,p.y,16*pulse,0,7);ctx.fill();ctx.fillStyle='#ffd25e';ctx.beginPath();ctx.moveTo(p.x-8,p.y+3);ctx.quadraticCurveTo(p.x-5,p.y-7,p.x+1,p.y-6);ctx.quadraticCurveTo(p.x+9,p.y-3,p.x+7,p.y+4);ctx.quadraticCurveTo(p.x,p.y+9,p.x-8,p.y+3);ctx.fill();ctx.strokeStyle='#9f692a';ctx.beginPath();ctx.moveTo(p.x-4,p.y-4);ctx.lineTo(p.x,p.y+5);ctx.moveTo(p.x,p.y-5);ctx.lineTo(p.x+4,p.y+3);ctx.stroke();}
function drawPickup(ctx,p,t){ctx.fillStyle=p.kind==='health'?'#75e3a4':p.kind==='armor'?'#69c6e8':'#ffd25e';ctx.beginPath();ctx.arc(p.x,p.y+Math.sin(t*3+p.x)*3,8,0,7);ctx.fill();ctx.fillStyle='#17232a';ctx.font=`bold 10px ${FONT.body}`;ctx.textAlign='center';ctx.fillText(p.kind==='health'?'+':p.kind==='armor'?'◆':'•',p.x,p.y+4);}
