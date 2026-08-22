const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const $ = s => document.querySelector(s);
const bg = new Image(); bg.src = "assets/tart-adventure-bg.png";
const bgm = new Audio("assets/flowerbed-fields.ogg"); bgm.loop=true; bgm.volume=.2;
const HIGH_SCORE_KEY="taruto-adventure-2-high-score";
const MAYU_HIGH_SCORE_KEY="taruto-adventure-3-high-score";
const QUEST_HIGH_SCORE_KEY="taruto-quest-best-score";
const DEBUG_PERFECT=new URLSearchParams(location.search).get("debug-perfect")==="1";

function loadHighScore(){
  try{return Math.max(0,Number(localStorage.getItem(HIGH_SCORE_KEY))||0)}
  catch(_){return 0}
}
function saveHighScore(value){
  try{localStorage.setItem(HIGH_SCORE_KEY,String(value))}catch(_){}
}
function loadMayuHighScore(){
  try{return Math.max(0,Number(localStorage.getItem(MAYU_HIGH_SCORE_KEY))||0)}
  catch(_){return 0}
}
function loadMuscleHighScore(){
  try{return Math.max(...[0,1].flatMap(song=>[0,1,2].map(level=>Number(localStorage.getItem(`taruto-rhythm-chase-best-${song}-${level}`))||0)),...[0,1].flatMap(song=>[0,1,2,3,4].map(level=>Number(localStorage.getItem(`taruto-rhythm-party-best-${song}-${level}`))||0)),...[0,1,2,3,4].map(level=>Number(localStorage.getItem(`taruto-muscle-beat-best-${level}`))||0))}
  catch(_){return 0}
}
function loadQuestHighScore(){
  try{return Math.max(0,Number(localStorage.getItem(QUEST_HIGH_SCORE_KEY))||0)}
  catch(_){return 0}
}
let highScore=loadHighScore();

const FINAL_SHIFT=84;
const GOAL_SHIFT=310;
const W=1280,H=720,groundY=590,SEGMENT=4000,worldW=8800+GOAL_SHIFT,goalX=8480+GOAL_SHIFT,RUN_TIME=240;
const LAST_DUCK_X=3420+SEGMENT+80+FINAL_SHIFT;
const baseRivers=[{x:700,w:500},{x:1700,w:550},{x:2600,w:1040}];
const finalRiver={x:8138+GOAL_SHIFT,w:242,respawnX:7440+GOAL_SHIFT};
const riverZones=[...baseRivers,...baseRivers.map((r,index)=>({...r,x:r.x+SEGMENT,w:index===2?7550+GOAL_SHIFT-(r.x+SEGMENT):r.w})),finalRiver];
let running=false,won=false,last=0,camera=0,carrots=0,bones=0,catsDefeated=0,crowsDefeated=0,duckJumps=0,damageCount=0,cheeseTaken=false,lives=3,score=0,timeLeft=RUN_TIME*10,endTime=0,sound=true,toastTimer,orientationTimer,clearPerfect=false,clearGreat=false,clearGood=false,clearTry=false;
const keys={jump:false,attack:false};
let player={x:150,y:groundY-92,w:80,h:92,vx:0,vy:0,onGround:false,inv:0,dir:1,attack:0,cooldown:0,attackDir:1};
const basePlatforms=[
  {x:0,y:590,w:700,h:130},{x:1200,y:590,w:500,h:130},{x:2250,y:590,w:350,h:130},
  {x:3500,y:590,w:700,h:130},
  {x:620,y:470,w:250,h:28},{x:900,y:380,w:250,h:28},{x:1140,y:470,w:150,h:28},
  {x:1620,y:460,w:250,h:28},{x:1900,y:350,w:250,h:28},{x:2140,y:455,w:160,h:28},
  {x:2520,y:470,w:240,h:28},{x:2780,y:385,w:240,h:28},{x:3040,y:300,w:240,h:28}
];
const goalSteps=[
  {x:7550+GOAL_SHIFT,y:530,w:84,h:60,goalStep:true},{x:7634+GOAL_SHIFT,y:470,w:84,h:120,goalStep:true},
  {x:7718+GOAL_SHIFT,y:410,w:84,h:180,goalStep:true},{x:7802+GOAL_SHIFT,y:350,w:84,h:240,goalStep:true},
  {x:7886+GOAL_SHIFT,y:290,w:252,h:300,goalStep:true},{x:8380+GOAL_SHIFT,y:590,w:420,h:130}
];
const duckJumpWall={x:5200,y:300,w:110,h:290,goalStep:true,duckWall:true};
const fieldBlocks=[
  {x:3640,y:500,w:72,h:90,goalStep:true},{x:3856,y:525,w:72,h:65,goalStep:true},
  {x:4072,y:475,w:72,h:115,goalStep:true},{x:4288,y:550,w:72,h:40,goalStep:true},
  {x:4504,y:450,w:72,h:140,goalStep:true}
];
const firstPlatforms=basePlatforms.map(p=>p.x===3500&&p.y===groundY?{...p,x:3640,w:560}:p);
const secondPlatforms=basePlatforms
  .filter(p=>p.x!==3500&&(p.y===groundY||![620,900,1140].includes(p.x)))
  .map(p=>({...p,x:p.x+SEGMENT}));
const platforms=[...firstPlatforms,...secondPlatforms,...fieldBlocks,duckJumpWall,...goalSteps];
let items=[], enemies=[], ducks=[],splashes=[];
let cheese={x:8260+GOAL_SHIFT,y:430,w:54,h:42,taken:false};

