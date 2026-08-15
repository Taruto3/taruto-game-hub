const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const SAVE_KEY="taruto-quest-save-v2",SCORE_KEY="taruto-quest-best-score",MAX_LEVEL=50;
const stages=[
  {name:"はじまりの草原",chapter:"CHAPTER 1",gate:5,quota:3,boss:"mayu",enemies:[
    ["ぷるぷるゼリー","🟢"],["いたずらカラス","🐦‍⬛"],["みはりネコ","🐈‍⬛"],["おおきなアヒル","🦆"]]},
  {name:"木漏れ日の森",chapter:"CHAPTER 2",gate:10,quota:4,enemies:[
    ["まほうキノコ","🍄"],["森のオオカミ","🐺"],["どんぐり兵","🌰"],["ねむねむフクロウ","🦉"]]},
  {name:"夕暮れの洞窟",chapter:"CHAPTER 3",gate:20,quota:5,enemies:[
    ["ねむねむコウモリ","🦇"],["ごろごろ岩","🪨"],["どくどくヘビ","🐍"],["洞窟グモ","🕷️"]]},
  {name:"ドラゴンの山",chapter:"CHAPTER 4",gate:30,quota:5,enemies:[
    ["あばれイノシシ","🐗"],["こおりの精","❄️"],["空飛ぶトカゲ","🦎"],["ファイアドラゴン","🐉"]]},
  {name:"おやつ魔王城",chapter:"CHAPTER 5",gate:40,quota:6,enemies:[
    ["やみの番犬","🐕‍🦺"],["ひとくい宝箱","🧰"],["よろい兵","🛡️"],["魔王の手下","👿"]]},
  {name:"こうきの間",chapter:"FINAL CHAPTER",gate:50,quota:7,boss:"kouki",enemies:[
    ["闇のドラゴン","🐲"],["最強の番犬","🐺"],["魔界の騎士","♞"],["おやつの魔人","👹"]]}
];
const miniBosses=[
  {name:'大空のワシ',icon:'🦅'},
  {name:'はらぺこコヨーテ',icon:'🐺'},
  {name:'どく牙のマムシ',icon:'🐍'},
  {name:'山のツキノワグマ',icon:'🐻'},
  {name:'魔城のオオヤマネコ',icon:'🐆'},
  {name:'猛突進イノシシ王',icon:'🐗'}
];
let state,battle,busy=false,sound=true;
const musicTracks={
  title:{src:'assets/mayu-kawaii-8bit.mp3',volume:.22,loop:true},map:{src:'assets/mayu-kawaii-8bit.mp3',volume:.18,loop:true},
  regular:{src:'assets/audio/quest-regular.ogg',volume:.24,loop:true},miniboss:{src:'assets/audio/quest-miniboss.mp3',volume:.27,loop:true},
  mayu:{src:'assets/audio/quest-mayu.mp3',volume:.25,loop:true},kouki1:{src:'assets/audio/quest-kouki-phase1.mp3',volume:.27,loop:true},
  kouki2:{src:'assets/audio/quest-kouki-phase2.ogg',volume:.29,loop:true},victory:{src:'assets/audio/quest-victory.mp3',volume:.28,loop:false}
};
const musicPlayers=Object.fromEntries(Object.entries(musicTracks).map(([key,track])=>{const audio=new Audio(track.src);audio.loop=track.loop;audio.volume=track.volume;audio.preload='auto';return[key,audio]}));
let currentMusicKey='title';
const skills={spin:{name:'くるん',mp:3,speed:12},bite:{name:'かみつき',mp:5,speed:-3},bark:{name:'吠え',mp:8,speed:0},water:{name:'お水',mp:0,speed:4},mother:{name:'かーちゃんなでなで',mp:12,speed:6}};
function fresh(){return{level:1,exp:0,hp:34,mp:12,carrots:3,waters:3,stage:0,areaWins:0,miniBossDefeated:false,totalWins:0,score:0,started:Date.now()}}
function expForNext(lv){return lv>=MAX_LEVEL?0:30+lv*12}
function stats(lv=state.level){return{maxHp:34+(lv-1)*6,maxMp:12+(lv-1)*2,atk:8+(lv-1)*2.35,def:3+(lv-1)*1.25,spd:6+(lv-1)*1.5}}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(_){}}
function load(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY));return d&&d.stage<stages.length?d:null}catch(_){return null}}
function beep(freq=440,d=.06){if(!sound)return;try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;o.type="square";g.gain.setValueAtTime(.03,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+d)}catch(_){}}
function playMusic(key,restart=false){if(!musicPlayers[key])return;const previous=musicPlayers[currentMusicKey];if(currentMusicKey!==key&&previous){previous.pause();previous.currentTime=0}currentMusicKey=key;const audio=musicPlayers[key];if(restart){audio.pause();audio.currentTime=0}if(sound&&audio.paused)audio.play().catch(()=>{})}
function pauseMusic(){Object.values(musicPlayers).forEach(audio=>audio.pause())}
async function enterFullscreen(){try{if(!isSecureContext)throw Error();if(!document.fullscreenElement){const root=document.documentElement,fn=root.requestFullscreen||root.webkitRequestFullscreen;if(fn)await fn.call(root,{navigationUI:"hide"})}}catch(_){if(!isSecureContext)alert("ローカルHTTPではAndroidの全画面表示が制限されます。HTTPS公開版をホーム画面へ追加すると全画面で遊べます。")};setTimeout(()=>scrollTo(0,1),100)}
function show(id){$$('.screen').forEach(s=>s.classList.add('hidden'));$(id).classList.remove('hidden')}
function init(){const data=load();$('#continueBtn').classList.toggle('hidden',!data);renderNodes();playMusic('title')}
function startNew(){enterFullscreen();state=fresh();save();showMap()}
function continueGame(){enterFullscreen();state=load()||fresh();normalizeState();showMap()}
function normalizeState(){const s=stats();state.hp=Math.min(state.hp||s.maxHp,s.maxHp);state.mp=Math.min(state.mp||s.maxMp,s.maxMp);state.waters=Number.isFinite(state.waters)?state.waters:3;state.areaWins=state.areaWins||0;state.miniBossDefeated=Boolean(state.miniBossDefeated);state.totalWins=state.totalWins||0}
function renderNodes(){const wrap=$('#mapNodes');wrap.innerHTML='';stages.forEach((s,i)=>{const n=document.createElement('span');n.className='map-node'+(s.boss?' boss':'');n.textContent=s.boss?'★':i+1;wrap.appendChild(n)})}
function stageReady(){const s=stages[state.stage];return state.areaWins>=s.quota&&state.level>=s.gate}
function mapMessage(custom){const s=stages[state.stage];if(custom)return custom;if(state.areaWins<s.quota)return `敵グループをあと ${s.quota-state.areaWins}回 倒して小ボスへの道をひらこう！`;if(state.level<s.gate)return `小ボスに挑むには レベル${s.gate} が必要！ あと${s.gate-state.level}レベル。`;if(!state.miniBossDefeated)return `小ボス「${miniBosses[state.stage].name}」が待ち受けている！`;return s.boss?(s.boss==='mayu'?'小ボスの先で、まゆが待ち受けている！':'小ボスの先で、こうきが待ち受けている！'):'次のステージへの道がひらいた！'}
function showMap(custom){show('#mapScreen');renderNodes();const a=stages[state.stage],s=stats();$('#mapLevel').textContent=`${state.level}/${MAX_LEVEL}`;$('#mapHp').textContent=`${state.hp}/${s.maxHp}`;$('#mapCarrots').textContent=state.carrots;$('#chapterLabel').textContent=a.chapter;$('#locationName').textContent=a.name;$('#mapMessage').textContent=mapMessage(custom);$$('.map-node').forEach((n,i)=>{n.classList.toggle('done',i<state.stage);n.classList.toggle('current',i===state.stage)});$('.map-taruto').style.left=`${4+state.stage*16}%`;if(stageReady())$('#advanceBtn').textContent=!state.miniBossDefeated?`${miniBosses[state.stage].name}に挑む！`:a.boss?(a.boss==='mayu'?'まゆに挑む！':'こうきに挑む！'):'次のステージへ';else $('#advanceBtn').textContent=state.areaWins<a.quota?'敵をさがす':'レベル上げをする';$('#restBtn').textContent=`ひとやすみ（全回復）　次のLVまで ${expForNext(state.level)-state.exp} EXP`;save()}
function rest(){const s=stats();state.hp=s.maxHp;state.mp=s.maxMp;showMap('ひとやすみして元気いっぱい！');beep(660)}
function advance(){const a=stages[state.stage];if(stageReady()){if(!state.miniBossDefeated){beginMiniBoss();return}if(a.boss){beginBoss(a.boss);return}}beginMobBattle()}
function enemyScale(){return Math.max(1,state.level-1+Math.floor(Math.random()*3))}
function makeEnemy(template,i,count){const lv=enemyScale(),stage=state.stage;return{name:template[0],icon:template[1],lv,maxHp:18+lv*5+stage*5,currentHp:18+lv*5+stage*5,atk:3+lv*.75+stage*.55,spd:4+lv*1.35+Math.floor(Math.random()*5),xp:8+lv*3+stage*3,id:i}}
function beginMobBattle(){const a=stages[state.stage],count=Math.min(4,2+Math.floor(Math.random()*(state.stage>=2?3:2))),pool=[...a.enemies].sort(()=>Math.random()-.5);battle={enemies:Array.from({length:count},(_,i)=>makeEnemy(pool[i%pool.length],i,count)),boss:false,lost:false,guard:false};startBattle(`${count}体の モンスターが あらわれた！`)}
function beginMiniBoss(){const a=stages[state.stage],m=miniBosses[state.stage],lv=a.gate,maxHp=55+lv*8;battle={enemies:[{name:m.name,icon:m.icon,lv,maxHp,currentHp:maxHp,atk:6+lv*.95,spd:5+lv*1.25,xp:40+lv*10,id:0}],boss:false,miniBoss:true,lost:false,guard:false};startBattle(`ステージ小ボス・${m.name}が あらわれた！`)}
function beginBoss(type){if(type==='mayu'){battle={enemies:[{name:'まゆ',image:'assets/mayu-title-v2.png',lv:5,maxHp:115,currentHp:115,atk:13,spd:15,xp:180,id:0,bigMove:'レポート大旋風'}],boss:'mayu',lost:false,guard:false};startBattle('中ボス・まゆが あらわれた！')}else{battle={enemies:[{name:'こうき',image:'assets/kouki-boss-v1.png',lv:50,maxHp:820,currentHp:820,atk:72,spd:78,xp:2500,id:0,bigMove:'受験プレッシャー砲'}],boss:'kouki',lost:false,guard:false};startBattle('大ボス・こうきが あらわれた！')}}
function startBattle(text){busy=false;battle.selectedId=battle.enemies[0].id;if(battle.boss&&!Number.isFinite(battle.bossCharge))battle.bossCharge=0;show('#battleScreen');$('#battleLog').textContent=text+' 敵をタップして狙おう！';renderEnemies();updateBattle();previewTurnOrder();toggleCommands(true);beep(battle.boss?170:260,.13)}
function aliveEnemies(){return battle.enemies.filter(e=>e.currentHp>0)}
function activeEnemy(){const alive=aliveEnemies();let e=alive.find(x=>x.id===battle.selectedId);if(!e&&alive.length){e=alive[0];battle.selectedId=e.id}return e}
function selectEnemy(id){if(busy)return;battle.selectedId=id;renderEnemies();updateBattle();const e=activeEnemy();log(`${e.name}を ねらっている！\nすばやさ ${Math.round(e.spd)}`);beep(410)}
function enemyMarkup(e,effects){const hp=Math.max(0,e.currentHp),pct=Math.max(0,hp/e.maxHp*100),avatar=e.image?`<img src="${e.image}" alt="">`:`<span>${e.icon}</span>`;return`<div class="enemy-mini-hp"><div><i style="width:${pct}%"></i></div><b>${hp}/${e.maxHp}</b></div>${avatar}<small>${e.name}<i>速${Math.round(e.spd)}</i>${effects}</small>`}
function renderEnemies(){const alive=aliveEnemies(),wrap=$('#enemySprite'),selected=activeEnemy();wrap.innerHTML='';alive.forEach(e=>{const el=document.createElement('button'),effects=`${e.bleedTurns?`<i class="ailment">出血${e.bleedTurns}</i>`:''}${e.attackDownTurns?`<i class="ailment">攻↓${e.attackDownTurns}</i>`:''}`;el.type='button';el.dataset.id=e.id;el.className='enemy-unit'+(e.id===selected.id?' target':'')+(e.enraged?' enraged':'');el.setAttribute('aria-label',`${e.name}を狙う。HP${Math.max(0,e.currentHp)}/${e.maxHp}、レベル${e.lv}、すばやさ${Math.round(e.spd)}`);el.innerHTML=enemyMarkup(e,effects);el.onclick=()=>selectEnemy(e.id);wrap.appendChild(el)});$('#enemyName').textContent=battle.boss?selected.name:`選択：${selected.name}`;$('#enemyLevel').textContent=`LV ${selected.lv}・速 ${Math.round(selected.spd)}`;$('#enemyHpBar').style.width=`${selected.currentHp/selected.maxHp*100}%`}
function updateMiniHp(){aliveEnemies().forEach(e=>{const unit=document.querySelector(`.enemy-unit[data-id="${e.id}"]`);if(!unit)return;const hp=Math.max(0,e.currentHp),bar=unit.querySelector('.enemy-mini-hp i'),text=unit.querySelector('.enemy-mini-hp b');if(bar)bar.style.width=`${Math.max(0,hp/e.maxHp*100)}%`;if(text)text.textContent=`${hp}/${e.maxHp}`})}
function updateBattle(){const s=stats(),e=activeEnemy();$('#battleLevel').textContent=state.level;$('#battleSpeed').textContent=Math.round(s.spd);$('#battleHp').textContent=`${Math.max(0,state.hp)}/${s.maxHp}`;$('#battleMp').textContent=`${state.mp}/${s.maxMp}`;$('#heroHpBar').style.width=`${Math.max(0,state.hp/s.maxHp*100)}%`;$('#heroMpBar').style.width=`${state.mp/s.maxMp*100}%`;if(e)$('#enemyHpBar').style.width=`${Math.max(0,e.currentHp/e.maxHp*100)}%`;updateMiniHp();updateBossGauge();$('#carrotCount').textContent=`×${state.carrots}`;$('#waterCount').textContent=`×${state.waters}`}
function updateBossGauge(){const gauge=$('#bossGauge');gauge.classList.toggle('hidden',!battle.boss);if(!battle.boss)return;const charge=Math.min(3,battle.bossCharge||0),ready=charge>=3;$('#bossGaugeBar').style.width=`${charge/3*100}%`;$('#bossGaugeText').textContent=ready?'READY!':`${charge}/3`;gauge.classList.toggle('ready',ready)}
function makeTurnOrder(heroSpeed=stats().spd){return[{kind:'hero',spd:heroSpeed},...aliveEnemies().map(e=>({kind:'enemy',spd:e.spd,enemy:e}))].sort((a,b)=>b.spd-a.spd||Math.random()-.5)}
function renderTurnMeter(order,current=-1){const meter=$('#turnMeter');meter.innerHTML='';order.forEach((turn,i)=>{const chip=document.createElement('span'),hero=turn.kind==='hero',dead=!hero&&turn.enemy.currentHp<=0;chip.className=`turn-chip${hero?' hero':''}${i<current?' done':''}${i===current?' active':''}${dead?' defeated':''}`;chip.innerHTML=`<b>${hero?'🐶 たると':`${turn.enemy.icon||'👤'} ${turn.enemy.name}`}</b><small>速 ${Math.round(turn.spd)}</small>`;meter.appendChild(chip)});const active=meter.querySelector('.active');if(active)active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}
function previewTurnOrder(){renderTurnMeter(makeTurnOrder())}
function toggleCommands(on){$$('#commands button,#skillMenu button,#healMenu button').forEach(b=>b.disabled=!on);busy=!on}
function openSkills(){if(busy)return;$('#commands').classList.add('hidden');$('#skillMenu').classList.remove('hidden');log('どの 必殺技を つかう？')}
function closeSkills(){$('#skillMenu').classList.add('hidden');$('#commands').classList.remove('hidden')}
function openHeals(){if(busy)return;$('#commands').classList.add('hidden');$('#healMenu').classList.remove('hidden');log('どうやって かいふくする？')}
function closeHeals(){$('#healMenu').classList.add('hidden');$('#commands').classList.remove('hidden')}
function closeMenus(){$('#skillMenu').classList.add('hidden');$('#healMenu').classList.add('hidden');$('#commands').classList.remove('hidden')}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function act(type){if(busy)return;const s=stats(),skill=skills[type];if(skill&&state.mp<skill.mp){log(`${skill.name}を使うMPが たりない！`);return}if(type==='item'&&state.carrots<1){log('にんじんを もっていない！');return}if(type==='item'&&state.hp>=s.maxHp){log('HPは まんたんだ！');return}if(type==='water'&&state.waters<1){log('お水は もう残っていない！');return}if(type==='water'&&state.mp>=s.maxMp){log('MPは まんたんだ！');return}if(type==='mother'&&state.hp>=s.maxHp){log('HPは まんたんだ！');return}closeMenus();toggleCommands(false);battle.guard=false;
  const heroSpeed=s.spd+(skill?skill.speed:0),order=makeTurnOrder(heroSpeed);
  renderTurnMeter(order,0);log(`行動順：${order.map(x=>x.kind==='hero'?'たると':x.enemy.name).join(' → ')}`);await wait(600);
  for(let turnIndex=0;turnIndex<order.length;turnIndex++){const turn=order[turnIndex];renderTurnMeter(order,turnIndex);
    if(state.hp<=0||!aliveEnemies().length)break;
    if(turn.kind==='hero')await heroAction(type,s);else if(turn.enemy.currentHp>0)await enemyAction(turn.enemy,s);
  }
  if(state.hp>0&&aliveEnemies().length)await applyBleeding(s);battle.guard=false;if(state.hp<=0){lose();return}if(!aliveEnemies().length){if(await tryKoukiRevival()){toggleCommands(true);return}win();return}renderEnemies();updateBattle();previewTurnOrder();toggleCommands(true)}
