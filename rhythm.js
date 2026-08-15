const canvas=document.getElementById("rhythmGame"),ctx=canvas.getContext("2d"),$=s=>document.querySelector(s);
const W=720,H=1280,LANE_LEFT=36,LANE_W=162,HIT_Y=1050,NOTE_TOP=390,APPROACH=1.85,SONG_LENGTH=55;
const JUDGE_WINDOWS={perfect:.05,great:.10,good:.16,miss:.18};
const SONGS=[{name:"大冒険2",src:"assets/flowerbed-fields.ogg",bpm:118,beatOffset:.08},{name:"大冒険3",src:"assets/mayu-kawaii-8bit.mp3?v=1",bpm:128,beatOffset:.06}];
const DIFFICULTIES=[{name:"EASY"},{name:"NORMAL"},{name:"HARD"}];
const BAR_PATTERNS=[[[0,1,2,3],[0,1,2],[0,2,3],[0,1,2,3]],[[0,.5,1.5,2,3],[0,1,2,2.5,3],[0,.5,1,2,3],[0,1,1.5,2.5,3]],[[0,.5,1,2,2.5,3,3.5],[0,.5,1.5,2,2.5,3.5],[0,.5,1,1.5,2.5,3,3.5],[0,1,1.5,2,2.5,3,3.5]]];
const ROUTES=[[0,2,1,3,1,2,0],[3,1,2,0,2,1,3],[0,1,3,2,0,2,1],[3,2,0,1,3,1,2]],COLORS=["#ff759f","#ffda66","#79dda0","#72d0ed"];
const mayuImage=new Image(),tarutoImage=new Image();mayuImage.src="assets/mayu-game-v1.png";tarutoImage.src="assets/taruto-card-v1.png";
const bgm=$("#rhythmBgm"),titleBgm=$("#titleBgm");bgm.volume=.3;titleBgm.volume=.2;
let song=0,level=0,running=false,starting=false,caught=false,notes=[],score=0,combo=0,maxCombo=0,pressed=[false,false,false,false];
let counts={},startStamp=0,chartStart=0,nextBar=0,noteId=0,judgeTimer=0,particles=[],feverUntil=0,lastFeverCombo=0,duckShield=0,failedPhrases=new Set(),escapeDistance=80,chaseShake=0,lastMissGroupTime=-99;

function bestKey(){return`taruto-rhythm-chase-best-${song}-${level}`}
function loadBest(){try{return Number(localStorage.getItem(bestKey()))||0}catch(_){return 0}}
function saveBest(){try{if(score>loadBest())localStorage.setItem(bestKey(),String(score))}catch(_){}}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function playTitleBgm(){if(!running&&!starting){const p=titleBgm.play();if(p)p.catch(()=>{})}}
function stopTitleBgm(){titleBgm.pause();titleBgm.currentTime=0}
function selectSong(n){song=n;document.querySelectorAll("[data-song]").forEach((b,i)=>b.classList.toggle("selected",i===song));bgm.src=SONGS[song].src;bgm.load();playTitleBgm()}
function selectLevel(n){level=n;document.querySelectorAll("[data-level]").forEach((b,i)=>b.classList.toggle("selected",i===level));playTitleBgm()}
document.querySelectorAll("[data-song]").forEach(b=>b.onclick=()=>selectSong(Number(b.dataset.song)));
document.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>selectLevel(Number(b.dataset.level)));

