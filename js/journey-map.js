(() => {
 const coordinates=[[27.8,25.6],[20.0,26.7],[20.0,35.0],[25.3,38.9],[32.2,38.9],[40.9,52.8],[48.3,52.8],[54.7,52.8],[56.6,60.6],[65.3,61.7],[65.3,32.8],[65.3,21.7],[71.2,20.8],[77.2,20.8],[80.0,31.9],[80.6,51.4],[81.1,68.9],[70.8,81.1],[68.8,93.8],[56.2,95.8]];
 const finalPedestal=[30.8,64.0];
 const route=[...coordinates.slice(0,5),[36.0,46.0],...coordinates.slice(5,10),[65.3,47.0],[65.3,40.0],...coordinates.slice(10,15),[80.3,42.0],...coordinates.slice(15,20),[45.0,95.0],[32.0,92.0],[28.0,80.0],[36.0,72.0],[46.0,66.0],[38.0,64.0],finalPedestal];
 const screen=document.getElementById('map'),root=document.createElement('div');root.className='journey-map';screen.append(root);
 const fairy=document.createElement('div');fairy.className='journey-fairy';fairy.setAttribute('aria-hidden','true');root.append(fairy);
 window.TruePixelEngine?.ActorAnimator?.adaptMapFairyIcon?.();
 const dialog=document.createElement('dialog');dialog.className='journey-dialog';dialog.setAttribute('aria-labelledby','journey-title');document.body.append(dialog);
 let state,selected=null,at=0,travel=null,position=coordinates[0],last=0;
 const setPosition=(p)=>{position=p;fairy.style.left=p[0]+'%';fairy.style.top=p[1]+'%';};setPosition(position);
 function panel(level){const w=level.world,record=state.records?.[level.id];dialog.dataset.world=w;dialog.style.setProperty('--panel-x',(w%2)*100+'%');dialog.style.setProperty('--panel-y',Math.floor(w/2)*100+'%');dialog.replaceChildren();
  const title=document.createElement('h2');title.id='journey-title';title.textContent=level.name;const stars=document.createElement('div');stars.className='journey-stars';stars.setAttribute('aria-label',`${record?.stars||0} de 3 estrelas`);stars.textContent=Array.from({length:3},(_,i)=>i<(record?.stars||0)?'★':'☆').join(' ');
  const info=document.createElement('p');info.textContent=record?`Melhor desempenho: ${record.points} pontos`:'Fase inédita · conquiste suas estrelas';
  const start=document.createElement('button');start.className='journey-begin';start.textContent='Começar';start.onclick=()=>{dialog.close();state.start(level.id);};const back=document.createElement('button');back.className='journey-back';back.textContent='Voltar';back.onclick=()=>dialog.close();dialog.append(title,stars,info,start,back);dialog.showModal();start.focus();
 }
 function select(level){if(travel){if(selected===level.id){travel=null;setPosition(level.id===21?finalPedestal:coordinates[level.id-1]);panel(level);}return;}if(selected===level.id){panel(level);return;}selected=level.id;
  const target=level.id===21?route.length-1:route.findIndex(p=>p===coordinates[level.id-1]);const points=[position];const direction=target>=at?1:-1;for(let i=at+direction;direction>0?i<=target:i>=target;i+=direction)points.push(route[i]);at=target;
  if(state.reduced||points.length<2){setPosition(points.at(-1));state.notify('A Fada chegou. Selecione a fase novamente para abrir.');return;}
  travel={points,index:0,progress:0};state.notify('A Fada está seguindo o caminho.');
 }
 function frame(now){const dt=Math.min(.04,(now-(last||now))/1000);last=now;if(!screen.hidden&&!document.hidden){if(travel){const a=travel.points[travel.index],b=travel.points[travel.index+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);travel.progress+=dt*22/Math.max(.1,length);const f=Math.min(1,travel.progress);setPosition([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);if(f===1){travel.index++;travel.progress=0;if(travel.index===travel.points.length-1){travel=null;state.notify('A Fada chegou. Clique novamente na fase para abrir.');}}}fairy.style.backgroundPosition=`${Math.floor(now/170)%4/3*100}% ${travel?100:0}%`;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 window.CrystalJourney={render(options){state=options;travel=null;selected=null;root.querySelectorAll('button').forEach(b=>b.remove());const activeId=Math.min(21,Math.max(1,options.current||options.unlocked||1));const startPoint=activeId===21?finalPedestal:coordinates[activeId-1];at=Math.max(0,route.findIndex(p=>p===startPoint));setPosition(startPoint);
  for(const level of CrystalCampaign.levels){const point=level.id===21?finalPedestal:coordinates[level.id-1];const button=document.createElement('button');button.className='journey-node';button.dataset.level=level.id;button.style.left=point[0]+'%';button.style.top=point[1]+'%';const locked=false;button.classList.toggle('locked',locked);button.classList.toggle('done',options.completed.includes(level.id));button.classList.toggle('current',level.id===activeId);button.setAttribute('aria-label',`${level.id===21?'Fase final':`Fase ${level.id}`}: ${level.name}. ${options.completed.includes(level.id)?'Concluída':'Disponível'}`);button.setAttribute('aria-disabled','false');button.onclick=()=>select(level);root.append(button);}
 },get moving(){return !!travel;},close(){travel=null;if(dialog.open)dialog.close();}};
})();
