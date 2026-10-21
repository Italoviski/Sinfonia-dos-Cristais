import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
globalThis.window=globalThis;
await import('../js/campaign.js');await import('../js/campaign-current.js');await import('../js/rules.js');
for(const level of CrystalCampaign.levels)test(`fase ${level.id}: solução matemática e cenário`,()=>{
 const b=new CrystalRules.Board(),groups=new Map();for(const spec of level.pieces){const p=b.add(spec);if(spec.seedGroup){if(!groups.has(spec.seedGroup))groups.set(spec.seedGroup,[]);groups.get(spec.seedGroup).push(p.id);}}for(const ids of groups.values())b.group(ids);
 const normal=()=>[...b.pieces.values()].filter(p=>!p.dark),kind=k=>normal().filter(p=>p.kind===k),drag=(a,c)=>b.dragOnto(a.id,c.id).pieces||[],split=a=>b.split(a.id,a.kind==='aqua'?2:level.split).pieces;
 const connect=list=>{let first=list[0];for(const p of list.slice(1))b.connect(first.id,p.id);};
 const annul=()=>{let changed=true;while(changed){changed=false;for(const a of normal()){if(!b.pieces.has(a.id))continue;const target=[...b.pieces.values()].find(p=>p.dark&&b.matches(a.id,p.id));if(target){b.annul(a.id,target.id);changed=true;}}}};
 const burn=()=>drag(kind('opal')[0],kind('quartz').sort((a,c)=>c.value.value-a.value.value)[0])[0];
 const quarters=()=>{for(const half of split(kind('aqua')[0]))split(half);};
 switch(level.id){
 case 1:case 16:{const qs=kind('quartz');drag(qs[0],qs[1]);burn();break;}
 case 2:case 3:connect(normal());break;
 case 4:{const qs=kind('quartz');const fused=drag(qs[0],qs[1])[0];connect([fused,qs[2]]);break;}
 case 5:case 17:{const rem=burn();connect([rem,...kind('quartz').filter(p=>p!==rem)]);break;}
 case 6:b.boost(kind('quartz')[0].id);break;
 case 7:split(kind('citrine')[0]);break;
 case 8:case 18:for(const p of split(kind('citrine')[0]))b.boost(p.id);break;
 case 9:{const q=kind('quartz')[0];b.boost(q.id);connect(kind('quartz'));break;}
 case 10:{const parts=split(kind('citrine')[0]);parts.forEach(p=>b.boost(p.id));connect(parts);break;}
 case 11:split(kind('aqua')[0]);break;
 case 12:quarters();break;
 case 13:{const parts=split(kind('aqua')[0]);connect([...parts,...kind('quartz')]);break;}
 case 14:case 19:{quarters();const parts=kind('aqua');let merged=drag(parts[0],parts[1])[0];merged=drag(merged,parts[2])[0];annul();if(level.id===19)connect([merged,...kind('quartz')]);break;}
 case 15:{const parts=split(kind('aqua')[0]);parts.forEach(p=>b.boost(p.id));connect(parts);break;}
 case 20:{const q=burn();b.boost(q.id);connect([q,...kind('aqua')]);break;}
 }
 annul();assert.equal(b.pieces.size,0,'Todas as peças e equações devem poder ser anuladas');assert.ok(existsSync(new URL(`../assets/story/cenarios/${level.scene}-quatro-estados.png`,import.meta.url)));assert.ok(!level.tools.includes('launch'));
});
test('CrystalChallenges permite alterar desafios das fases 1 a 5 sem alterar as animações da cena',()=>{
 assert.ok(globalThis.CrystalChallenges,'CrystalChallenges deve estar exposto globalmente');
 const orig=CrystalChallenges.getLevelChallenge(1);
 const origLevel=CrystalCampaign.levels[0];
 assert.equal(origLevel.scene,'C1');
 assert.equal(origLevel.landmark,'door-outcrop');
 const updated=CrystalChallenges.updateChallenge(1,{hint:'Nova dica de teste na Caverna.'});
 assert.equal(updated.hint,'Nova dica de teste na Caverna.');
 assert.equal(updated.scene,'C1','A cena de animação deve permanecer intacta');
 assert.equal(updated.landmark,'door-outcrop','O landmark de animação deve permanecer intacto');
 assert.deepEqual(updated.whispers,origLevel.whispers,'Os sussurros da cena devem permanecer intactos');
 CrystalChallenges.updateChallenge(1,{hint:orig.hint});
});
