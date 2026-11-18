export function createAudio(){
  let ctx=null,muted=false, engineOsc=null,engineGain=null,engineFilter=null,noiseLoop=null,sirenOsc=null,sirenOsc2=null,sirenGain=null,musicOn=false,musicClock=0,musicBeat=0;
  const active=()=>!!ctx&&!muted;
  function ensure(){if(!ctx){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return null;try{ctx=new C();}catch{return null;}}return ctx;}
  function gain(value=0){const g=ctx.createGain();g.gain.value=value;g.connect(ctx.destination);return g;}
  function noiseBuffer(seconds=.25){const b=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*seconds)),ctx.sampleRate),d=b.getChannelData(0);let s=0x12345678;for(let i=0;i<d.length;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;d[i]=((s/4294967296)*2-1)*.6;}return b;}
  function burst(duration=.12,filter=1800,level=.08){if(!active())return;const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),now=ctx.currentTime;src.buffer=noiseBuffer(duration);f.type='lowpass';f.frequency.setValueAtTime(filter,now);g.gain.setValueAtTime(level,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);src.connect(f);f.connect(g);g.connect(ctx.destination);src.start(now);src.stop(now+duration+.01);}
  function tone(freq,dur,level=.05,type='sine',when=0){if(!active())return;const o=ctx.createOscillator(),g=ctx.createGain(),n=ctx.currentTime+when;o.type=type;o.frequency.setValueAtTime(freq,n);g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(Math.max(.001,level),n+.015);g.gain.exponentialRampToValueAtTime(.0001,n+dur);o.connect(g);g.connect(ctx.destination);o.start(n);o.stop(n+dur+.02);}
  function startEngine(){if(!ctx||engineOsc)return;engineOsc=ctx.createOscillator();engineFilter=ctx.createBiquadFilter();engineGain=ctx.createGain();engineOsc.type='sawtooth';engineFilter.type='lowpass';engineFilter.frequency.value=420;engineGain.gain.value=0;engineOsc.connect(engineFilter);engineFilter.connect(engineGain);engineGain.connect(ctx.destination);engineOsc.start();}
  function setLoopGain(node,value){if(node&&ctx)node.gain.setTargetAtTime(muted?0:value,ctx.currentTime,.04);}
  function startNoiseLoop(){if(!ctx||noiseLoop)return;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer(1);s.loop=true;f.type='bandpass';f.frequency.value=950;g.gain.value=0;s.connect(f);f.connect(g);g.connect(ctx.destination);s.start();noiseLoop={s,g};}
  function startSiren(){if(!ctx||sirenOsc)return;sirenOsc=ctx.createOscillator();sirenOsc2=ctx.createOscillator();sirenGain=ctx.createGain();const g2=ctx.createGain(),mix=ctx.createGain();sirenOsc.type='square';sirenOsc2.type='square';sirenOsc.frequency.value=650;sirenOsc2.frequency.value=950;sirenGain.gain.value=0;g2.gain.value=0;sirenOsc.connect(sirenGain);sirenOsc2.connect(g2);sirenGain.connect(mix);g2.connect(mix);mix.connect(ctx.destination);sirenOsc.start();sirenOsc2.start();sirenOsc._gain2=g2;}
  function note(freq,duration,level=.035,type='square'){tone(freq,duration,level,type);}
  return {
    unlock(){const c=ensure();if(c&&c.state==='suspended')c.resume().catch(()=>{});if(c){startEngine();startNoiseLoop();startSiren();}},
    setMuted(m){muted=!!m;if(ctx){setLoopGain(engineGain,engineGain?engineGain.gain.value:0);setLoopGain(noiseLoop?.g,0);setLoopGain(sirenGain,0);if(sirenOsc?._gain2)setLoopGain(sirenOsc._gain2,0);}},
    toggleMuted(){this.setMuted(!muted);return muted;},isMuted(){return muted;},
    engine(on,rpm01=0){if(!ctx||!engineOsc)return;engineOsc.frequency.setTargetAtTime(50+110*Math.max(0,Math.min(1,rpm01)),ctx.currentTime,.06);engineFilter.frequency.setTargetAtTime(220+Math.max(0,rpm01)*800,ctx.currentTime,.08);setLoopGain(engineGain,on&&!muted?.075:0);},
    skid(on){if(!ctx||!noiseLoop)return;setLoopGain(noiseLoop.g,on&&!muted?.035:0);},
    siren(on){if(!ctx||!sirenGain)return;const v=on&&!muted?.025:0;setLoopGain(sirenGain,v);if(sirenOsc?._gain2)setLoopGain(sirenOsc._gain2,v);},
    sirenLevel(level){if(!ctx||!sirenGain)return;const v=muted?0:Math.max(0,Math.min(1,level))*.025;setLoopGain(sirenGain,v);if(sirenOsc?._gain2)setLoopGain(sirenOsc._gain2,v);},
    shot(kind='pistol'){if(kind==='fists')return this.punch();if(!active())return;burst(kind==='smg'?.07:.11,kind==='smg'?2800:1600,kind==='smg'?.055:.075);tone(kind==='smg'?1200:760,.035,.025,'square');},
    punch(){burst(.16,750,.045);},hit(){burst(.09,520,.06);tone(90,.12,.04,'triangle');},
    crash(intensity=1){const v=Math.max(.15,Math.min(1.4,intensity));burst(.22,850,.085*v);tone(55,.2,.09*v,'sine');},
    pickup(){note(660,.11,.045,'sine');note(990,.16,.04,'sine',.1);},
    cash(){[523,659,784,1047].forEach((n,i)=>note(n,.13,.035,'triangle',i*.075));},
    missionStart(){[392,523,659].forEach((n,i)=>note(n,.22,.04,'square',i*.12));},
    missionDone(){[523,659,784,1047].forEach((n,i)=>note(n,.2,.045,'triangle',i*.1));},
    bustedSting(){[620,520,390,260].forEach((n,i)=>note(n,.24,.05,'sawtooth',i*.12));},
    wastedSting(){[440,370,294,196].forEach((n,i)=>note(n,.28,.055,'triangle',i*.14));},
    dialogueBlip(){tone(1150,.025,.012,'sine');},
    music(on){musicOn=!!on;if(!musicOn)musicClock=0;},
    update(dt){if(!musicOn||!active())return;musicClock+=dt;const beatDur=60/92/2;while(musicClock>=beatDur){musicClock-=beatDur;const n=musicBeat%16;const bass=[55,55,65.4,82.4][Math.floor(n/4)];note(bass,n%2?.16:.27,.018,'square');if(n===0){[220,261.6,329.6].forEach((f,i)=>note(f,.9,.007,'sine',.04*i));}if(n%2===1)burst(.025,6000,.007);musicBeat++;}},
  };
}