async function heroAction(type,s){const target=activeEnemy();let text='';
  if(type==='attack'){const dmg=Math.max(2,Math.round(s.atk*(.85+Math.random()*.3)));target.currentHp-=dmg;showNumber(dmg,'damage',target);text=`たるとの こうげき！\n${target.name}に ${dmg}ダメージ！`;hitEnemies(false);beep(520)}
  if(type==='spin'){state.mp-=skills.spin.mp;let total=0;aliveEnemies().forEach(e=>{const dmg=Math.max(1,Math.ceil(e.currentHp/2));e.currentHp-=dmg;total+=dmg;showNumber(dmg,'damage',e)});text=`たるとの くるん！\n敵全体の現在HPを半分にした！ 合計${total}ダメージ！`;hitEnemies(true);beep(760,.12)}
  if(type==='bite'){state.mp-=skills.bite.mp;const dmg=Math.max(4,Math.round(s.atk*2));target.currentHp-=dmg;target.bleedTurns=3;target.bleedPower=Math.max(2,Math.round(s.atk*.35));showNumber(dmg,'damage',target);text=`たるとの かみつき！\n${target.name}に ${dmg}ダメージ＋出血！`;hitEnemies(false);beep(430,.14)}
  if(type==='bark'){state.mp-=skills.bark.mp;aliveEnemies().forEach(e=>e.attackDownTurns=Math.max(e.attackDownTurns||0,2));text=`たるとは 大きく吠えた！\n敵全体の攻撃力が 2ターン低下！`;hitEnemies(true);beep(860,.18)}
  if(type==='water'){state.waters--;const restored=s.maxMp-state.mp;state.mp=s.maxMp;showNumber(restored,'mp');text=`たるとは お水を飲んだ！\nMPが ${restored}かいふく！ 全回復！`;beep(680,.16)}
  if(type==='mother'){state.mp-=skills.mother.mp;const heal=s.maxHp-state.hp;state.hp=s.maxHp;showNumber(heal,'heal');text=`かーちゃんが なでなでしてくれた！\nHPが ${heal}かいふく！ 全回復！`;beep(920,.2)}
  if(type==='guard'){battle.guard=true;state.mp=Math.min(s.maxMp,state.mp+3);text='たるとは 身をまもった！\nこの後のダメージを軽減！';beep(340)}
  if(type==='item'){state.carrots--;const before=state.hp;state.hp=Math.min(s.maxHp,state.hp+Math.round(s.maxHp*.5));const heal=state.hp-before;showNumber(heal,'heal');text=`にんじんを たべた！\nHPが ${heal}かいふく！`;beep(690)}
  log(text);updateBattle();await wait(620);const defeated=battle.enemies.filter(e=>e.currentHp<=0&&!e.counted);defeated.forEach(e=>e.counted=true);if(defeated.length&&aliveEnemies().length){renderEnemies();log(`${defeated.length}体を たおした！ 残り ${aliveEnemies().length}体！`);await wait(420)}}
