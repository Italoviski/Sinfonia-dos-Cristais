/* Current learning campaign. All goals end by annulment, never by a Diamond. */
(() => {
 const p=(kind,value,x,y,dark=false,seedGroup=null)=>({kind,value,x,y,dark,seedGroup});
 const q=(v,x,y,dark=false,group=null)=>p('quartz',v,x,y,dark,group);
 const shadow=(kind,values,group=null)=>values.map((v,i)=>p(kind,v,.67+i*.1,.66,true,group));
 const basic=(a,b,fire)=>[q(a,.2,.35),q(b,.4,.35),p('opal',fire,.6,.35),q(a+b-fire,.78,.65,true)];
 const equation=(values,kind='quartz')=>[...values.map((v,i)=>p(kind,v,.18+i*.13,.34)),...shadow(kind,values,'target')];
 const divide=(kind,value,parts,boost=false)=>({pieces:[p(kind,value,.22,.38),...shadow(kind,Array(parts).fill(value/parts*(boost?2:1)))],split:parts,...boost?{portals:[{x:.48,y:.5}]}:{}});
 const levels=[
  {name:'O despertar',hint:'Arraste os Quartzos para juntá-los. Arraste a Opala até o Quartzo. Depois una a luz à sombra igual.',pieces:basic(1,1,1)},
  {name:'Galeria dos ecos',hint:'Toque num cristal e depois no outro para conectar. Não arraste um sobre o outro. Leve a equação até a sombria.',pieces:equation([1,2])},
  {name:'Lago subterrâneo',hint:'Monte as peças na mesma ordem da equação sombria e anule o conjunto.',pieces:equation([2,1,3])},
  {name:'Jardim mineral',hint:'Prepare um Quartzo com três brilhos e conecte-o ao Quartzo com um brilho. Observe a ordem da sombra.',pieces:[q(1,.16,.27),q(2,.34,.27),q(1,.52,.27),...shadow('quartz',[3,1],'target')]},
  {name:'O sussurro da fada',hint:'Use a Opala para reduzir o Quartzo maior. Conecte as duas peças restantes na ordem da sombra.',pieces:[q(4,.18,.3),p('opal',1,.35,.3),q(2,.52,.3),...shadow('quartz',[3,2],'target')]},
  {name:'Clareira das cinzas',hint:'A Esmeralda duplica uma peça apenas uma vez. Atravesse o portal e encontre a sombra.',pieces:[q(2,.22,.42),q(4,.78,.42,true)],portals:[{x:.5,y:.42}]},
  {name:'Trilha das sementes',hint:'Use Dividir e chacoalhe o Citrino, ou selecione-o e pressione Q. Cada parte encontra sua sombra.',...divide('citrine',6,3)},
  {name:'Ponte das raízes',hint:'Divida o Citrino. Passe cada parte pela Esmeralda antes de anular.',...divide('citrine',4,2,true)},
  {name:'Refúgio da onça',hint:'Duplique o Quartzo com dois brilhos, depois conecte-o ao outro Quartzo e encontre a equação sombria.',pieces:[q(2,.2,.3),q(1,.2,.7),...shadow('quartz',[4,1],'target')],portals:[{x:.43,y:.3}]},
  {name:'Coração da floresta',hint:'Divida o Citrino em três partes. Duplique cada parte antes de montar a equação.',pieces:[p('citrine',6,.2,.3),...shadow('citrine',[4,4,4],'target')],split:3,portals:[{x:.46,y:.32}]},
  {name:'Margem esquecida',hint:'Escolha Cortar e deslize sobre a Água-Marinha, ou selecione-a e pressione C. Anule as duas metades.',...divide('aqua',1,2)},
  {name:'Remanso das frações',hint:'Corte em metades e depois em quartos. Cada quarto procura uma sombra igual.',...divide('aqua',1,4)},
  {name:'Travessia das ilhas',hint:'Corte em metades. Conecte as partes e o Quartzo, respeitando a estrutura sombria.',pieces:[p('aqua',1,.2,.3),q(1,.45,.3),p('aqua',.5,.61,.7,true,'target'),p('aqua',.5,.73,.7,true,'target'),q(1,.85,.7,true,'target')]},
  {name:'Nascentes escondidas',hint:'Corte em quartos e reúna três partes por arrasto. Compare as duas sombras.',pieces:[p('aqua',1,.22,.4),...shadow('aqua',[.75,.25])]},
  {name:'Canto das cascatas',hint:'Corte em metades, duplique cada uma na Esmeralda e conecte as duas peças para anular a equação.',pieces:[p('aqua',1,.2,.3),...shadow('aqua',[1,1],'target')],portals:[{x:.46,y:.35}]},
  {name:'Chão rachado',hint:'Reúna o Quartzo, reduza com a Opala e anule a sombra.',pieces:basic(2,3,2)},
  {name:'Cacimba silenciosa',hint:'Reduza o Quartzo maior com a Opala. Conecte as peças restantes na ordem correta.',pieces:[q(5,.18,.3),p('opal',2,.36,.3),q(1,.53,.3),...shadow('quartz',[3,1],'target')]},
  {name:'Trilha do mandacaru',hint:'Divida, duplique cada parte e encontre as sombras correspondentes.',...divide('citrine',9,3,true)},
  {name:'Sombra da jurema',hint:'Prepare três quartos de Água-Marinha e conecte-os ao Quartzo. A estrutura também precisa corresponder.',pieces:[p('aqua',1,.18,.3),q(2,.43,.3),p('aqua',.25,.85,.28,true),p('aqua',.75,.66,.7,true,'target'),q(2,.83,.7,true,'target')]},
  {name:'O florescer do sertão',hint:'Subtraia a Opala, duplique o Quartzo restante e conecte-o à Água-Marinha para restaurar o sertão.',pieces:[q(3,.16,.3),p('opal',1,.31,.3),p('aqua',.5,.2,.73),q(4,.68,.72,true,'target'),p('aqua',.5,.83,.72,true,'target')],portals:[{x:.47,y:.3}]}
 ];
 const worlds=[
  {name:'Caverna',subtitle:'O despertar',healed:'A Fada das Gemas está livre. A jornada pelas gemas primordiais começa.',x:5,y:0,gem:'fairy'},
  {name:'Floresta',subtitle:'O coração da terra',healed:'As folhas e os sons voltam à floresta.',x:60,y:0,gem:'emerald'},
  {name:'Rio das Águas Claras',subtitle:'O canto das nascentes',healed:'A correnteza recupera sua transparência e sua vida.',x:60,y:88,gem:'paraiba'},
  {name:'Caatinga',subtitle:'O florescer do sertão',healed:'A água retorna às cacimbas e a Caatinga floresce.',x:0,y:88,gem:'fire-opal'}
 ];
 window.CrystalCampaign.worlds=worlds;
 window.CrystalCampaign.levels=levels.map((l,i)=>({...l,id:i+1,world:Math.floor(i/5),scene:['C','F','R','S'][Math.floor(i/5)]+(i%5+1),boss:i%5===4,kind:'crystalline',tools:['drag',...(l.pieces.some(p=>p.kind==='aqua')?['cut']:[]),...(l.pieces.some(p=>p.kind==='citrine')?['shake']:[])],goals:['Preparar os cristais','Recuperar a ressonância','Anular todos os cristais']}));
 window.CrystalCampaign.levels.push({id:21,name:'A porta das gemas',world:0,scene:'C5',boss:true,final:true,kind:'crystalline',hint:'As quatro gemas primordiais respondem juntas. Prepare-se para o canto final.',pieces:[],tools:['drag'],goals:['Reunir as quatro gemas','Abrir a porta','Restaurar a última ressonância']});
})();
