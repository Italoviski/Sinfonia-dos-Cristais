/* Matter.js physics, pointer/keyboard controls and data-driven kinetic puzzles. */
(() => {
 'use strict';
 const {Engine,World,Bodies,Body,Events}=Matter;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const equal=(a,b)=>Math.abs(a-b)<.001;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const data=CrystalCampaign;
 class KineticGame {
  constructor(host,callbacks){
   this.host=host;this.callbacks=callbacks;this.engine=Engine.create({enableSleeping:false});
   this.engine.gravity.y=0;this.gems=[];this.devices=[];this.particles=[];this.drags=new Map();
   this.canvas=host.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.active=false;this.paused=false;
   this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);
   host.addEventListener('pointerdown',e=>this.down(e));host.addEventListener('pointermove',e=>this.move(e));
   host.addEventListener('pointerup',e=>this.up(e));host.addEventListener('pointercancel',e=>this.up(e,true));
   host.addEventListener('wheel',e=>{const mirror=e.target.closest('.mirror');if(mirror){e.preventDefault();this.rotate(Number(mirror.dataset.mirror),Math.sign(e.deltaY));}},{passive:false});
   Events.on(this.engine,'collisionStart',event=>{for(const pair of event.pairs){
    const a=pair.bodyA.plugin.gem,b=pair.bodyB.plugin.gem;
    if(a&&b)this.contact(a,b);
    else if(a||b){const g=a||b;if(g.launched){this.flags.bounce=true;this.progress();}if(g.body.speed>1)CrystalAudio.clink();}
   }});
   this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop);
  }
  load(level,options={},snapshot=null){
   this.level=level;this.options=options;this.active=true;this.paused=false;this.finished=false;this.open=false;this.time=0;this.elapsed=0;this.accumulator=0;this.last=performance.now();
   this.flags={};this.earned=new Set();this.annulled=0;this.splitCount=0;this.boostCount=0;this.cutCount=0;this.mergedCount=0;this.drags.clear();this.swipe=null;this.particles=[];this.gems=[];this.devices=[];this.mirrors=[];this.balanceArm=null;
   World.clear(this.engine.world,false);Engine.clear(this.engine);
   this.host.querySelector('#pieces').replaceChildren();this.host.querySelector('#devices').replaceChildren();this.resize();
   this.tool=level.tools.includes('drag')?'drag':level.tools[0];
   this.engine.gravity.y=level.gravity||0;
   for(const spec of level.pieces||[])this.addGem(spec);
   if(level.targets)this.spawnTargets(level.targets,level.kind==='split'||level.kind==='race'?'citrine':'aqua');
   for(const portal of level.portals||[])this.addDevice('portal',portal.x,portal.y);
   if(level.angles)this.makeMirrors(level.angles);
   if(level.hazard)this.addDevice('hazard',.52,.5);
   if(level.kind==='unknown')this.addDevice('unknown',.67,.48);
   if(level.kind==='rhythm')this.addDevice('pendulum',.6,.22);
   if(level.kind==='gear')this.addDevice('gear',.64,.48);
   if(level.kind==='balance')this.makeBalance();
   this.vortex=this.addDevice('vortex',.9,.13);this.vortex.el.classList.add('locked');
   if(snapshot)this.restore(snapshot);
   this.drawGems();this.progress();
  }
  resize(){
   const oldW=this.w||1,oldH=this.h||1;this.w=Math.max(240,this.host.clientWidth);this.h=Math.max(160,this.host.clientHeight);
    this.canvas.width=this.w;this.canvas.height=this.h;this.unit=clamp(Math.min(this.w/13,this.h/5),44,65);
    for(const g of this.gems){const size=this.unit*(g.value>6?1.15:g.value<1?.78:1),ratio=size/g.size;Body.scale(g.body,ratio,ratio);g.size=size;g.r=size*.36;g.el.style.width=size+'px';g.el.style.height=size+'px';Body.setPosition(g.body,this.bounded({x:g.body.position.x/oldW*this.w,y:g.body.position.y/oldH*this.h},g.r));}
   if(this.walls)for(const wall of this.walls)World.remove(this.engine.world,wall);
   this.walls=[Bodies.rectangle(this.w/2,-15,this.w+60,30,{isStatic:true}),Bodies.rectangle(this.w/2,this.h+15,this.w+60,30,{isStatic:true}),Bodies.rectangle(-15,this.h/2,30,this.h+60,{isStatic:true}),Bodies.rectangle(this.w+15,this.h/2,30,this.h+60,{isStatic:true})];
   this.host.querySelectorAll('.wall').forEach(e=>e.remove());
   if(this.level?.walls){for(const [x,y,w,h,a] of [[.46,.18,.018,.23,-.3],[.57,.8,.018,.23,.3]]){
    this.walls.push(Bodies.rectangle(x*this.w,y*this.h,w*this.w,h*this.h,{isStatic:true,angle:a,restitution:.9}));
    const el=document.createElement('div');el.className='wall';el.style.cssText=`left:${x*100}%;top:${y*100}%;width:${w*100}%;height:${h*100}%;transform:translate(-50%,-50%) rotate(${a}rad)`;this.host.querySelector('#devices').append(el);
   }}World.add(this.engine.world,this.walls);
  }
  bounded(p,r){return {x:clamp(p.x,r+3,this.w-r-3),y:clamp(p.y,r+3,this.h-r-3)};}
  addGem(spec){
   const meta=data.gems.find(g=>g.id===spec.kind);if(!meta)throw Error('Tipo de gema inválido');
   const size=this.unit*(spec.value>6?1.15:spec.value<1?.78:1),r=size*.36;
   const pos=this.bounded({x:spec.x*this.w,y:spec.y*this.h},r);
   const body=Bodies.circle(pos.x,pos.y,r,{restitution:.88,friction:0,frictionAir:.045,inertia:Infinity,density:.002});
   const el=document.createElement('button');el.type='button';el.className='gem'+(spec.dark?' dark':'');el.style.width=size+'px';el.style.height=size+'px';
   const visual=document.createElement('span');visual.className='gem-visual';const n=data.gems.indexOf(meta);visual.style.backgroundPosition=`${n%3*50}% ${Math.floor(n/3)*50}%`;
   const pips=document.createElement('span');pips.className='gem-pips';pips.setAttribute('aria-hidden','true');
   const symbol=document.createElement('span');symbol.className='gem-symbol';symbol.textContent=meta.symbol;
   el.append(visual,pips,symbol);
   const g={...spec,dark:!!spec.dark,body,el,pips,size,r,meta,dead:false,cooldown:this.time+.4,activeUntil:0,boosted:false,launched:false,initial:{...pos}};body.plugin.gem=g;
   this.setValue(g,spec.value);el.addEventListener('keydown',e=>this.key(e,g));el.addEventListener('focus',()=>this.callbacks.describe?.(el.getAttribute('aria-label')));
   el.addEventListener('dblclick',e=>{e.preventDefault();g.armed=true;if(this.tool==='shake')this.split(g);});
   this.host.querySelector('#pieces').append(el);World.add(this.engine.world,body);this.gems.push(g);return g;
  }
  setValue(g,value){g.value=Math.round(value*1000)/1000;g.pips.replaceChildren();
   if(value<1){const meter=document.createElement('span');meter.className='fraction-meter';meter.style.setProperty('--fraction',value);g.pips.append(meter);}
   else for(let i=0;i<Math.min(24,Math.ceil(value));i++)g.pips.append(document.createElement('i'));
   const quantity=value===.25?'um quarto':value===.5?'uma metade':value===.75?'três quartos':String(value);
   g.el.setAttribute('aria-label',`${g.dark?'Sombra de ':''}${g.meta.name}, ${quantity} de energia. Setas movem; Espaço ou Enter seleciona, conecta ou cancela. ${g.dark?'Encontre a luz correspondente.':'C corta Água-Marinha; Q divide Citrino.'}`);
  }
  remove(g){if(!g||g.dead)return;g.dead=true;World.remove(this.engine.world,g.body);g.el.remove();for(const [id,d]of this.drags)if(d.g===g)this.drags.delete(id);}
  spawnTargets(values,kind){values.forEach((v,i)=>{
   const cols=values.length>3?2:1,rows=Math.ceil(values.length/cols);this.addGem({kind,value:v,dark:true,x:.72+(i%cols)*.17,y:.24+Math.floor(i/cols)*(.52/Math.max(1,rows-1))});
  });}
  addDevice(type,x,y){
   const el=document.createElement(type==='vortex'?'button':'div');el.className='device '+type+'-device';el.style.left=x*100+'%';el.style.top=y*100+'%';
   const d={type,x,y,el};
   if(type==='portal'){el.innerHTML='<div class="portal-ring"><span class="gem-visual" style="background-position:50% 50%;opacity:.6"></span></div><span class="device-label">Esmeralda</span>';}
   if(type==='vortex'){el.type='button';el.innerHTML='<div class="vortex"></div><span class="gem-visual" style="background-position:100% 100%"></span>';el.setAttribute('aria-label','Diamante de conclusão. Anule os cristais para abrir.');el.style.pointerEvents='auto';el.onclick=()=>this.finish();}
   if(type==='hazard'||type==='unknown'||type==='pendulum'){
    const idx=type==='hazard'?1:type==='unknown'?3:7;el.innerHTML='<span class="gem-visual"></span>';el.style.width=this.unit+'px';el.style.height=this.unit+'px';el.firstChild.style.backgroundPosition=`${idx%3*50}% ${Math.floor(idx/3)*50}%`;
    if(type==='unknown')el.setAttribute('aria-label','Turmalina de medida misteriosa');
   }
   if(type==='gear')el.innerHTML='<div class="gear-device ecology-wheel"></div>';
   this.host.querySelector('#devices').append(el);this.devices.push(d);return d;
  }
  makeMirrors(angles){this.mirrors=angles.map((target,i)=>{
   const x=.31+i*.24,y=.46;const el=document.createElement('button');el.type='button';el.className='device mirror';el.dataset.mirror=i;el.style.left=x*100+'%';el.style.top=y*100+'%';el.style.setProperty('--angle','0deg');el.setAttribute('aria-label',`Topázio ${i+1}, zero graus. Clique, use R ou role para girar.`);
   const sprite=document.createElement('span');sprite.className='gem-visual';sprite.style.backgroundPosition='0% 100%';sprite.style.opacity='.45';el.append(sprite);
   el.onclick=()=>this.rotate(i,1);el.onkeydown=e=>{if(e.key.toLowerCase()==='r'){e.preventDefault();this.rotate(i,1);}};
   this.host.querySelector('#devices').append(el);
   const tx=x+Math.cos(target*Math.PI/2)*.14,ty=y+Math.sin(target*Math.PI/2)*.3;
   const t=document.createElement('div');t.className='device target-ring';t.style.left=tx*100+'%';t.style.top=ty*100+'%';this.host.querySelector('#devices').append(t);
   return {x,y,target,angle:0,el,t,tx,ty};
  });}
  rotate(i,dir=1){if(!this.active||this.paused||!this.mirrors?.[i])return;const m=this.mirrors[i];m.angle=(m.angle+dir+8)%8;m.el.style.setProperty('--angle',m.angle*45+'deg');m.el.setAttribute('aria-label',`Topázio ${i+1}, ${m.angle*45} graus. R gira.`);m.t.classList.toggle('on',m.angle%4===m.target);CrystalAudio.clink();
   this.flags.mirrors=this.mirrors.every(m=>m.angle%4===m.target);
   if(this.flags.mirrors&&this.level.kind==='mirror'&&!this.flags.mirrorPair){this.flags.mirrorPair=true;this.addGem({kind:'topaz',value:3,x:.35,y:.8});this.addGem({kind:'topaz',value:3,x:.72,y:.8,dark:true});this.callbacks.message('Os feixes se encontraram! Una o topázio à sua sombra.');}
   this.progress();this.checkWin();
  }
  makeBalance(){const arm=document.createElement('div');arm.className='balance-arm';this.host.querySelector('#devices').append(arm);this.balanceArm=arm;for(const side of ['left','right']){const el=document.createElement('div');el.className='balance-pan '+side;this.host.querySelector('#devices').append(el);}this.balanceHeld=0;}
  point(e){const r=this.host.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  down(e){if(!this.active||this.paused||this.finished||e.target.closest('.device'))return;const p=this.point(e);const g=this.gems.find(g=>!g.dead&&g.el===e.target.closest('.gem'));
   if(this.tool==='cut'){e.preventDefault();this.swipe={id:e.pointerId,from:p,to:p,started:performance.now()};this.host.setPointerCapture(e.pointerId);return;}
   if(!g)return;e.preventDefault();this.host.setPointerCapture(e.pointerId);
   const now=performance.now();if(now-(g.tapAt||0)<370)g.armed=true;g.tapAt=now;
   this.drags.set(e.pointerId,{g,target:p,origin:{...g.body.position},offset:{x:p.x-g.body.position.x,y:p.y-g.body.position.y},last:p,travel:0,changes:0,sign:0});g.activeUntil=this.time+5;Body.setVelocity(g.body,{x:0,y:0});
   if(this.tool==='rotate'&&this.mirrors?.length)this.rotate(0,1);
  }
  move(e){const p=this.point(e);if(this.swipe?.id===e.pointerId){this.swipe.to=p;return;}const d=this.drags.get(e.pointerId);if(!d)return;
   d.target=this.bounded({x:p.x-d.offset.x,y:p.y-d.offset.y},d.g.r);const dx=p.x-d.last.x,dy=p.y-d.last.y;d.travel+=Math.hypot(dx,dy);const sign=Math.sign(Math.abs(dx)>Math.abs(dy)?dx:dy);if(sign&&d.sign&&sign!==d.sign)d.changes++;if(sign)d.sign=sign;d.last=p;
   if((this.tool==='shake'||d.g.armed)&&d.changes>=3&&d.travel>75)this.split(d.g);
   const same=[...this.drags.values()].filter(v=>v.g===d.g);if(same.length===2&&distance(same[0].target,same[1].target)>this.unit*1.4)this.cut(d.g);
  }
  up(e,cancelled=false){
   if(this.swipe?.id===e.pointerId){const s=this.swipe;this.swipe=null;if(!cancelled&&distance(s.from,s.to)>18)for(const g of [...this.gems])if(!g.dead&&this.lineDistance(g.body.position,s.from,s.to)<g.r+8)this.cut(g);}
   const d=this.drags.get(e.pointerId);if(!d)return;this.drags.delete(e.pointerId);if(d.g.dead)return;
   const p=this.bounded(d.target,d.g.r);Body.setPosition(d.g.body,p);
   if(this.tool==='launch'&&!cancelled){const dx=d.origin.x-p.x,dy=d.origin.y-p.y;this.launch(d.g,{x:dx*.13,y:dy*.13});}
   else{Body.setVelocity(d.g.body,{x:0,y:0});d.g.anchor={...p};d.g.anchorUntil=this.time+.22;d.g.activeUntil=this.time+1;}
   this.checkNearby(d.g);this.drawGems();
  }
  lineDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
  key(e,g){if(this.paused||!this.active||g.dead)return;const k=e.key.toLowerCase();
   const dirs={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]};
   if(dirs[k]){e.preventDefault();const [x,y]=dirs[k];g.heading={x,y};Body.setPosition(g.body,this.bounded({x:g.body.position.x+x*(e.shiftKey?24:12),y:g.body.position.y+y*(e.shiftKey?24:12)},g.r));Body.setVelocity(g.body,{x:0,y:0});g.activeUntil=this.time+2;this.checkNearby(g);}
   if(k===' '||k==='enter'){e.preventDefault();this.launch(g,{x:(g.heading?.x??1)*13,y:(g.heading?.y??0)*13});}
   if(k==='c'){e.preventDefault();this.cut(g);}if(k==='q'){e.preventDefault();this.split(g);}if(k==='r'){e.preventDefault();this.rotate(0,1);}
  }
  rhythmTime(){return window.CrystalMusic?.clock??this.time;}
  inBeat(){const t=this.rhythmTime();return this.options.assist||(Math.min(t%.625,.625-t%.625)<.19&&(this.level.kind!=='rhythm'||Math.floor(t/.625)%4===3));}
  launch(g,v){if((this.level.kind==='rhythm'||this.level.rhythm)&&!this.inBeat()){this.callbacks.message('Espere o anel acender e tente outra vez.');CrystalAudio.error();return;}
   Body.setVelocity(g.body,{x:clamp(v.x,-20,20),y:clamp(v.y,-20,20)});g.launched=true;g.activeUntil=this.time+8;g.anchorUntil=0;this.flags.launched=true;CrystalAudio.launch();
   if(this.level.kind==='rhythm'&&!this.flags.rhythmPair){this.flags.rhythmPair=true;this.flags.sequence=true;this.addGem({kind:'rubellite',value:this.level.target,x:.76,y:.64,dark:true});}
   this.progress();
  }
  cut(g){if(g.dead||g.dark||g.kind!=='aqua'||g.value<=.25)return;if(this.level.rhythm&&!this.inBeat()){this.callbacks.message('Corte quando o anel acender.');return;}
   const p=g.body.position;this.remove(g);for(const side of [-1,1]){const child=this.addGem({kind:'aqua',value:g.value/2,x:(p.x+side*this.unit*.45)/this.w,y:p.y/this.h});child.cooldown=this.time+1;Body.setVelocity(child.body,{x:side*2,y:-1});}
   this.cutCount++;this.flags.cut=true;this.flags.quarters=this.flags.quarters||g.value<=.5;this.burst(p,g.meta.color,22);CrystalAudio.splash();this.progress();
  }
  split(g){if(g.dead||g.dark||g.kind!=='citrine'||g.fragment)return;const n=this.level.split||3,p=g.body.position;this.remove(g);
   for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2;const child=this.addGem({kind:'citrine',value:g.value/n,x:(p.x+Math.cos(a)*this.unit*.65)/this.w,y:(p.y+Math.sin(a)*this.unit*.65)/this.h});child.fragment=true;child.cooldown=this.time+1;Body.setVelocity(child.body,{x:Math.cos(a)*2,y:Math.sin(a)*2});}
   this.splitCount++;this.flags.split=true;this.burst(p,'#ffe3a2',35);CrystalAudio.shatter();this.progress();
  }
  checkNearby(g){if(g.dead)return;for(const other of this.gems)if(other!==g&&!other.dead&&distance(g.body.position,other.body.position)<g.r+other.r+9)this.contact(g,other);}
  contact(a,b){if(a.dead||b.dead||this.time<a.cooldown||this.time<b.cooldown)return;
   const p={x:(a.body.position.x+b.body.position.x)/2,y:(a.body.position.y+b.body.position.y)/2};
   if(a.dark!==b.dark&&a.kind===b.kind&&equal(a.value,b.value)){
    if(this.level.kind==='pinball'&&a.kind==='diamond'&&!this.flags.bounce){this.callbacks.message('Lance o diamante contra uma parede antes de anular.');return;}
    this.remove(a);this.remove(b);this.annulled++;this.burst(p,a.meta.color,36);CrystalAudio.shatter();this.callbacks.message('Luz e sombra se desfizeram!');this.progress();this.checkWin();return;
   }
   const opal=a.kind==='opal'?a:b.kind==='opal'?b:null,stone=opal==a?b:a;
   if(opal&&stone.kind==='quartz'){
    const residue=stone.value-opal.value;this.remove(opal);this.remove(stone);
    if(!equal(residue,0))this.addGem({kind:residue>0?'quartz':'opal',value:Math.abs(residue),x:p.x/this.w,y:p.y/this.h,dark:residue>0?stone.dark:false});
    else this.annulled++;
    this.flags.burn=true;this.burst(p,'#ffb552',32);CrystalAudio.shatter();this.progress();this.checkWin();return;
   }
   const fusionKinds=['fusion','pinball','fraction','gear','current','maze','final'];
   if(!a.dark&&!b.dark&&a.kind===b.kind&&a.kind!=='citrine'&&fusionKinds.includes(this.level.kind)&&(a.activeUntil>this.time||b.activeUntil>this.time)){
    const value=a.value+b.value;if(value>24)return;this.remove(a);this.remove(b);const g=this.addGem({kind:a.kind,value,x:p.x/this.w,y:p.y/this.h});this.mergedCount++;this.flags.fusion=true;if(equal(value,.75))this.flags.threeQuarters=true;
    this.burst(p,a.meta.color,25);this.shake();CrystalAudio.reward(2);
    if(['fusion','pinball'].includes(this.level.kind)&&!this.flags.shadowSpawned&&equal(value,this.level.target)){
     this.flags.shadowSpawned=true;this.addGem({kind:a.kind,value,x:p.x/this.w<.5?.78:.28,y:.5,dark:true});this.callbacks.message('Agora una o cristal à sua versão sombria.');
    }this.progress();return g;
   }
   if(this.time-(this.clinkAt||-1)>.09){CrystalAudio.clink();this.clinkAt=this.time;}
  }
  burst(p,color,count=24){for(let i=0;i<count;i++)this.particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*230,vy:-40-Math.random()*220,life:1.1+Math.random()*.9,color,size:3+Math.random()*6,angle:Math.random()*6});}
  shake(){if(this.options.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;this.host.animate([{transform:'translate(0)'},{transform:'translate(3px,-2px)'},{transform:'translate(-3px,2px)'},{transform:'translate(0)'}],{duration:160});}
  updateDevices(dt){
   for(const d of this.devices){const p={x:d.x*this.w,y:d.y*this.h};
    if(d.type==='pendulum'){d.el.style.transform=`translate(-50%,-50%) rotate(${this.options.motion?0:Math.sin(this.time*3)*30}deg)`;}
    for(const g of this.gems){if(g.dead||g.dark)continue;const gp=g.body.position,near=distance(gp,p);
     if(d.type==='portal'&&near<this.unit*.65&&!g.boosted&&g.kind!=='opal'){
      g.boosted=true;this.boostCount++;this.flags.portal=true;this.setValue(g,g.value*2);Body.setVelocity(g.body,{x:g.body.velocity.x*1.8+3,y:g.body.velocity.y*1.8});this.burst(gp,'#a0ff9c',28);CrystalAudio.reward(1);this.progress();
     }
     if(d.type==='hazard'&&near<this.unit*.75&&this.time>g.cooldown){Body.setPosition(g.body,g.initial);Body.setVelocity(g.body,{x:0,y:0});g.cooldown=this.time+1;this.burst(p,'#ff8b4a',20);CrystalAudio.error();this.callbacks.message('A chama desviou sua luz. Tente uma tabela por outro caminho.');}
     if(d.type==='unknown'&&near<this.unit*.8&&this.time>g.cooldown){this.flags.test=true;g.cooldown=this.time+1;this.progress();
      if(equal(g.value,this.level.secret)&&!this.flags.unknown){this.flags.unknown=true;d.el.style.opacity='.15';this.remove(g);for(const extra of this.gems)if(!extra.dark&&extra.kind==='quartz')this.remove(extra);this.addGem({kind:'tourmaline',value:this.level.secret,x:.36,y:.5});this.addGem({kind:'tourmaline',value:this.level.secret,x:.76,y:.5,dark:true});this.burst(p,'#79ffff',36);this.callbacks.message('Você descobriu! Anule a turmalina e sua sombra.');CrystalAudio.reward(3);this.progress();}
      else if(!this.flags.unknown){Body.setVelocity(g.body,{x:-7,y:(Math.random()-.5)*3});this.burst(p,'#7ddaff',g.value<this.level.secret?5:22);this.callbacks.message(g.value<this.level.secret?'Falta brilho: experimente uma pedra maior.':'Sobra brilho: experimente uma pedra menor.');CrystalAudio.error();}
     }
    }
   }
   if(this.level.kind==='balance'&&!this.flags.balanced){const live=this.gems.filter(g=>!g.dead&&!g.dark);const on=(x)=>live.filter(g=>Math.abs(g.body.position.x/this.w-x)<.13&&Math.abs(g.body.position.y/this.h-.62)<.16);const left=on(.25),right=on(.75),lv=left.reduce((s,g)=>s+g.value,0),rv=right.reduce((s,g)=>s+g.value,0);
    this.balanceArm.style.transform=`rotate(${clamp((lv-rv)*2,-14,14)}deg)`;
    if(lv>0&&equal(lv,rv)&&this.flags.portal)this.balanceHeld+=dt;else this.balanceHeld=0;
    if(this.balanceHeld>1){this.flags.balanced=true;this.spawnTargets([6,6],'quartz');this.callbacks.message('O terreno se equilibrou! Agora anule as duas sombras.');CrystalAudio.reward(3);this.progress();}
   }
  }
  progress(){
   const f=this.flags,l=this.level,empty=this.gems.every(g=>g.dead),m=this.mirrors||[];
   let conditions=[];
   switch(l.kind){
    case 'fusion':conditions=[f.fusion,this.annulled>0,this.finished];break;
    case 'burn':conditions=[f.burn,empty,this.finished];break;
    case 'pinball':conditions=[f.bounce,f.fusion,this.annulled>0,this.finished];break;
    case 'mirror':conditions=[m[0]?.angle%4===m[0]?.target,m[1]?.angle%4===m[1]?.target,m[2]?.angle%4===m[2]?.target,this.annulled>0,this.finished];break;
    case 'portal':conditions=[f.portal,this.annulled>0,this.finished];break;
    case 'split':conditions=[f.split,this.annulled>=l.targets.length,this.finished];break;
    case 'race':conditions=[this.splitCount>=l.pieces.length,this.boostCount>=l.targets.length,this.annulled>=l.targets.length,this.finished];break;
    case 'balance':conditions=[f.portal,f.balanced,empty&&f.balanced,this.finished];break;
    case 'slice':conditions=[f.cut,this.annulled>=2,this.finished];break;
    case 'fraction':conditions=[f.quarters,f.threeQuarters,empty,this.finished];break;
    case 'current':conditions=l.id===14?[f.cut,f.burn,empty,this.finished]:[f.cut,empty,this.finished];break;
    case 'gear':conditions=[f.cut,this.mergedCount>0,empty,this.finished];break;
    case 'rhythm':conditions=[f.sequence,f.launched,this.annulled>0,this.finished];break;
    case 'unknown':conditions=[f.test,f.unknown,this.annulled>0,this.finished];break;
    case 'maze':conditions=[f.cut,f.portal,f.mirrors,empty,this.finished];break;
    case 'final':conditions=[f.cut,f.portal,f.launched,empty,this.finished];break;
   }
   for(let i=0;i<conditions.length;i++)if(conditions[i]&&!this.earned.has(i)){this.earned.add(i);this.callbacks.progress(this.earned.size,l.goals.length,i);}
  }
  checkWin(){if(this.finished||this.open)return;this.progress();const empty=this.gems.every(g=>g.dead);if(!empty)return;
   if(this.level.angles&&!this.flags.mirrors)return;
   if(this.level.kind==='pinball'&&!this.flags.bounce){this.callbacks.message('Falta uma tabela. Lance o diamante contra uma parede.');if(!this.flags.lastBounce){this.flags.lastBounce=true;this.addGem({kind:'diamond',value:1,x:.3,y:.5});this.addGem({kind:'diamond',value:1,x:.74,y:.5,dark:true});}return;}
   if(this.level.kind==='rhythm'&&!this.flags.launched)return;if(this.level.rhythm&&!this.flags.launched)return;
   this.open=true;this.vortex.el.classList.remove('locked');this.vortex.el.setAttribute('aria-label','Diamante aberto. Ativar para a apresentação final.');this.vortex.el.focus();
   const gear=this.host.querySelector('.gear-device .gear-device');if(gear)gear.classList.add('clean');this.callbacks.message('Tudo em equilíbrio! Toque no diamante para ouvir sua sinfonia.');
  }
  finish(){if(!this.open||this.finished){if(!this.open)this.callbacks.message('Anule os cristais e complete as transformações para despertar o diamante.');return;}this.finished=true;this.progress();this.burst({x:this.w*.9,y:this.h*.13},'#e2fdff',80);this.callbacks.complete();}
  loop(now){const measured=window.CrystalPerformance?.begin(now,this.active&&!this.paused&&!this.finished);const dt=Math.min(.05,(now-(this.last||now))/1000);this.last=now;
   if(this.active&&!this.paused&&!document.hidden&&!this.finished){this.time+=dt;this.elapsed+=dt;this.accumulator+=dt;
    // Reuse each gem's drag reference across the fixed physics steps.
    for(const g of this.gems)g.currentDrag=null;
    for(const drag of this.drags.values())drag.g.currentDrag=drag;
    while(this.accumulator>=1/120){this.accumulator-=1/120;
     for(const g of this.gems){if(g.dead)continue;const d=g.currentDrag;
      if(d){const p=g.body.position;Body.setPosition(g.body,{x:p.x+(d.target.x-p.x)*.26,y:p.y+(d.target.y-p.y)*.26});Body.setVelocity(g.body,{x:0,y:0});}
      else if(g.anchorUntil>this.time){Body.setPosition(g.body,g.anchor);Body.setVelocity(g.body,{x:0,y:0});}
      else if(this.level.wind||this.level.current)Body.applyForce(g.body,g.body.position,{x:(this.level.wind||this.level.current)*g.body.mass,y:0});
      if(g.body.speed<.08&&!this.level.gravity&&!this.level.wind&&!this.level.current)Body.setVelocity(g.body,{x:0,y:0});
     }
     Engine.update(this.engine,1000/120);
     for(const g of this.gems)if(!g.dead){const p=this.bounded(g.body.position,g.r);if(distance(p,g.body.position)>.1)Body.setPosition(g.body,p);}
    }
    this.updateDevices(dt);this.drawGems();
    if(this.level.time&&!this.options.assist){const left=Math.max(0,this.level.time-this.elapsed);this.callbacks.timer(Math.ceil(left));if(left===0){this.paused=true;this.callbacks.timeout();}}
   }
   if(this.active&&!this.paused&&!document.hidden)this.drawEffects(dt);window.CrystalPerformance?.end(measured);this.raf=requestAnimationFrame(this.loop);
  }
  drawGems(){for(const g of this.gems)if(!g.dead)g.el.style.transform=`translate(${g.body.position.x-g.size/2}px,${g.body.position.y-g.size/2}px)`;}
  drawEffects(dt){const c=this.ctx;c.clearRect(0,0,this.w,this.h);
   for(const m of this.mirrors||[]){const x=m.x*this.w,y=m.y*this.h,good=m.angle%4===m.target;c.lineWidth=3;c.strokeStyle=good?'#a2ffda':'#b591df88';c.beginPath();c.moveTo(x,y-this.h*.25);c.lineTo(x,y);const angle=m.angle*Math.PI/2;c.lineTo(x+Math.cos(angle)*this.w*.14,y+Math.sin(angle)*this.h*.3);c.stroke();}
   if(this.level.kind==='rhythm'||this.level.rhythm){const t=this.rhythmTime()%.625/.625;c.strokeStyle=this.inBeat()?'#e9b5ff':'#6d547e';c.lineWidth=this.inBeat()?5:2;c.beginPath();c.arc(this.w*.59,this.h*.22,22+t*14,0,Math.PI*2);c.stroke();
    if(this.level.kind==='rhythm'){const count=[2,4,6,8][Math.floor(this.rhythmTime()/.625)%4];c.fillStyle='#ffb9e7';for(let i=0;i<count;i++)c.fillRect(this.w*.59-25+i*7,this.h*.22+45,4,4);}
   }
   for(const d of this.drags.values())if(this.tool==='launch'){c.setLineDash([5,7]);c.strokeStyle='#cfb1ff';c.lineWidth=3;c.beginPath();c.moveTo(d.origin.x,d.origin.y);c.lineTo(d.target.x,d.target.y);c.stroke();c.setLineDash([]);}
   if(this.swipe){c.strokeStyle='#a5f8ff';c.lineWidth=4;c.beginPath();c.moveTo(this.swipe.from.x,this.swipe.from.y);c.lineTo(this.swipe.to.x,this.swipe.to.y);c.stroke();}
   this.particles=this.particles.filter(p=>p.life>0);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=270*dt;p.angle+=dt*3;c.globalAlpha=Math.min(1,p.life);c.fillStyle=p.color;c.save();c.translate(p.x,p.y);if(!this.options.motion)c.rotate(p.angle);c.fillRect(-p.size/2,-p.size/2,p.size,p.size*.6);c.restore();}c.globalAlpha=1;
  }
  snapshot(){return {pieces:this.gems.filter(g=>!g.dead).map(g=>({kind:g.kind,value:g.value,dark:g.dark,x:g.body.position.x/this.w,y:g.body.position.y/this.h,boosted:g.boosted,fragment:!!g.fragment,launched:g.launched})),flags:{...this.flags},earned:[...this.earned],annulled:this.annulled,splitCount:this.splitCount,boostCount:this.boostCount,cutCount:this.cutCount,mergedCount:this.mergedCount,elapsed:this.elapsed,angles:(this.mirrors||[]).map(m=>m.angle),open:this.open};}
  restore(s){for(const g of this.gems)this.remove(g);this.gems=[];for(const spec of s.pieces){const g=this.addGem(spec);g.boosted=!!spec.boosted;g.fragment=!!spec.fragment;g.launched=!!spec.launched;}
   this.flags={...s.flags};this.earned=new Set(s.earned);for(const key of ['annulled','splitCount','boostCount','cutCount','mergedCount','elapsed'])this[key]=s[key]||0;
   if(s.angles&&this.mirrors)s.angles.forEach((a,i)=>{const m=this.mirrors[i];if(m){m.angle=a;m.el.style.setProperty('--angle',a*45+'deg');m.t.classList.toggle('on',a%4===m.target);}});
   this.checkWin();
  }
  stop(){this.active=false;this.drags.clear();this.swipe=null;this.paused=true;}
 }
 window.KineticGame=KineticGame;
})();