async function begin(){
  if(starting)return;starting=true;caught=false;stopTitleBgm();$("#rhythmTitle").classList.add("hidden");$("#rhythmResult").classList.add("hidden");$("#biteEffect").classList.add("hidden");$("#countdown").classList.remove("hidden");resetGame();
  for(let n=3;n>0;n--){$("#countdown").textContent=n;await wait(620)}$("#countdown").textContent="GO!";await wait(380);$("#countdown").classList.add("hidden");
  $("#rhythmHud").classList.remove("hidden");$("#laneControls").classList.remove("hidden");$("#chaseCaption").classList.remove("hidden");bgm.currentTime=0;try{await bgm.play()}catch(_){}running=true;starting=false;startStamp=performance.now()-bgm.currentTime*1000;updateHud();
}
function resetGame(){
  notes=[];score=0;combo=0;maxCombo=0;counts={perfect:0,great:0,good:0,miss:0,carrot:0,bone:0,duck:0,fever:0,phrase:0};pressed.fill(false);particles=[];judgeTimer=0;feverUntil=0;lastFeverCombo=0;duckShield=0;failedPhrases=new Set();escapeDistance=80;chaseShake=0;lastMissGroupTime=-99;nextBar=0;noteId=0;
  const music=SONGS[song],beat=60/music.bpm;chartStart=music.beatOffset+Math.ceil((2-music.beatOffset)/beat)*beat;document.body.classList.remove("fever-active");$("#scoreHud").classList.remove("fever-score");
}
function songTime(){if(!running)return 0;return !bgm.paused&&Number.isFinite(bgm.currentTime)?bgm.currentTime:(performance.now()-startStamp)/1000}
function isFever(now=songTime()){return running&&now<feverUntil}
function spawnNotes(now){
  const beat=60/SONGS[song].bpm;
  while(chartStart+nextBar*beat*4<=now+APPROACH&&chartStart+nextBar*beat*4<SONG_LENGTH-1){
    const barStart=chartStart+nextBar*beat*4,pattern=BAR_PATTERNS[level][(nextBar+song)%4],route=ROUTES[(nextBar+song*2)%4],phrase=Math.floor(nextBar/4);
    pattern.forEach((offset,index)=>{const time=barStart+offset*beat;if(time>=SONG_LENGTH-1)return;const lane=route[(index+nextBar)%route.length],lastBar=nextBar%4===3,last=index===pattern.length-1,type=lastBar&&last&&phrase%2===1?"duck":(noteId+index+song)%2?"bone":"carrot";addNote(time,lane,type,phrase,lastBar&&last);if(offset===0&&nextBar%4===0&&level>0){const other=lane<2?lane+2:lane-2;addNote(time,other,type==="carrot"?"bone":"carrot",phrase,false)}});
    noteId+=pattern.length;nextBar++;
  }
}
function addNote(time,lane,type,phrase,phraseEnd){notes.push({time,lane,type,phrase,phraseEnd,done:false,id:noteId+notes.length/100})}
function updateHud(){
  const fever=isFever(),remain=Math.max(0,feverUntil-songTime());$("#rhythmScore").textContent=score.toLocaleString("ja-JP");$("#rhythmCombo").textContent=combo;$("#rhythmBest").textContent=Math.max(score,loadBest()).toLocaleString("ja-JP");$("#scoreLabel").textContent=fever?"FEVER ×2":"SCORE";$("#scoreHud").classList.toggle("fever-score",fever);$("#feverValue").textContent=fever?`${remain.toFixed(1)}秒`:`${Math.min(combo,15)}/15`;document.body.classList.toggle("fever-active",fever);
  const label=escapeDistance>65?"まだ安全！":escapeDistance>40?"近づいてきた…":escapeDistance>18?"危ない！すぐ後ろ！":"追いつかれる!!";$("#distanceText").textContent=duckShield?"🦆 カモさんガード中":label;
}
function showJudge(text,color){const el=$("#judgeText");el.textContent=text;el.style.color=color;el.classList.remove("hidden");el.style.animation="none";void el.offsetWidth;el.style.animation="";judgeTimer=28}
function showCombo(){const el=$("#comboBurst");if(combo<2){el.classList.add("hidden");return}$("#comboBurstValue").textContent=combo;el.classList.remove("hidden")}
function sfx(freq,duration=.08){try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="sine";g.gain.setValueAtTime(.045,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(_){}}
let audioCtx;
function burst(color,n=14,x=W/2,y=HIT_Y){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*12,vy:-3-Math.random()*9,life:40,color})}
function moveAway(amount){escapeDistance=Math.min(100,escapeDistance+amount)}
function approach(amount){
  if(duckShield){duckShield=0;showJudge("カモさんガード！","#87f1db");sfx(760,.13);return}
  escapeDistance=Math.max(0,escapeDistance-amount);chaseShake=18;combo=0;feverUntil=0;showCombo();if(escapeDistance<=0)gameOver();
}
function triggerFever(now){feverUntil=Math.max(feverUntil,now+8);lastFeverCombo=combo;counts.fever++;burst("#fff36d",32);sfx(880,.13);setTimeout(()=>sfx(1175,.15),90)}
function awardPhrase(){counts.phrase++;const bonus=2000*(level+1);score+=bonus;moveAway(4);showJudge(`逃走ボーナス +${bonus}`,"#fff06d");burst("#fff06d",28);sfx(990,.14)}
function hitLane(lane){
  if(!running)return;const now=songTime(),available=notes.filter(n=>!n.done&&n.lane===lane),note=available.reduce((best,n)=>Math.abs(n.time-now)<Math.abs((best?best.time:999)-now)?n:best,null);
  if(!note||Math.abs(note.time-now)>JUDGE_WINDOWS.good){counts.miss++;approach(5);showJudge("MISS! たると接近","#ff6f8e");sfx(145);updateHud();return}
  note.done=true;const delta=Math.abs(note.time-now);let label,color,points;if(delta<=JUDGE_WINDOWS.perfect){label="PERFECT!";color="#fff06d";points=1000;counts.perfect++}else if(delta<=JUDGE_WINDOWS.great){label="GREAT!";color="#87efda";points=650;counts.great++}else{label="GOOD";color="#a7e889";points=350;counts.good++}
  combo++;maxCombo=Math.max(maxCombo,combo);counts[note.type]++;const fever=isFever(now),duck=note.type==="duck";score+=Math.round(((duck?1500:points)+combo*6)*(fever?2:1));moveAway((.65+Math.min(combo,30)*.035)*1.5);if(duck)duckShield=1;showJudge(duck?"カモさんガード GET!":fever?`${label} ×2`:label,duck?"#87efda":color);showCombo();burst(duck?"#87efda":COLORS[lane],duck?26:14,LANE_LEFT+lane*LANE_W+LANE_W/2,HIT_Y);sfx(duck?760:note.type==="carrot"?660:520);
  if(combo%10===0){moveAway(4);showJudge(`${combo} COMBO！ 距離 +4`,"#fff06d");burst("#fff06d",24)}if(note.phraseEnd&&!failedPhrases.has(note.phrase))awardPhrase();if(combo>=15&&combo%15===0&&combo!==lastFeverCombo)triggerFever(now);updateHud();
}
function missNote(note){note.done=true;failedPhrases.add(note.phrase);counts.miss++;const sameChord=Math.abs(note.time-lastMissGroupTime)<.01;if(sameChord)return;lastMissGroupTime=note.time;if(duckShield){duckShield=0;showJudge("カモさんガード！","#87efda");sfx(760,.13);return}approach(14);showJudge("MISS! たると急接近！","#ff6f8e");sfx(130,.12);updateHud()}
function gameOver(){if(caught||!running)return;caught=true;running=false;bgm.pause();document.body.classList.remove("fever-active");$("#laneControls").classList.add("hidden");$("#biteEffect").classList.remove("hidden");sfx(85,.35);setTimeout(()=>{$("#biteEffect").classList.add("hidden");finish(true)},1200)}
function finish(wasCaught=false){
  running=false;bgm.pause();const distanceBonus=wasCaught?0:Math.round(escapeDistance)*100;score+=distanceBonus;saveBest();document.body.classList.remove("fever-active");$("#rhythmHud").classList.add("hidden");$("#laneControls").classList.add("hidden");$("#chaseCaption").classList.add("hidden");$("#judgeText").classList.add("hidden");$("#comboBurst").classList.add("hidden");
  const judged=counts.perfect+counts.great+counts.good+counts.miss,accuracy=judged?(counts.perfect+counts.great*.75+counts.good*.4)/judged:0,grade=wasCaught?"D":counts.miss===0&&accuracy>.97?"SSS":accuracy>=.92?"S":accuracy>=.8?"A":accuracy>=.66?"B":accuracy>=.5?"C":"D";
  $("#resultEyebrow").textContent=wasCaught?"GAME OVER":"ESCAPE COMPLETE";$("#resultTitle").textContent=wasCaught?"たるとに噛まれた！":"まゆ、逃げ切った！";$("#resultGrade").textContent=grade;$("#danceName").textContent=wasCaught?"コンボで距離を取り戻そう":"リズム逃走成功！";$("#perfectCount").textContent=counts.perfect;$("#greatCount").textContent=counts.great;$("#goodCount").textContent=counts.good;$("#missCount").textContent=counts.miss;$("#maxComboResult").textContent=maxCombo;$("#phraseCount").textContent=counts.phrase;$("#distanceBonus").textContent=distanceBonus.toLocaleString("ja-JP");$("#finalScore").textContent=score.toLocaleString("ja-JP");$("#rhythmResult").classList.remove("hidden");
}
function showTitle(){running=false;starting=false;caught=false;bgm.pause();document.body.classList.remove("fever-active");$("#rhythmResult").classList.add("hidden");$("#rulesScreen").classList.add("hidden");$("#biteEffect").classList.add("hidden");$("#rhythmTitle").classList.remove("hidden");playTitleBgm();draw()}
function update(){if(!running)return;const now=songTime();spawnNotes(now);for(const n of notes)if(!n.done&&now-n.time>JUDGE_WINDOWS.miss)missNote(n);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.3;p.life--});particles=particles.filter(p=>p.life>0);if(chaseShake>0)chaseShake--;if(judgeTimer>0&&--judgeTimer===0)$("#judgeText").classList.add("hidden");updateHud();if(now>SONG_LENGTH)finish(false)}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawChase(now){
  const sky=ctx.createLinearGradient(0,0,0,350);sky.addColorStop(0,"#70cddd");sky.addColorStop(1,"#ffe0a0");ctx.fillStyle=sky;ctx.fillRect(0,0,W,350);ctx.fillStyle="#9ca6ba";for(let i=0;i<8;i++){const x=((i*145-now*90)%1000)-130,h=80+(i%3)*35;ctx.fillRect(x,250-h,110,h);ctx.fillStyle="#cfe8e8";for(let y=190-h;y<235;y+=25)for(let wx=x+15;wx<x+100;wx+=30)ctx.fillRect(wx,y,12,13);ctx.fillStyle="#9ca6ba"}ctx.fillStyle="#65566d";ctx.fillRect(0,300,W,50);ctx.strokeStyle="#fff";ctx.lineWidth=6;ctx.setLineDash([45,32]);ctx.beginPath();ctx.moveTo(-((now*130)%77),326);ctx.lineTo(W,326);ctx.stroke();ctx.setLineDash([]);
  const danger=1-escapeDistance/100,mayuX=500,tarutoX=35+danger*355+(chaseShake?Math.sin(chaseShake*2)*8:0),run=Math.sin(now*12)*7;
  if(tarutoImage.complete)ctx.drawImage(tarutoImage,tarutoX,183+run,190,150);if(mayuImage.complete)ctx.drawImage(mayuImage,mayuX,132-run,125,200);ctx.fillStyle="#fff";ctx.font="900 12px sans-serif";ctx.textAlign="center";ctx.fillText("たると",tarutoX+90,177+run);ctx.fillText("まゆ",mayuX+62,127-run);ctx.font="28px sans-serif";ctx.fillText("💨",mayuX-25,252);
  if(escapeDistance<35){ctx.fillStyle="#ff5677";ctx.font="900 25px sans-serif";ctx.fillText("危ない！",360,105)}
}
function drawNote(n,x,y){ctx.save();ctx.translate(x,y);ctx.shadowColor=COLORS[n.lane];ctx.shadowBlur=16;ctx.fillStyle=n.type==="duck"?"#fff4a0":COLORS[n.lane];ctx.strokeStyle="#fff";ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,n.type==="duck"?42:36,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#52394d";ctx.font=n.type==="duck"?"38px sans-serif":"900 24px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(n.type==="duck"?"🦆":n.type==="carrot"?"🥕":"🦴",0,1);ctx.restore()}
function draw(){
  const now=songTime();ctx.clearRect(0,0,W,H);drawChase(now);ctx.fillStyle="#2f263bdd";ctx.fillRect(0,350,W,H-350);ctx.fillStyle="#ffffff0b";for(let y=370;y<H;y+=54)ctx.fillRect(0,y,W,2);
  for(let i=0;i<4;i++){const x=LANE_LEFT+i*LANE_W;ctx.fillStyle=COLORS[i]+"35";ctx.fillRect(x,365,LANE_W-6,HIT_Y-365+40);ctx.strokeStyle="#ffffff33";ctx.lineWidth=2;ctx.strokeRect(x,365,LANE_W-6,HIT_Y-365+40)}ctx.strokeStyle="#fff";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(LANE_LEFT,HIT_Y);ctx.lineTo(W-LANE_LEFT,HIT_Y);ctx.stroke();ctx.strokeStyle="#ffe36c";ctx.lineWidth=3;ctx.stroke();
  if(running)for(const n of notes){if(n.done)continue;const y=HIT_Y-(n.time-now)/APPROACH*(HIT_Y-NOTE_TOP);if(y>NOTE_TOP-70&&y<HIT_Y+60)drawNote(n,LANE_LEFT+n.lane*LANE_W+LANE_W/2-3,y)}particles.forEach(p=>{ctx.globalAlpha=p.life/40;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
}
function loop(){update();draw();requestAnimationFrame(loop)}
function setLane(lane,on){pressed[lane]=on;const b=document.querySelector(`[data-lane="${lane}"]`);if(b)b.classList.toggle("active",on);if(on)hitLane(lane)}
const keys={d:0,f:1,j:2,k:3};addEventListener("keydown",e=>{const lane=keys[e.key.toLowerCase()];if(lane!==undefined&&!pressed[lane]){e.preventDefault();setLane(lane,true)}});addEventListener("keyup",e=>{const lane=keys[e.key.toLowerCase()];if(lane!==undefined)setLane(lane,false)});
document.querySelectorAll("[data-lane]").forEach(b=>{const lane=Number(b.dataset.lane);b.onpointerdown=e=>{e.preventDefault();if(!pressed[lane]){try{navigator.vibrate&&navigator.vibrate(16)}catch(_){}setLane(lane,true)}};b.onpointerup=b.onpointercancel=()=>setLane(lane,false);b.oncontextmenu=e=>e.preventDefault()});
$("#rhythmStart").onclick=begin;$("#rhythmRetry").onclick=begin;$("#rhythmBackTitle").onclick=showTitle;$("#rulesBtn").onclick=()=>$("#rulesScreen").classList.remove("hidden");$("#rulesClose").onclick=()=>$("#rulesScreen").classList.add("hidden");$("#rhythmHome").onclick=()=>location.href="index.html";addEventListener("blur",()=>pressed.forEach((_,i)=>setLane(i,false)));addEventListener("pointerdown",playTitleBgm,{once:true});addEventListener("keydown",playTitleBgm,{once:true});selectSong(0);selectLevel(0);draw();requestAnimationFrame(loop);playTitleBgm();
