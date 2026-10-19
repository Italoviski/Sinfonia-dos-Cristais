(() => {
 'use strict';
 const dialog=document.createElement('dialog');dialog.className='story-dialog';dialog.setAttribute('aria-labelledby','story-speaker');dialog.setAttribute('aria-describedby','story-line');document.body.append(dialog);
 const cinema=document.createElement('div');cinema.className='story-cinema';cinema.hidden=true;cinema.setAttribute('aria-hidden','true');document.body.append(cinema);
 const portraits={fairy:'fada',araci:'araci',irece:'irece',jurema:'jurema'};
 const introductions={
  1:[['Sussurro','Você desperta em uma caverna desconhecida. Uma porta antiga chama sua atenção…','door-empty'],['Sussurro','Olhe para os cristais flutuando. Arraste um Quartzo até outro para unir seus brilhos.'],['Sussurro','A Opala de Fogo retira brilho por arrastamento. Prepare o cristal e aproxime-o da sua versão sombria: os dois precisam se anular.'],['Sussurro','No alto estão o mapa, o reinício e as configurações. À direita, acompanhe suas etapas. Cada etapa recupera uma parte da música.']],
  2:[['Sussurro','Agora vamos formar uma equação cristalina. Toque em um cristal e depois em outro para conectá-los, sem fundi-los. Toque no mesmo cristal para cancelar a seleção.'],['Sussurro','A equação sombria precisa encontrar sua correspondente: os mesmos tipos, valores, ordem e estrutura. Arraste a alça para mover o conjunto.'],['Sussurro','Você recebeu dez Diamantes bônus. Eles desfazem conexões normais sem mudar os valores. Arraste um Diamante até a equação, ou selecione um cristal conectado e use o botão do Diamante.']],
  5:[['Sussurro','Aqui em cima… Os sussurros vêm do enorme cristal no teto. Há uma silhueta de asas presa dentro dele.'],['Sussurro','Anule as equações e liberte a ressonância que me mantém aqui.']],
  6:[['Fada das Gemas','A floresta sofreu com o desmatamento e as queimadas. As árvores perderam suas folhas, o solo secou e o silêncio tomou conta da mata.'],['Fada das Gemas','A Esmeralda, Gema Primordial da Terra, perdeu sua ressonância e adormeceu no coração da floresta. Precisamos devolver o equilíbrio a este lugar.']],
  11:[['Fada das Gemas','Efluentes e resíduos poluíram o Rio das Águas Claras. A água ficou turva, as cascatas pararam e a vida aquática está sufocando.'],['Fada das Gemas','A Turmalina Paraíba, Gema Primordial da Água, perdeu sua ressonância. Vamos ajudar a correnteza a recuperar sua vida.']],
  16:[['Fada das Gemas','O calor excessivo e o desgaste do solo trouxeram uma seca extrema. As cacimbas secaram, o chão se abriu em fendas e a poeira cobriu a paisagem.'],['Fada das Gemas','A Opala de Fogo, Gema Primordial do Sol e da Terra, perdeu seu brilho sob as areias. Vamos recuperar a água e o equilíbrio da Caatinga.']],
  21:[['Fada das Gemas','Voltamos ao começo da caverna. As quatro gemas primordiais estão reunidas nos seus encaixes.','door-full'],['Fada das Gemas','Minha gema, a Esmeralda, a Turmalina Paraíba e a Opala de Fogo: quatro vozes, uma canção. Vamos despertar a porta!','door-full']]
 };
 let settle=null,lines=[],index=0,options={},lastFocus;
 function scene(kind){cinema.hidden=!kind;if(!kind)return;const opening=kind.startsWith('open-'),frame=opening?Number(kind.slice(5)):({'door-empty':0,'door-fairy':1,'door-earth':2,'door-full':3}[kind]??0);cinema.style.backgroundImage=`url('assets/story/interface-extra/${opening?'porta-abertura':'porta-estados'}.png')`;cinema.style.backgroundPosition=`${frame%2*100}% ${Math.floor(frame/2)*100}%`;}
 function render(){const [speaker,text,art,person]=lines[index];scene(art);dialog.replaceChildren();const portrait=document.createElement('div');portrait.className='story-portrait';portrait.setAttribute('aria-hidden','true');const who=portraits[person||'fairy'];portrait.style.backgroundImage=`url('assets/story/personagens/${who}-16-quadros${who==='fada'?'-v1':''}.png')`;portrait.hidden=speaker==='Sussurro';
  const copy=document.createElement('div');copy.className='story-copy';const name=document.createElement('h2');name.id='story-speaker';name.textContent=speaker;const p=document.createElement('p');p.id='story-line';p.textContent=text;const count=document.createElement('span');count.className='story-count';count.textContent=`${index+1} / ${lines.length}`;const next=document.createElement('button');next.className='pixel-button primary';next.textContent=index===lines.length-1?'Continuar':'Próximo';next.onclick=advance;copy.append(name,p,count,next);dialog.append(portrait,copy);next.focus();options.speak?.(`${speaker}. ${text}`);
 }
 function advance(){if(++index<lines.length)render();else close();}
 function close(){if(dialog.open)dialog.close();cinema.hidden=true;window.speechSynthesis?.cancel();const resolve=settle;settle=null;resolve?.();lastFocus?.isConnected&&lastFocus.focus();}
 function show(items,config={}){close();if(!items?.length)return Promise.resolve();lines=items;index=0;options=config;lastFocus=document.activeElement;return new Promise(resolve=>{settle=resolve;dialog.showModal();render();});}
 dialog.addEventListener('cancel',e=>{e.preventDefault();advance();});
 const before={
  5:[['Fada das Gemas','Você me libertou! Era minha voz que ecoava dentro do cristal. Agora, acompanhe meu canto: espere o anel encontrar o círculo atrás de cada cristal.']],
  10:[['Araci','Sou Araci, a Guarda Florestal. Meu maracá guarda o ritmo das sementes. Vamos cantar com a Fada e despertar o coração da mata.',null,'araci']],
  15:[['Irecê','Sou Irecê, protetora das nascentes. Minha flauta acompanha o canto das águas. Siga o ritmo e deixe a correnteza voltar a respirar.',null,'irece']],
  20:[['Jurema','Sou Jurema, Guardiã da Caatinga. A rabeca chama a renovação. No compasso do sertão, a água e as flores vão voltar.',null,'jurema']]
 };
 const after={
  5:[['Fada das Gemas','Esta é minha Gema Primordial. Seu primeiro encaixe despertou.','door-fairy'],['Fada das Gemas','A porta guarda o caminho para restaurar o equilíbrio do mundo. Ainda precisamos encontrar a Esmeralda da floresta, a Turmalina Paraíba do rio e a Opala de Fogo da Caatinga.','door-fairy'],['Fada das Gemas','Vou liberar a passagem. Lá fora começa nossa jornada!']],
  10:[['Fada das Gemas','A Esmeralda despertou. A floresta recupera folhas, abrigo e vida. Mais uma voz se une à nossa jornada.','door-earth']],
  15:[['Fada das Gemas','A Turmalina Paraíba foi libertada. As águas voltam a correr claras e a vida aquática pode respirar. Falta a Opala de Fogo.']],
  20:[['Fada das Gemas','A Opala de Fogo despertou! A água brota das rochas, o solo se veste de verde e os mandacarus florescem. As quatro gemas estão reunidas.','door-full'],['Fada das Gemas','Volte à fase final, no início do mundo da Caverna. A porta está esperando nossa última canção.','door-full']],
  21:[['Fada das Gemas','As quatro ressonâncias se encontraram. A porta está se abrindo!','open-1'],['Fada das Gemas','Cada cristal, cada nota e cada pequeno gesto ajudou a restaurar este mundo.','open-2'],['Fada das Gemas','O caminho está livre. Que nossa canção continue cuidando da vida!','open-3']]
 };
 window.CrystalStory={intro:(id,config)=>show(introductions[id],config),beforeMusic:async(id,config)=>{if(id===5)await window.CrystalStage?.release();if(!document.getElementById('game').hidden)await show(before[id],config);},afterMusic:(id,config)=>show(after[id],config),close,get active(){return dialog.open;}};
})();