async function enemyAction(enemy,s){const weakened=enemy.attackDownTurns>0,meterBig=Boolean(battle.boss&&enemy.bigMove&&battle.bossCharge>=3),randomBig=Boolean(battle.boss&&enemy.bigMove&&!meterBig&&Math.random()<.25),big=meterBig||randomBig,power=big?1.8:1,attack=enemy.atk*(weakened?0.55:1)*power;let dmg=Math.max(1,Math.round(attack-s.def*.65+Math.random()*3-1));if(battle.guard)dmg=Math.max(1,Math.floor(dmg*.3));state.hp-=dmg;if(weakened)enemy.attackDownTurns--;if(battle.boss){if(meterBig)battle.bossCharge=0;else if(!randomBig)battle.bossCharge=Math.min(3,battle.bossCharge+1)}showNumber(dmg,big?'critical':'damage');const bigReason=meterBig?'ゲージ満タン！':'不意打ち！';log(big?`⚠ ${bigReason} ${enemy.name}の大技！ ${enemy.bigMove}！${weakened?'（攻撃力ダウン中）':''}\nたるとは ${dmg}の大ダメージ！${randomBig?' ゲージはそのまま！':''}`:`${enemy.name}の こうげき！${weakened?'（攻撃力ダウン中）':''}\nたるとは ${dmg}ダメージ！${battle.boss?' 大技ゲージ＋1！':''}`);$('#heroSprite').classList.add(big?'boss-hit':'hero-hit');beep(big?75:120,big?0.2:0.09);updateBattle();await wait(big?720:430);$('#heroSprite').classList.remove('hero-hit','boss-hit')}
async function tryKoukiRevival(){if(battle.boss!=='kouki'||battle.koukiRevived)return false;battle.koukiRevived=true;log('こうきを倒した……！');await wait(800);const banner=document.createElement('div');banner.className='revival-banner';banner.innerHTML='<small>FINAL BOSS REVIVAL</small><strong>こうき、復活！</strong><span>「ここからが本気だ！」</span>';$('#battleScreen').appendChild(banner);beep(65,.5);await wait(1100);const e=battle.enemies[0];e.name='本気のこうき';e.enraged=true;e.maxHp=1100;e.currentHp=e.maxHp;e.atk=Math.round(e.atk*1.35);e.spd+=12;e.xp=3500;e.bigMove='超・受験プレッシャー砲';e.bleedTurns=0;e.attackDownTurns=0;battle.bossCharge=0;battle.selectedId=e.id;renderEnemies();updateBattle();previewTurnOrder();log('本気のこうきが立ちはだかった！\nHP・攻撃力・すばやさが大幅アップ！');setTimeout(()=>banner.remove(),900);await wait(700);return true}
async function applyBleeding(s){const bleeding=aliveEnemies().filter(e=>e.bleedTurns>0);if(!bleeding.length)return;let total=0;bleeding.forEach(e=>{const dmg=Math.min(e.currentHp,e.bleedPower||2);e.currentHp-=dmg;e.bleedTurns--;total+=dmg;showNumber(dmg,'bleed',e)});log(`出血の追加ダメージ！\n合計 ${total}ダメージ！`);updateBattle();await wait(650)}
function showNumber(value,kind='damage',enemy=null){const host=enemy?document.querySelector(`.enemy-unit[data-id="${enemy.id}"]`):$('.hero-area');if(!host)return;const pop=document.createElement('span');pop.className=`damage-pop ${kind}`;pop.textContent=`${kind==='heal'||kind==='mp'?'+':'−'}${Math.max(0,Math.round(value))}${kind==='mp'?' MP':''}`;host.appendChild(pop);setTimeout(()=>pop.remove(),950)}
function log(t){$('#battleLog').innerText=t}
function hitEnemies(all){const units=all?$$('.enemy-unit'):[$('.enemy-unit.target')];units.filter(Boolean).forEach(el=>{el.classList.remove('enemy-hit');void el.offsetWidth;el.classList.add('enemy-hit')});const ef=$('#effect');ef.textContent=all?'🌀':'⚔';ef.classList.remove('skill-flash');void ef.offsetWidth;ef.classList.add('skill-flash');setTimeout(()=>ef.textContent='',450)}
function addExp(amount){let levels=0;state.exp+=amount;while(state.level<MAX_LEVEL){const need=expForNext(state.level);if(state.exp<need)break;state.exp-=need;state.level++;levels++}if(state.level>=MAX_LEVEL)state.exp=0;return levels}
function win(){battle.lost=false;const xp=battle.enemies.reduce((n,e)=>n+e.xp,0),levels=addExp(xp),s=stats();state.totalWins++;state.score+=xp*10+Math.max(0,state.hp)*3;if(battle.miniBoss){state.miniBossDefeated=true;if(!stages[state.stage].boss){battle.stageAdvanced=true;state.stage++;state.areaWins=0;state.miniBossDefeated=false;state.carrots=Math.min(5,state.carrots+1)}}else if(battle.boss==='mayu'){state.stage++;state.areaWins=0;state.miniBossDefeated=false;state.carrots=5}else if(battle.boss==='kouki'){state.finished=true}else state.areaWins++;if(levels){state.hp=s.maxHp;state.mp=s.maxMp;state.waters=3;state.carrots=Math.min(5,state.carrots+1)}else state.mp=Math.min(s.maxMp,state.mp+4);save();show('#resultScreen');$('#resultKicker').textContent=battle.miniBoss?'STAGE BOSS DEFEATED!':battle.boss?'BOSS DEFEATED!':'VICTORY!';$('#resultIcon').textContent=battle.miniBoss?'⭐':battle.boss?'👑':'🏆';$('#resultTitle').textContent=battle.miniBoss?`${battle.enemies[0].name}を倒した！`:battle.boss==='mayu'?'まゆに勝った！':battle.boss==='kouki'?'こうきを倒した！':`${battle.enemies.length}体を倒した！`;$('#resultText').innerHTML=`経験値 <b>${xp}</b> を てにいれた！<br>${battle.miniBoss?'ステージの小ボスを撃破！':'たるとは レベル'+state.level+'。'}${levels?'<br>お水の回数が3回に戻った！':''}`;$('#levelUp').classList.toggle('hidden',!levels);$('#levelUp').textContent=levels?`LEVEL UP!　${levels>1?'×'+levels:''}`:'LEVEL UP!';$('#resultBtn').textContent=state.finished?'エンディングへ':'冒険をつづける';beep(880,.18)}
function lose(){battle.lost=true;try{localStorage.removeItem(SAVE_KEY)}catch(_){}show('#resultScreen');$('#resultKicker').textContent='GAME OVER';$('#resultIcon').textContent='💫';$('#resultTitle').textContent='たるとは力つきた…';$('#resultText').innerHTML='レベルと冒険の記録は失われました。<br>レベル1から再出発しよう！';$('#levelUp').classList.add('hidden');$('#resultBtn').textContent='レベル1からやり直す'}
function afterResult(){if(battle.lost){state=fresh();save();showMap('勇者たるとの冒険が、もう一度はじまる！');return}if(state.finished){ending();return}if(battle.miniBoss){showMap(battle.stageAdvanced?'小ボスを倒してステージクリア！ 新しい場所へ進もう！':'小ボスを撃破！ この先に本当のボスが待っている！');return}showMap(battle.boss==='mayu'?'まゆを倒し、新しい道がひらいた！':undefined)}
function ending(){show('#endingScreen');$('#endLevel').textContent=state.level;$('#endWins').textContent=state.totalWins;const total=state.score+state.level*2000+state.carrots*500;$('#endScore').textContent=total.toLocaleString('ja-JP');try{const best=Number(localStorage.getItem(SCORE_KEY))||0;if(total>best)localStorage.setItem(SCORE_KEY,String(total));localStorage.removeItem(SAVE_KEY)}catch(_){}beep(990,.25)}
$('#newGameBtn').onclick=startNew;$('#continueBtn').onclick=continueGame;$('#fullscreenBtn').onclick=enterFullscreen;$('#advanceBtn').onclick=advance;$('#restBtn').onclick=rest;$('#resultBtn').onclick=afterResult;$('#endingHomeBtn').onclick=()=>location.href='index.html';$('#endingAgainBtn').onclick=startNew;$('#soundBtn').onclick=()=>{sound=!sound;$('#soundBtn').textContent=sound?'♪':'×'};$('#skillsBtn').onclick=openSkills;$('#skillBackBtn').onclick=closeSkills;$('#healsBtn').onclick=openHeals;$('#healBackBtn').onclick=closeHeals;$$('[data-action]').forEach(b=>b.onclick=()=>act(b.dataset.action));$$('[data-skill]').forEach(b=>b.onclick=()=>act(b.dataset.skill));$$('[data-heal]').forEach(b=>b.onclick=()=>act(b.dataset.heal));
const showMapWithoutMusic=showMap;
showMap=function(custom){playMusic('map');return showMapWithoutMusic(custom)};
const startBattleWithoutMusic=startBattle;
startBattle=function(text){const key=battle.miniBoss?'miniboss':battle.boss==='mayu'?'mayu':battle.boss==='kouki'?'kouki1':'regular';playMusic(key,true);return startBattleWithoutMusic(text)};
const reviveWithoutMusic=tryKoukiRevival;
tryKoukiRevival=async function(){if(battle&&battle.boss==='kouki'&&!battle.koukiRevived)playMusic('kouki2',true);return reviveWithoutMusic()};
const winWithoutMusic=win;
win=function(){playMusic('victory',true);return winWithoutMusic()};
const loseWithoutMusic=lose;
lose=function(){playMusic('title',true);return loseWithoutMusic()};
const endingWithoutMusic=ending;
ending=function(){playMusic('victory',true);return endingWithoutMusic()};
$('#soundBtn').onclick=()=>{sound=!sound;$('#soundBtn').textContent=sound?'♪':'×';if(sound)playMusic(currentMusicKey);else pauseMusic()};
init();