function reset(){
  keys.jump=false;keys.attack=false;
  player={x:190,y:groundY-92,w:80,h:92,vx:0,vy:0,onGround:false,inv:0,dir:1,attack:0,cooldown:0,attackDir:1};
  $("#newRecord").classList.add("hidden");$("#perfectClear").classList.add("hidden");$("#perfectClear").classList.remove("preview-still");$("#greatClear").classList.add("hidden");$("#goodClear").classList.add("hidden");$("#tryClear").classList.add("hidden");
  camera=0;carrots=0;bones=0;catsDefeated=0;crowsDefeated=0;duckJumps=0;damageCount=0;splashes=[];cheeseTaken=false;cheese={x:8260+GOAL_SHIFT,y:430,w:54,h:42,taken:false};lives=3;score=0;timeLeft=RUN_TIME*10;endTime=performance.now()+RUN_TIME*1000;won=false;clearPerfect=false;clearGreat=false;clearGood=false;clearTry=false;
  const baseItems=[[720,415,"carrot"],[995,325,"bone"],[1320,535,"carrot"],[1740,405,"carrot"],[2010,295,"bone"],[2360,535,"carrot"],[2810,330,"bone"],[3070,245,"carrot"]];
  items=[...baseItems,...baseItems.map(([x,y,type])=>[x+SEGMENT,y,type])]
    .filter(([x,,type])=>type!=="carrot"||![1320,5740,7070].includes(x))
    .map(([x,y,type])=>[x===5320?5480:x,y,type])
    .map(([x,y,type])=>({x,y,type,taken:false,bob:Math.random()*6}));
  const baseEnemies=[
    {type:"cat",x:540,y:535,min:420,max:650,v:1.25,alive:true},
    {type:"crow",x:1040,y:315,min:900,max:1130,v:1.7,alive:true,phase:0},
    {type:"cat",x:1510,y:535,min:1300,max:1640,v:1.15,alive:true},
    {type:"crow",x:2040,y:285,min:1910,max:2130,v:1.8,alive:true,phase:2},
    {type:"cat",x:2470,y:535,min:2340,max:2560,v:1.25,alive:true},
    {type:"crow",x:3100,y:275,min:2970,max:3190,v:1.75,alive:true,phase:4}
  ];
  enemies=[...baseEnemies.map(e=>({...e})),...baseEnemies.map(e=>({...e,x:e.x+SEGMENT,min:e.min+SEGMENT,max:e.max+SEGMENT,phase:(e.phase||0)+1}))]
    .filter(e=>!(e.type==="crow"&&e.x>4900&&e.x<5200));
  enemies.push(
    {type:"crow",x:LAST_DUCK_X+180,y:110,min:LAST_DUCK_X+125,max:LAST_DUCK_X+245,v:1.8,alive:true,phase:3},
    {type:"crow",x:7550+GOAL_SHIFT+270,y:245,min:7550+GOAL_SHIFT+205,max:7550+GOAL_SHIFT+345,v:1.7,alive:true,phase:5}
  );
  const baseDucks=[{x:950,y:574,phase:0},{x:1975,y:574,phase:2},{x:3170,y:574,phase:4},{x:3420,y:574,phase:1}];
  const firstDucks=baseDucks.map(d=>d.x===3420?{...d,x:3560}:d);
  const secondDucks=baseDucks.map(d=>({...d,x:d.x===3420?LAST_DUCK_X:d.x+SEGMENT,phase:d.phase+1}));
  ducks=[...firstDucks,...secondDucks].map(d=>({...d,bounce:0,scored:false}));
  updateHud();
}
function updateHud(){
  $("#scoreValue").textContent=score.toLocaleString("ja-JP");
  $("#timeValue").textContent=(timeLeft/10).toFixed(1);
  $("#lives").textContent="♥ ".repeat(lives).trim();
  $("#duckHud").textContent=`${duckJumps}/${ducks.length}`;
  $("#carrotHud").textContent=`${carrots}/${items.filter(item=>item.type==="carrot").length}`;
  $("#boneHud").textContent=`${bones}/${items.filter(item=>item.type==="bone").length}`;
  $("#highScoreValue").textContent=highScore.toLocaleString("ja-JP");
  $("#mayuHighScoreValue").textContent=loadMayuHighScore().toLocaleString("ja-JP");
  $("#muscleHighScoreValue").textContent=loadMuscleHighScore().toLocaleString("ja-JP");
  $("#questHighScoreValue").textContent=loadQuestHighScore().toLocaleString("ja-JP");
}
async function enterGameMode(){
  const standalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  try{
    if(!standalone)return;
    if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape");
  }catch(_){}
  setTimeout(()=>window.scrollTo(0,1),120);
}
function start(){
  enterGameMode();
  reset(); running=true;
  $("#startScreen").classList.add("hidden");$("#storyScreen").classList.add("hidden");$("#endScreen").classList.add("hidden");$("#hud").classList.remove("hidden");$("#mobileControls").classList.remove("hidden");
  beep(440,.08,"sine");
  syncMusic();
  setTimeout(()=>toast("KICKで必殺・くるん回し蹴り！"),450);
}
function showStory(){
  enterGameMode();
  $("#startScreen").classList.add("hidden");
  $("#storyScreen").classList.remove("hidden");
  beep(440,.08,"sine");
  syncMusic();
}
function goHome(){
  running=false;won=false;keys.jump=false;keys.attack=false;bgm.pause();
  $("#storyScreen").classList.add("hidden");$("#endScreen").classList.add("hidden");$("#hud").classList.add("hidden");
  $("#mobileControls").classList.add("hidden");$("#toast").classList.add("hidden");$("#startScreen").classList.remove("hidden");
}
function askLandscapeGame(next){
  const modal=$("#landscapeGameModal");
  modal.classList.remove("hidden");
  $("#landscapeGameStart").onclick=()=>{modal.classList.add("hidden");next()};
  $("#landscapeGameCancel").onclick=$("#landscapeGameBackdrop").onclick=()=>modal.classList.add("hidden");
}
$("#startBtn").onclick=()=>askLandscapeGame(showStory);
const mayuGameCard=$(".mayu-game-card");
mayuGameCard.onclick=e=>{e.preventDefault();askLandscapeGame(()=>location.href=mayuGameCard.href)};
$("#storyBtn").onclick=start;$("#retryBtn").onclick=start;$("#playRetryBtn").onclick=start;$("#playHomeBtn").onclick=goHome;
$("#soundBtn").onclick=()=>{sound=!sound;$("#soundBtn").classList.toggle("off",!sound);syncMusic()};
const changelogModal=$("#changelogModal"),openChangelog=()=>changelogModal.classList.remove("hidden"),closeChangelog=()=>changelogModal.classList.add("hidden");
$("#versionBadge").onclick=openChangelog;$("#changelogClose").onclick=closeChangelog;$("#changelogBackdrop").onclick=closeChangelog;

addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!changelogModal.classList.contains("hidden")){closeChangelog();e.preventDefault();return}
  if([" ","ArrowUp","w","W"].includes(e.key)){keys.jump=true;e.preventDefault()}
  if(["x","X","k","K"].includes(e.key)){keys.attack=true;e.preventDefault()}
});
addEventListener("keyup",e=>{
  if([" ","ArrowUp","w","W"].includes(e.key))keys.jump=false;
  if(["x","X","k","K"].includes(e.key))keys.attack=false;
});
document.querySelectorAll("[data-key]").forEach(b=>{
  const k=b.dataset.key;
  ["pointerdown","touchstart"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();keys[k]=true}));
  ["pointerup","pointercancel","touchend"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();keys[k]=false}));
});

let audio;
function syncMusic(){
  if(sound&&!won)bgm.play().catch(()=>{});
  else bgm.pause();
}
function beep(freq,dur,type="sine"){
  if(!sound)return;
  if(!audio) audio = new (window.AudioContext||window.webkitAudioContext)();
  const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+dur);
}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function toast(text,achievement=false){
  const el=$("#toast");el.textContent=text;el.classList.toggle("achievement",achievement);el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{el.classList.add("hidden");el.classList.remove("achievement")},achievement?1900:1100);
}
function celebrate(text){
  toast(text,true);
  beep(660,.1,"triangle");setTimeout(()=>beep(880,.12,"triangle"),90);setTimeout(()=>beep(1100,.2,"triangle"),190);
}
function enemyResult(normalText){
  if(catsDefeated+crowsDefeated===enemies.length)celebrate("野良ねことカラスを全部撃破！");
  else toast(normalText);
}
const endingMessages={
  perfect:["たると、ついにやったな。。","とんでもないワンコだ","今夜は帰って牛肉だ","でも、たるとの戦いはまだまだ続く"],
  great:["グレートだぜ、たると","今夜の夕飯はチーズ多めに入れてやるよ","でもパーフェクトまであと一歩がんばろう","たるとの戦いはまだまだ続く"],
  good:["まぁまぁだな、たるとさん","でもまだまだ上をめざそう","とりあえず今夜の夕飯はシャケといつものカリカリだ","たるとの戦いはまだまだ続く"],
  try:["話にならないぞ、たるとさん","今夜はごはん抜きで特訓だ","たるとの戦いはまだまだ続く"]
};
function setEndingMessages(rank){
  const roll=$("#creditsRoll");roll.innerHTML="";
  endingMessages[rank].forEach(message=>{
    const line=document.createElement("p");line.textContent=message;roll.appendChild(line);
  });
}
function showClearEffect(element,visible){
  element.classList.add("hidden");
  if(!visible)return;
  void element.offsetWidth;
  element.classList.remove("hidden");
}
function isLandscapeView(){return matchMedia("(orientation: landscape)").matches}
function refreshClearEffects(){
  clearTimeout(orientationTimer);
  orientationTimer=setTimeout(()=>{
    if(!won||!isLandscapeView()){
      showClearEffect($("#perfectClear"),false);
      showClearEffect($("#greatClear"),false);
      showClearEffect($("#goodClear"),false);
      showClearEffect($("#tryClear"),false);
      return;
    }
    showClearEffect($("#perfectClear"),clearPerfect);
    showClearEffect($("#greatClear"),clearGreat);
    showClearEffect($("#goodClear"),clearGood);
    showClearEffect($("#tryClear"),clearTry);
  },180);
}
addEventListener("orientationchange",refreshClearEffects);
const landscapeMedia=matchMedia("(orientation: landscape)");
if(landscapeMedia.addEventListener)landscapeMedia.addEventListener("change",refreshClearEffects);
else if(landscapeMedia.addListener)landscapeMedia.addListener(refreshClearEffects);
function hurt(){
  if(player.inv>0)return;
  lives--;damageCount++;score-=50;updateHud();beep(130,.3,"sawtooth");toast("ダメージ！ −50");
  if(lives<=0){
    reset();toast("ライフがなくなった！ おうちから再出発");
    return;
  }
  updateHud();
  player.inv=120; player.vy=-11; player.vx=-player.dir*8;
}
function update(){
  const nextTime=Math.max(0,Math.ceil((endTime-performance.now())/100));
  if(nextTime!==timeLeft){timeLeft=nextTime;updateHud()}
  const runSpeed=player.attack>0?3.7:5.6;
  player.vx+=(runSpeed-player.vx)*.2;
  player.dir=1;
  if(keys.jump&&player.onGround){player.vy=-14.5;player.onGround=false;beep(520,.12,"triangle")}
  if(keys.attack&&player.cooldown<=0){
    player.attack=46;player.cooldown=62;player.attackDir=player.dir;player.vx*=.35;
    beep(180,.08,"sawtooth");setTimeout(()=>beep(110,.09,"square"),55);
  }
  player.vy+=.72; player.vy=Math.min(18,player.vy);
  let oldY=player.y,oldX=player.x;player.x+=player.vx;player.y+=player.vy;player.x=Math.max(0,Math.min(worldW-player.w,player.x));
  for(const p of [...goalSteps,duckJumpWall,...fieldBlocks]){
    if(!p.goalStep)continue;
    const verticallyInside=player.y+player.h>p.y+4&&player.y<p.y+p.h;
    if(verticallyInside&&oldX+player.w<=p.x+4&&player.x+player.w>p.x){
      player.x=p.x-player.w;player.vx=0;
    }
  }
  player.onGround=false;
  for(const p of platforms){
    if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY+player.h<=p.y+3&&player.y+player.h>=p.y&&player.vy>=0){
      player.y=p.y-player.h;player.vy=0;player.onGround=true;
    }
  }
  ducks.forEach(d=>{
    const dy=d.y+Math.sin(performance.now()/380+d.phase)*4;
    const top=dy-14;
    if(d.bounce>0)d.bounce--;
    if(player.vy>=0&&player.x+player.w>d.x-40&&player.x<d.x+40&&oldY+player.h<=top+7&&player.y+player.h>=top){
      player.y=top-player.h;player.vy=-24.7;player.onGround=false;d.bounce=16;
      if(!d.scored){
        d.scored=true;duckJumps++;score+=150;updateHud();
        if(duckJumps===ducks.length)celebrate("カモさんジャンプ 全部達成！");
        else toast(`カモさんジャンプ！ ＋150（${duckJumps}/${ducks.length}）`);
      }
      else toast("カモさんジャンプ！");
      beep(340,.08,"square");setTimeout(()=>beep(720,.16,"triangle"),70);
    }
  });
  const river=riverZones.find(r=>player.x+player.w*.75>r.x&&player.x+player.w*.25<r.x+r.w&&player.y+player.h>groundY+42);
  if(river){
    emitSplash(player.x+player.w/2,groundY+28);
    lives--;damageCount++;score-=50;updateHud();beep(110,.35,"sawtooth");
    if(lives<=0){
      reset();toast("ライフがなくなった！ おうちから再出発");
      return;
    }
    updateHud();
    player.x=Math.max(40,river.respawnX!==undefined?river.respawnX:river.x-320);player.y=groundY-player.h;player.vx=0;player.vy=0;player.inv=75;
    toast("川に落ちちゃった！ −50");
  }
  if(player.y>H+100){player.y=80;player.x=Math.max(60,player.x-260);player.vy=0;hurt()}
  items.forEach(b=>{
    b.bob+=.05;
    if(!b.taken&&overlap(player,{x:b.x-24,y:b.y-24,w:48,h:48})){
      b.taken=true;
      if(b.type==="carrot"){
        carrots++;score+=100;lives=Math.min(3,lives+1);
        if(carrots===items.filter(item=>item.type==="carrot").length)celebrate("にんじんトイを全部獲得！");
        else toast("にんじんトイ！ ＋100・ライフ回復");
      }else{
        bones++;score+=50;
        if(bones===items.filter(item=>item.type==="bone").length)celebrate("ホネッコを全部獲得！");
        else toast("ホネッコ！ ＋50");
      }
      updateHud();beep(760,.1,"triangle");setTimeout(()=>beep(980,.12,"triangle"),70);
    }
  });
  if(!cheese.taken){
    cheese.y=300+Math.sin(performance.now()/260)*240;
    if(overlap(player,{x:cheese.x-cheese.w/2,y:cheese.y-cheese.h/2,w:cheese.w,h:cheese.h})){
      cheese.taken=true;cheeseTaken=true;score+=1000;updateHud();
      beep(880,.12,"triangle");setTimeout(()=>beep(1170,.2,"triangle"),100);toast("おみやげチーズ！ ＋1000");
    }
  }
  enemies.forEach(e=>{
    if(!e.alive)return;
    if(e.defeated>0){e.defeated--;if(e.defeated===0)e.alive=false;return}
    e.x+=e.v;if(e.x<e.min||e.x>e.max)e.v*=-1;
    if(e.type==="crow")e.y+=Math.sin(performance.now()/260+e.phase)*.7;
    const target={x:e.x,y:e.y,w:e.type==="cat"?66:58,h:e.type==="cat"?55:42};
    const kick={x:player.attackDir===1?player.x+player.w-8:player.x-72,y:player.y-30,w:80,h:114};
    if(player.attack>=9&&player.attack<=38&&overlap(kick,target)){
      e.alive=false;if(e.type==="cat")catsDefeated++;else crowsDefeated++;score+=e.type==="cat"?100:200;updateHud();beep(240,.08,"square");setTimeout(()=>beep(420,.12,"triangle"),60);enemyResult(e.type==="cat"?"野良ねこ撃破！ ＋100":"カラス撃破！ ＋200");
      return;
    }
    if(overlap(player,target)){
      if(player.vy>2&&player.y+player.h<e.y+24){
        e.defeated=22;player.vy=-10;if(e.type==="cat")catsDefeated++;else crowsDefeated++;score+=e.type==="cat"?100:200;updateHud();beep(170,.1,"square");setTimeout(()=>beep(300,.08,"triangle"),60);enemyResult(e.type==="cat"?"野良ねこをふみつぶした！ ＋100":"カラスをふみつぶした！ ＋200");
      }
      else hurt();
    }
  });
  if(player.inv>0)player.inv--;
  if(player.attack>0)player.attack--;
  if(player.cooldown>0)player.cooldown--;
  splashes.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.42;s.life--;s.r*=.985});
  splashes=splashes.filter(s=>s.life>0);
  if(player.x>goalX-70&&!won){
    won=true;running=false;syncMusic();beep(620,.15);setTimeout(()=>beep(780,.15),140);setTimeout(()=>beep(1040,.4),280);
    const bonus=timeLeft,total=score+bonus;
    const missedItems=items.filter(item=>!item.taken).length;
    const missedDucks=ducks.filter(duck=>!duck.scored).length;
    const missedEnemies=Math.max(0,enemies.length-catsDefeated-crowsDefeated);
    const missedCheese=cheeseTaken?0:1;
    const missTotal=missedItems+missedDucks+missedEnemies+damageCount+missedCheese;
    const perfect=DEBUG_PERFECT||missTotal===0;
    const greatClear=!perfect&&missTotal<=3;
    const goodClear=!perfect&&missTotal>=4&&missTotal<=6;
    const tryClear=!perfect&&missTotal>=7;
    setEndingMessages(perfect?"perfect":greatClear?"great":goodClear?"good":"try");
    clearPerfect=perfect;clearGreat=greatClear;clearGood=goodClear;clearTry=tryClear;
    if(perfect){
      [[520,620],[660,740],[780,860],[1040,1020]].forEach(([frequency,delay],index)=>
        setTimeout(()=>beep(frequency,index===3?.38:.13,"triangle"),delay)
      );
    }else if(greatClear){
      setTimeout(()=>beep(620,.12,"triangle"),520);
      setTimeout(()=>beep(820,.2,"triangle"),670);
    }else if(goodClear){
      setTimeout(()=>beep(570,.16,"triangle"),560);
    }else if(tryClear){
      setTimeout(()=>beep(360,.14,"triangle"),560);
      setTimeout(()=>beep(430,.16,"triangle"),710);
    }
    const totalCarrots=items.filter(item=>item.type==="carrot").length;
    const totalBones=items.filter(item=>item.type==="bone").length;
    const totalCats=enemies.filter(enemy=>enemy.type==="cat").length;
    const totalCrows=enemies.filter(enemy=>enemy.type==="crow").length;
    $("#carrotCount").textContent=`${carrots}/${totalCarrots}個 × 100`;
    $("#carrotScore").textContent=(carrots*100).toLocaleString("ja-JP");
    $("#boneCount").textContent=`${bones}/${totalBones}個 × 50`;
    $("#boneScore").textContent=(bones*50).toLocaleString("ja-JP");
    $("#catCount").textContent=`${catsDefeated}/${totalCats}匹 × 100`;
    $("#catScore").textContent=(catsDefeated*100).toLocaleString("ja-JP");
    $("#crowCount").textContent=`${crowsDefeated}/${totalCrows}羽 × 200`;
    $("#crowScore").textContent=(crowsDefeated*200).toLocaleString("ja-JP");
    $("#duckCount").textContent=`${duckJumps}/${ducks.length}回 × 150`;
    $("#duckScore").textContent=(duckJumps*150).toLocaleString("ja-JP");
    $("#cheeseCount").textContent=`${cheeseTaken?1:0}/1個 × 1000`;
    $("#cheeseScore").textContent=cheeseTaken?"1,000":"0";
    $("#damageCount").textContent=damageCount+"回 × −50";
    $("#damageScore").textContent=(damageCount*-50).toLocaleString("ja-JP");
    $("#actionScore").textContent=score.toLocaleString("ja-JP");
    $("#timeBonus").textContent=bonus.toLocaleString("ja-JP");
    $("#missTotal").textContent=missTotal;
    $("#totalScore").textContent=total.toLocaleString("ja-JP");
    const isNewRecord=total>highScore;
    if(isNewRecord){highScore=total;saveHighScore(highScore)}
    $("#highScoreValue").textContent=highScore.toLocaleString("ja-JP");
    $("#newRecord").classList.toggle("hidden",!isNewRecord);
    $("#cheeseHandoff").classList.toggle("hidden",!cheeseTaken);
    $("#endScreen").classList.remove("hidden");$("#hud").classList.add("hidden");$("#mobileControls").classList.add("hidden");
    if(isLandscapeView()){
      showClearEffect($("#perfectClear"),perfect);
      showClearEffect($("#greatClear"),greatClear);
      showClearEffect($("#goodClear"),goodClear);
      showClearEffect($("#tryClear"),tryClear);
    }else{
      showClearEffect($("#perfectClear"),false);
      showClearEffect($("#greatClear"),false);
      showClearEffect($("#goodClear"),false);
      showClearEffect($("#tryClear"),false);
    }
  }
  camera+=(Math.max(0,Math.min(worldW-W,player.x-W*.36))-camera)*.08;
}
function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function emitSplash(x,y){
  for(let i=0;i<22;i++){
    const angle=Math.PI+(Math.random()*Math.PI);
    const speed=3+Math.random()*8;
    splashes.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-2,r:3+Math.random()*6,life:30+Math.random()*18});
  }
}
function drawBackground(){
  if(bg.complete)ctx.drawImage(bg,0,0,bg.width,bg.height,0,0,W,H);
  else {ctx.fillStyle="#ffca91";ctx.fillRect(0,0,W,H)}
  ctx.fillStyle="#ffffff45";ctx.fillRect(0,0,W,H);
  // parallax hills
  ctx.fillStyle="#68bfa5";ctx.beginPath();ctx.moveTo(0,490);for(let x=0;x<=W;x+=80)ctx.lineTo(x,420+Math.sin((x+camera*.12)/180)*55);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
}
function drawWorld(){
  ctx.save();ctx.translate(-camera,0);
  // rivers between the hills
  riverZones.forEach(r=>{
    ctx.fillStyle="#55bdda";ctx.fillRect(r.x,groundY,r.w,H-groundY);
    ctx.strokeStyle="#bff4ef";ctx.lineWidth=5;
    for(let x=r.x+8;x<r.x+r.w;x+=28){ctx.beginPath();ctx.arc(x,groundY+13,13,Math.PI,0);ctx.stroke()}
  });
  splashes.forEach(s=>{
    ctx.globalAlpha=Math.min(1,s.life/18);ctx.fillStyle="#e9ffff";
    ctx.beginPath();ctx.ellipse(s.x,s.y,s.r*.65,s.r*1.35,0,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  // ground and floating flower platforms
  platforms.forEach((p,i)=>{
    const isGround=p.y===groundY&&p.h===130;
    ctx.fillStyle=isGround?"#216d57":"#fff1ba";roundedRect(p.x,p.y,p.w,p.h,isGround?18:14);ctx.fill();
    ctx.fillStyle=isGround?"#65b95d":"#e7ad52";roundedRect(p.x,p.y,p.w,Math.min(24,p.h),14);ctx.fill();
    if(isGround){ctx.fillStyle="#8bd26d";for(let x=p.x+12;x<p.x+p.w;x+=34){ctx.beginPath();ctx.arc(x,p.y+5,14,0,Math.PI*2);ctx.fill()}}
  });
  // flowers
  for(let x=230;x<worldW;x+=370){const y=groundAt(x)-15;ctx.strokeStyle="#226c56";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-32);ctx.stroke();ctx.fillStyle=x%2?"#ff795f":"#ffc34c";for(let a=0;a<6;a++){ctx.beginPath();ctx.arc(x+Math.cos(a)*11,y-38+Math.sin(a)*11,9,0,7);ctx.fill()}ctx.fillStyle="#fff1a2";ctx.beginPath();ctx.arc(x,y-38,7,0,7);ctx.fill()}
  items.forEach(b=>{if(b.taken)return;const y=b.y+Math.sin(b.bob)*6;ctx.save();ctx.translate(b.x,y);ctx.rotate(Math.sin(b.bob*.7)*.08);b.type==="carrot"?drawCarrot():drawBone();ctx.restore()});
  if(!cheese.taken)drawCheese(cheese.x,cheese.y);
  ducks.forEach(d=>drawDuck(d.x,d.y+Math.sin(performance.now()/380+d.phase)*4,d.bounce));
  enemies.forEach(e=>{if(e.alive)(e.type==="cat"?drawCat:drawCrow)(e.x,e.y,e.v,e.defeated>0)});
  drawHome(25,groundY-160);
  drawParents(goalX+50,groundY-142);
  drawTart(player.x,player.y);
  ctx.restore();
}
function groundAt(x){const p=platforms.find(p=>x>=p.x&&x<=p.x+p.w&&p.y===groundY);return p?groundY:H+50}
function drawCat(x,y,v,squashed=false){ctx.save();ctx.translate(x,y+(squashed?38:0));ctx.scale(v<0?-1:1,squashed?.28:1);ctx.fillStyle="#687574";ctx.strokeStyle="#fff5d8";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(31,30,31,22,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(53,14,21,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(38,0);ctx.lineTo(42,-20);ctx.lineTo(53,0);ctx.moveTo(55,0);ctx.lineTo(69,-18);ctx.lineTo(72,5);ctx.fill();ctx.fillStyle="#ffc34c";ctx.beginPath();ctx.arc(48,12,3,0,7);ctx.arc(62,12,3,0,7);ctx.fill();ctx.strokeStyle="#687574";ctx.lineWidth=8;ctx.beginPath();ctx.arc(4,22,24,1.6,4.8);ctx.stroke();ctx.restore()}
function drawCrow(x,y,v,squashed=false){ctx.save();ctx.translate(x,y+(squashed?30:0));ctx.scale(v<0?-1:1,squashed?.3:1);const flap=Math.sin(performance.now()/95)*12;ctx.fillStyle="#263d48";ctx.beginPath();ctx.ellipse(27,20,27,18,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(48,12,16,0,7);ctx.fill();ctx.fillStyle="#101d24";ctx.beginPath();ctx.moveTo(18,19);ctx.lineTo(-15,flap);ctx.lineTo(12,30);ctx.fill();ctx.fillStyle="#e0a33b";ctx.beginPath();ctx.moveTo(62,9);ctx.lineTo(82,15);ctx.lineTo(62,18);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(53,8,4,0,7);ctx.fill();ctx.fillStyle="#182b31";ctx.beginPath();ctx.arc(54,8,2,0,7);ctx.fill();ctx.restore()}
function drawDuck(x,y,bounce=0){
  ctx.save();ctx.translate(x,y);ctx.scale(1+bounce*.015,1-bounce*.02);
  ctx.strokeStyle="#fff4d5";ctx.lineWidth=4;
  ctx.fillStyle="#9a633f";ctx.beginPath();ctx.ellipse(0,8,37,19,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle="#24735f";ctx.beginPath();ctx.ellipse(-7,5,25,13,-.15,0,7);ctx.fill();
  ctx.strokeStyle="#69a98a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-27,5);ctx.quadraticCurveTo(-7,-5,14,6);ctx.stroke();
  ctx.fillStyle="#5e4937";ctx.strokeStyle="#fff4d5";ctx.lineWidth=4;ctx.beginPath();ctx.arc(23,-9,17,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#f4e2b8";ctx.lineWidth=4;ctx.beginPath();ctx.arc(21,-7,17,.25,1.4);ctx.stroke();
  ctx.fillStyle="#d9a044";ctx.beginPath();ctx.moveTo(36,-8);ctx.lineTo(57,-2);ctx.lineTo(36,2);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(28,-13,4,0,7);ctx.fill();ctx.fillStyle="#183b3a";ctx.beginPath();ctx.arc(29,-13,2,0,7);ctx.fill();
  ctx.fillStyle="#71d0dc";ctx.globalAlpha=.45;ctx.beginPath();ctx.ellipse(0,27,47,7,0,0,7);ctx.fill();
  ctx.restore();
}
function drawCarrot(){
  ctx.save();ctx.rotate(-.12);
  ctx.fillStyle="#ef812e";ctx.strokeStyle="#bf5b24";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-18,-12);ctx.quadraticCurveTo(17,-19,13,3);ctx.quadraticCurveTo(9,23,-4,31);ctx.quadraticCurveTo(-7,14,-18,-12);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#ffb45d";ctx.lineWidth=2;
  for(let y=-7;y<19;y+=7){ctx.beginPath();ctx.moveTo(-9,y);ctx.lineTo(7,y+3);ctx.stroke()}
  ctx.strokeStyle="#668b3d";ctx.lineWidth=8;ctx.lineCap="round";
  [-.5,0,.5].forEach(a=>{ctx.beginPath();ctx.moveTo(-10,-9);ctx.lineTo(-18+Math.sin(a)*15,-29+Math.cos(a)*4);ctx.stroke()});
  ctx.strokeStyle="#a94d20";ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(-15,-9);ctx.quadraticCurveTo(13,-14,9,4);ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
}
function drawBone(){ctx.fillStyle="#fff5d8";ctx.strokeStyle="#c99860";ctx.lineWidth=4;ctx.beginPath();ctx.arc(-17,-8,10,0,7);ctx.arc(-17,8,10,0,7);ctx.arc(17,-8,10,0,7);ctx.arc(17,8,10,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#fff5d8";ctx.fillRect(-17,-10,34,20)}
function drawCheese(x,y){
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(performance.now()/420)*.08);
  ctx.fillStyle="#ffd552";ctx.strokeStyle="#b97820";ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-27,20);ctx.lineTo(-25,-14);ctx.lineTo(27,-25);ctx.lineTo(27,20);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#e3a72d";
  [[-9,-3,6],[11,7,5],[14,-13,4],[-14,13,4]].forEach(([cx,cy,r])=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill()});
  ctx.restore();
}
function drawHome(x,y){ctx.fillStyle="#fff2ce";roundedRect(x,y,150,160,25);ctx.fill();ctx.fillStyle="#e96850";ctx.beginPath();ctx.moveTo(x-20,y+30);ctx.lineTo(x+75,y-45);ctx.lineTo(x+170,y+30);ctx.closePath();ctx.fill();ctx.fillStyle="#1d8177";roundedRect(x+53,y+85,46,75,20);ctx.fill();ctx.fillStyle="#ffc34c";ctx.beginPath();ctx.arc(x+88,y+120,4,0,7);ctx.fill();ctx.fillStyle="#183b3a";ctx.font="900 20px 'M PLUS Rounded 1c'";ctx.fillText("おうち",x+45,y+58)}
function drawParents(x,y){
  const person=(px,shirt,hair,label,wave)=>{
    ctx.save();ctx.translate(x+px,y);
    ctx.fillStyle="#f3c6a4";ctx.beginPath();ctx.arc(0,18,18,0,7);ctx.fill();
    ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,12,19,Math.PI,0);ctx.lineTo(18,20);ctx.lineTo(-18,20);ctx.fill();
    ctx.fillStyle=shirt;ctx.beginPath();ctx.roundRect(-24,38,48,66,18);ctx.fill();
    ctx.strokeStyle="#f3c6a4";ctx.lineWidth=12;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-18,48);ctx.lineTo(-34,wave?18:77);ctx.stroke();
    ctx.beginPath();ctx.moveTo(18,48);ctx.lineTo(37,wave?8:77);ctx.stroke();
    ctx.strokeStyle="#334f4d";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-12,98);ctx.lineTo(-14,139);ctx.moveTo(12,98);ctx.lineTo(14,139);ctx.stroke();
    ctx.fillStyle="#183b3a";ctx.font="900 14px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText(label,0,-14);ctx.restore();
  };
  person(0,"#4a8c80","#49372e","とーちゃん",true);
  person(72,"#ef826b","#5a3c30","かーちゃん",true);
  ctx.fillStyle="#fff8e9";ctx.strokeStyle="#ff795f";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-42,y-54,154,30,15);ctx.fill();ctx.stroke();
  ctx.fillStyle="#c74e3b";ctx.font="900 15px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText("たると、おかえり！",x+35,y-34);
}
function drawTart(x,y){
  if(player.inv&&Math.floor(player.inv/6)%2)return;
  ctx.save();ctx.translate(x+40,y+46);
  let facing=player.dir;
  if(player.attack>0){
    if(player.attack>38){
      const turn=(46-player.attack)/8;
      facing=player.attackDir*(1-turn*2);
    }else if(player.attack<9){
      const turnBack=(9-player.attack)/8;
      facing=-player.attackDir*(1-turnBack*2);
    }else{
      facing=-player.attackDir;
    }
  }
  ctx.scale(facing,1);
  const bounce=player.onGround&&Math.abs(player.vx)>1?Math.sin(performance.now()/70)*3:0;ctx.translate(0,bounce);
  ctx.fillStyle="#f3dfb9";ctx.strokeStyle="#fffdf4";ctx.lineWidth=9;
  ctx.beginPath();ctx.arc(-34,-1,27,0,7);ctx.fillStyle="#fffdf3";ctx.fill();ctx.stroke();
  ctx.fillStyle="#f3dfb9";ctx.beginPath();ctx.ellipse(0,15,39,32,0,0,7);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(25,-16,36,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle="#d7b486";ctx.beginPath();ctx.moveTo(6,-39);ctx.lineTo(14,-65);ctx.lineTo(28,-47);ctx.fill();ctx.beginPath();ctx.moveTo(35,-47);ctx.lineTo(55,-63);ctx.lineTo(54,-34);ctx.fill();
  ctx.fillStyle="#fff5dc";ctx.beginPath();ctx.ellipse(30,-7,21,19,0,0,7);ctx.fill();
  ctx.fillStyle="#183b3a";ctx.beginPath();ctx.arc(17,-22,4,0,7);ctx.arc(42,-22,4,0,7);ctx.fill();ctx.beginPath();ctx.arc(31,-8,6,0,7);ctx.fill();
  ctx.fillStyle="#fff3d4";
  if(player.attack>=9&&player.attack<=38){
    ctx.save();ctx.translate(-18,12);ctx.rotate(.68);ctx.fillStyle="#f3dfb9";ctx.strokeStyle="#fffdf4";ctx.lineWidth=8;ctx.beginPath();ctx.roundRect(-78,-10,78,20,10);ctx.fill();ctx.stroke();ctx.fillStyle="#fffdf3";ctx.beginPath();ctx.ellipse(-81,0,17,12,0,0,7);ctx.fill();ctx.restore();
    ctx.beginPath();ctx.ellipse(17,43,13,10,0,0,7);ctx.fill();
    ctx.strokeStyle="#ffc34c";ctx.lineWidth=5;for(let a=-1;a<=1;a++){ctx.beginPath();ctx.moveTo(-69+a*3,-38+a*15);ctx.lineTo(-94+a*7,-55+a*20);ctx.stroke()}
  }else{
    for(const lx of[-14,17]){ctx.beginPath();ctx.ellipse(lx,43,13,10,0,0,7);ctx.fill()}
  }
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);drawBackground();drawWorld();
  if(running){ctx.fillStyle="#fff";ctx.globalAlpha=.12;for(let i=0;i<12;i++){ctx.beginPath();ctx.arc((i*137-camera*.2)%1400,90+(i%4)*55,3+(i%3),0,7);ctx.fill()}ctx.globalAlpha=1}
}
function loop(t){if(running&&t-last>12){update();last=t}draw();requestAnimationFrame(loop)}
function showPerfectPreview(){
  running=false;won=true;
  setEndingMessages("perfect");
  $("#startScreen").classList.add("hidden");$("#storyScreen").classList.add("hidden");
  $("#endScreen").classList.remove("hidden");$("#perfectClear").classList.remove("hidden");
  $("#perfectClear").classList.add("preview-still");
  $("#newRecord").classList.remove("hidden");$("#cheeseHandoff").classList.remove("hidden");
  $("#hud").classList.add("hidden");$("#mobileControls").classList.add("hidden");
  $("#actionScore").textContent="16,240";$("#timeBonus").textContent="2,400";$("#totalScore").textContent="18,640";
}
reset();
const localPerfectPreview=(location.hostname==="localhost"||location.hostname==="127.0.0.1"||location.protocol==="file:")
  && new URLSearchParams(location.search).has("perfect-preview");
if(localPerfectPreview)setTimeout(showPerfectPreview,80);
requestAnimationFrame(loop);
