/* Shared decoded atlas; two opacity layers crossfade on the compositor. */
(() => {
 let ticket=0,current=0,active=null,desired=0,displayed=-1,sceneId=null;
 const layers=[],cache=new Map();
 function preload(id){if(!cache.has(id)){const image=new Image();image.src=id==='door'?'assets/story/interface-extra/porta-estados.png':`assets/story/cenarios/${id}-quatro-estados.png`;cache.set(id,image.decode().then(()=>image).catch(()=>null));}return cache.get(id);}
 const host=document.createElement('div');host.className='restoration-scene';host.setAttribute('aria-hidden','true');document.getElementById('game').prepend(host);
 for(let i=0;i<2;i++){const layer=document.createElement('div');layer.className='restoration-layer';host.append(layer);layers.push(layer);}
 function show(index,instant=false){if(!active||displayed===index)return;displayed=index;const next=1-current,layer=layers[next];layer.style.transition=instant?'none':'';layer.style.backgroundImage=`url("${active.src}")`;layer.style.backgroundPosition=`${index%2*100}% ${Math.floor(index/2)*100}%`;layer.style.opacity='1';layers[current].style.opacity='0';current=next;}
 window.CrystalScenery={async load(id){const token=++ticket;sceneId=id;desired=id==='door'?3:0;displayed=-1;active=null;layers.forEach(l=>l.style.opacity='0');host.classList.add('loading');const image=await preload(id);if(token!==ticket)return;if(image){active=image;show(desired,true);}host.classList.remove('loading');},setProgress(ratio){desired=sceneId==='door'?3:Math.min(3,Math.floor(Math.max(0,ratio)*3));show(desired);},preload};
})();
