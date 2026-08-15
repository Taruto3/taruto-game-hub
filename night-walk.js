const canvas=document.getElementById("nightGame"),ctx=canvas.getContext("2d"),$=s=>document.querySelector(s);
const W=1280,H=720,groundY=590,worldW=6200,goalX=5850,RUN_TIME=150;
const keys={jump:false,kick:false};
let running=false,won=false,last=0,camera=0,lives=3,score=0,timeLeft=RUN_TIME*10,endTime=0;
let player,mom,items,enemies,ducks,phones,splashes,messageTimer,enemyDefeated=0,duckJumps=0;
const grounds=[
  {x:0,w:880},{x:1230,w:850},{x:2420,w:1030},{x:3820,w:900},{x:5080,w:1120}
];
const platforms=[
  {x:760,y:465,w:190,h:24},{x:980,y:370,w:180,h:24},{x:1150,y:470,w:150,h:24},
  {x:1980,y:455,w:190,h:24},{x:2160,y:365,w:190,h:24},{x:2325,y:470,w:150,h:24},
  {x:3310,y:455,w:190,h:24},{x:3500,y:355,w:180,h:24},{x:3660,y:465,w:170,h:24},
  {x:4660,y:455,w:190,h:24},{x:4850,y:360,w:180,h:24},{x:5010,y:465,w:150,h:24}
];
const rivers=[{x:880,w:350},{x:2080,w:340},{x:3450,w:370},{x:4720,w:360}];

function reset(){
  player={x:190,y:groundY-88,w:76,h:88,vx:0,vy:0,onGround:false,inv:0,kick:0,cool:0};
  mom={x:45,y:groundY-139};camera=0;lives=3;score=0;timeLeft=RUN_TIME*10;endTime=performance.now()+RUN_TIME*1000;won=false;
  enemyDefeated=0;duckJumps=0;phones=[];splashes=[];
  items=[
    [620,520,"bone"],[1040,320,"carrot"],[1460,520,"bone"],[1860,520,"carrot"],
    [2240,315,"bone"],[2770,520,"carrot"],[3250,520,"bone"],[3590,305,"carrot"],
    [4080,520,"bone"],[4520,520,"carrot"],[4930,310,"bone"],[5380,520,"carrot"]
  ].map(([x,y,type])=>({x,y,type,taken:false,bob:Math.random()*6}));
  enemies=[
    {type:"drunk",x:710,y:groundY-70,min:600,max:820,v:1.05,alive:true},
    {type:"phone",x:1510,y:groundY-78,min:1430,max:1680,v:.75,alive:true,throw:80},
    {type:"drunk",x:1900,y:groundY-70,min:1770,max:2030,v:1.15,alive:true},
    {type:"phone",x:2800,y:groundY-78,min:2690,max:2920,v:.7,alive:true,throw:55},
    {type:"drunk",x:3210,y:groundY-70,min:3090,max:3370,v:1.2,alive:true},
    {type:"phone",x:4070,y:groundY-78,min:3980,max:4200,v:.8,alive:true,throw:100},
    {type:"drunk",x:4470,y:groundY-70,min:4350,max:4620,v:1.25,alive:true},
    {type:"phone",x:5310,y:groundY-78,min:5230,max:5450,v:.75,alive:true,throw:65}
  ];
  ducks=[
    {x:1080,y:groundY-15,scored:false,bounce:0,phase:0},
    {x:3560,y:groundY-15,scored:false,bounce:0,phase:2},
    {x:4880,y:groundY-15,scored:false,bounce:0,phase:4}
  ];
  updateHud();
}
function updateHud(){
  $("#lives").textContent="♥ ".repeat(lives).trim();$("#score").textContent=score.toLocaleString("ja-JP");
  $("#time").textContent=(timeLeft/10).toFixed(1);$("#duckCount").textContent=`${duckJumps}/${ducks.length}`;
}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function showMessage(text,duration=900){
  const el=$("#message");el.textContent=text;el.classList.remove("hidden");
  clearTimeout(messageTimer);messageTimer=setTimeout(()=>el.classList.add("hidden"),duration);
}
async function enterGameMode(){
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:"hide"})}catch(_){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape")}catch(_){}
}
function showStory(){enterGameMode();$("#titleScreen").classList.add("hidden");$("#storyScreen").classList.remove("hidden")}
function start(){
  enterGameMode();reset();running=true;
  $("#titleScreen").classList.add("hidden");$("#storyScreen").classList.add("hidden");$("#resultScreen").classList.add("hidden");
  $("#hud").classList.remove("hidden");$("#mobileControls").classList.remove("hidden");
  showMessage("かーちゃん「たると、駅までいくよ！」",1300);
}
function hurt(text="ぶつかっちゃった！ −50"){
  if(player.inv>0)return;
  lives--;score-=50;player.inv=100;player.vy=-9;updateHud();showMessage(text);
  if(lives<=0){reset();showMessage("かーちゃん「もう一度、おうちから行こう！」",1500)}
}
function emitSplash(x){
  for(let i=0;i<18;i++)splashes.push({x:x+(Math.random()-.5)*45,y:groundY+15,vx:(Math.random()-.5)*8,vy:-3-Math.random()*8,r:3+Math.random()*5,life:30});
}
function finish(){
  won=true;running=false;
  const bonus=timeLeft,total=score+bonus;
  $("#totalScore").textContent=total.toLocaleString("ja-JP");
  $("#itemResult").textContent=`${items.filter(i=>i.taken).length}/${items.length}`;
  $("#duckResult").textContent=`${duckJumps}/${ducks.length}`;
  $("#enemyResult").textContent=`${enemyDefeated}/${enemies.length}`;
  $("#timeResult").textContent=(timeLeft/10).toFixed(1);
  $("#hud").classList.add("hidden");$("#mobileControls").classList.add("hidden");$("#resultScreen").classList.remove("hidden");
}
function kick(){
  if(!running||player.cool>0)return;player.kick=36;player.cool=52;player.vx*=.45;
}
function jump(){if(running&&player.onGround){player.vy=-14.5;player.onGround=false}}
function update(){
  const next=Math.max(0,Math.ceil((endTime-performance.now())/100));if(next!==timeLeft){timeLeft=next;updateHud()}
  if(timeLeft<=0){hurt("時間切れ！ おうちから再出発");endTime=performance.now()+RUN_TIME*1000}
  const speed=player.kick>0?3.5:5.6;player.vx+=(speed-player.vx)*.2;player.vy=Math.min(18,player.vy+.72);
  const oldY=player.y;player.x+=player.vx;player.y+=player.vy;
  player.onGround=false;
  const surfaces=grounds.map(g=>({x:g.x,y:groundY,w:g.w,h:130})).concat(platforms);
  for(const p of surfaces){
    if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY+player.h<=p.y+4&&player.y+player.h>=p.y&&player.vy>=0){
      player.y=p.y-player.h;player.vy=0;player.onGround=true;
    }
  }
  ducks.forEach(d=>{
    const y=d.y+Math.sin(performance.now()/350+d.phase)*4,top=y-12;if(d.bounce>0)d.bounce--;
    if(player.vy>=0&&player.x+player.w>d.x-38&&player.x<d.x+38&&oldY+player.h<=top+8&&player.y+player.h>=top){
      player.y=top-player.h;player.vy=-23.5;d.bounce=15;
      if(!d.scored){d.scored=true;duckJumps++;score+=150;updateHud();showMessage(`カモさんジャンプ！ ＋150（${duckJumps}/${ducks.length}）`)}
    }
  });
  const river=rivers.find(r=>player.x+player.w*.7>r.x&&player.x+player.w*.3<r.x+r.w&&player.y+player.h>groundY+38);
  if(river){
    emitSplash(player.x+player.w/2);lives--;score-=50;updateHud();
    if(lives<=0){reset();showMessage("川に落ちた！ おうちから再出発",1400)}
    else{player.x=Math.max(50,river.x-300);player.y=groundY-player.h;player.vx=0;player.vy=0;player.inv=80;showMessage("川に落ちちゃった！ −50")}
  }
  items.forEach(item=>{
    item.bob+=.05;
    if(!item.taken&&overlap(player,{x:item.x-24,y:item.y-24,w:48,h:48})){
      item.taken=true;score+=item.type==="carrot"?100:50;if(item.type==="carrot")lives=Math.min(3,lives+1);
      updateHud();showMessage(item.type==="carrot"?"にんじんトイ！ ＋100・ライフ回復":"ホネッコ！ ＋50");
    }
  });
  enemies.forEach(e=>{
    if(!e.alive)return;e.x+=e.v;if(e.x<e.min||e.x>e.max)e.v*=-1;
    if(e.type==="phone"&&--e.throw<=0&&Math.abs(e.x-player.x)<720){
      phones.push({x:e.x,y:e.y+18,vx:-6.6,vy:-2.2,spin:0});e.throw=100+Math.random()*60;
    }
    const target={x:e.x,y:e.y,w:58,h:e.type==="drunk"?70:78};
    const hit={x:player.x+player.w-5,y:player.y-25,w:84,h:110};
    if(player.kick>8&&player.kick<31&&overlap(hit,target)){
      e.alive=false;enemyDefeated++;score+=e.type==="phone"?200:100;updateHud();
      showMessage(e.type==="phone"?"歩きスマホを注意した！ ＋200":"酔っぱらいをよけた！ ＋100");return;
    }
    if(overlap(player,target)){
      if(player.vy>2&&player.y+player.h<e.y+25){e.alive=false;enemyDefeated++;score+=e.type==="phone"?200:100;player.vy=-10;updateHud()}
      else hurt();
    }
  });
  phones.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.22;p.spin+=.2;if(overlap(player,{x:p.x-12,y:p.y-18,w:24,h:36})){p.dead=true;hurt("飛んできたスマホに当たった！ −50")}});
  phones=phones.filter(p=>!p.dead&&p.x>camera-50&&p.y<H+40);
  splashes.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.4;s.life--;s.r*=.98});splashes=splashes.filter(s=>s.life>0);
  mom.x+=(Math.max(20,player.x-155)-mom.x)*.08;
  if(Math.floor(player.x/900)!==Math.floor((player.x-player.vx)/900))showMessage(["かーちゃん「いい調子！」","かーちゃん「たると、がんばれ！」","かーちゃん「駅はもうすぐだよ！」"][Math.floor(player.x/900)%3],950);
  if(player.inv>0)player.inv--;if(player.kick>0)player.kick--;if(player.cool>0)player.cool--;
  if(player.x>goalX)finish();
  camera+=(Math.max(0,Math.min(worldW-W,player.x-W*.36))-camera)*.08;
}

function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawBackground(){
  const progress=camera/(worldW-W);
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,progress<.55?"#101735":"#182452");sky.addColorStop(1,"#59628b");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#fff7c9";ctx.beginPath();ctx.arc(1050-camera*.025,105,47,0,7);ctx.fill();ctx.fillStyle="#20294f";ctx.beginPath();ctx.arc(1070-camera*.025,90,45,0,7);ctx.fill();
  for(let i=0;i<70;i++){const x=(i*193-camera*.05)%1400,y=35+(i*83)%260;ctx.globalAlpha=.35+(i%4)*.14;ctx.fillStyle="#fff";ctx.fillRect(x,y,2+(i%2),2+(i%2))}ctx.globalAlpha=1;
  ctx.fillStyle="#1b2546";ctx.beginPath();ctx.moveTo(0,430);for(let x=0;x<=W;x+=80)ctx.lineTo(x,390+Math.sin((x+camera*.12)/170)*30);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
}
function drawCity(){
  for(let x=150;x<worldW;x+=320){
    if(x<3000){ctx.fillStyle=x%640?"#d9c0a8":"#b6c4cf";rounded(x,groundY-150,220,150,8);ctx.fill();ctx.fillStyle="#6d4a4d";ctx.beginPath();ctx.moveTo(x-18,groundY-150);ctx.lineTo(x+110,groundY-230);ctx.lineTo(x+238,groundY-150);ctx.fill();for(let wx=25;wx<190;wx+=65){ctx.fillStyle="#ffd76c";ctx.fillRect(x+wx,groundY-115,30,36)}}
    else{const height=260+(x%4)*45;ctx.fillStyle=x%640?"#56658a":"#465579";ctx.fillRect(x,groundY-height,230,height);for(let fy=groundY-height+25;fy<groundY-25;fy+=42)for(let wx=20;wx<210;wx+=47){ctx.fillStyle=(fy+wx+x)%3?"#ffd76c":"#263252";ctx.fillRect(x+wx,fy,22,18)}}
  }
  for(let x=400;x<worldW;x+=520){ctx.strokeStyle="#4a5067";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x,groundY);ctx.lineTo(x,groundY-225);ctx.stroke();ctx.fillStyle="#ffe594";ctx.shadowColor="#ffe594";ctx.shadowBlur=28;ctx.beginPath();ctx.ellipse(x,groundY-228,24,12,0,0,7);ctx.fill();ctx.shadowBlur=0}
}
function drawWorld(){
  ctx.save();ctx.translate(-camera,0);drawCity();
  rivers.forEach(r=>{ctx.fillStyle="#223c67";ctx.fillRect(r.x,groundY,r.w,130);ctx.strokeStyle="#8ab0d4";ctx.lineWidth=3;for(let x=r.x;x<r.x+r.w;x+=35){ctx.beginPath();ctx.arc(x,groundY+15,14,Math.PI,0);ctx.stroke()}});
  grounds.forEach(g=>{ctx.fillStyle="#4a4f61";rounded(g.x,groundY,g.w,130,8);ctx.fill();ctx.fillStyle="#a6a6aa";ctx.fillRect(g.x,groundY,g.w,18);ctx.strokeStyle="#73747c";ctx.lineWidth=2;for(let x=g.x;x<g.x+g.w;x+=70){ctx.beginPath();ctx.moveTo(x,groundY);ctx.lineTo(x,groundY+130);ctx.stroke()}});
  platforms.forEach(p=>{ctx.fillStyle="#8791a5";rounded(p.x,p.y,p.w,p.h,8);ctx.fill();ctx.fillStyle="#c5cad3";ctx.fillRect(p.x+5,p.y,p.w-10,5)});
  items.forEach(i=>{if(i.taken)return;ctx.save();ctx.translate(i.x,i.y+Math.sin(i.bob)*5);i.type==="carrot"?drawCarrot():drawBone();ctx.restore()});
  ducks.forEach(d=>drawDuck(d.x,d.y+Math.sin(performance.now()/350+d.phase)*4,d.bounce));
  enemies.forEach(e=>{if(e.alive)(e.type==="drunk"?drawDrunk:drawPhoneWalker)(e.x,e.y,e.v)});
  phones.forEach(drawFlyingPhone);splashes.forEach(s=>{ctx.globalAlpha=s.life/30;ctx.fillStyle="#d9f4ff";ctx.beginPath();ctx.ellipse(s.x,s.y,s.r*.7,s.r*1.4,0,0,7);ctx.fill()});ctx.globalAlpha=1;
  drawStation(goalX+60,groundY-350);drawDad(goalX+160,groundY-145);
  drawMomAndLeash();drawTart();
  ctx.restore();
}
function drawMomAndLeash(){
  const mx=mom.x,my=mom.y;
  ctx.strokeStyle="#e05d74";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(mx+30,my+62);ctx.quadraticCurveTo((mx+player.x)/2,groundY-20,player.x+22,player.y+42);ctx.stroke();
  ctx.fillStyle="#f0bea0";ctx.beginPath();ctx.arc(mx+25,my+20,18,0,7);ctx.fill();ctx.fillStyle="#3d2d32";ctx.beginPath();ctx.arc(mx+25,my+13,19,Math.PI,0);ctx.lineTo(mx+44,my+28);ctx.lineTo(mx+7,my+28);ctx.fill();ctx.fillStyle="#e77c83";rounded(mx,my+39,50,67,17);ctx.fill();ctx.strokeStyle="#f0bea0";ctx.lineWidth=11;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(mx+8,my+52);ctx.lineTo(mx-6,my+80);ctx.moveTo(mx+42,my+52);ctx.lineTo(mx+59,my+70);ctx.stroke();ctx.strokeStyle="#30364b";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(mx+13,my+101);ctx.lineTo(mx+10,my+139);ctx.moveTo(mx+37,my+101);ctx.lineTo(mx+40,my+139);ctx.stroke();ctx.fillStyle="#fff4d7";ctx.font="900 12px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText("かーちゃん",mx+25,my-8);
}
function drawTart(){
  if(player.inv&&Math.floor(player.inv/6)%2)return;
  ctx.save();ctx.translate(player.x+38,player.y+46);if(player.kick>0)ctx.scale(-1,1);
  const bounce=player.onGround?Math.sin(performance.now()/70)*2:0;ctx.translate(0,bounce);ctx.fillStyle="#f0ddb8";ctx.strokeStyle="#fffdf3";ctx.lineWidth=8;
  ctx.beginPath();ctx.arc(-30,0,24,0,7);ctx.fillStyle="#fffdf3";ctx.fill();ctx.stroke();ctx.fillStyle="#f0ddb8";ctx.beginPath();ctx.ellipse(0,14,37,30,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(24,-15,33,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#d4af7c";ctx.beginPath();ctx.moveTo(5,-37);ctx.lineTo(13,-61);ctx.lineTo(27,-44);ctx.moveTo(34,-44);ctx.lineTo(53,-60);ctx.lineTo(51,-32);ctx.fill();ctx.fillStyle="#17213e";ctx.beginPath();ctx.arc(15,-20,4,0,7);ctx.arc(39,-20,4,0,7);ctx.arc(29,-7,5,0,7);ctx.fill();ctx.strokeStyle="#e05d74";ctx.lineWidth=7;ctx.beginPath();ctx.arc(-2,8,31,.1,2.8);ctx.stroke();
  ctx.fillStyle="#fff8df";if(player.kick>8&&player.kick<31){ctx.save();ctx.translate(-17,12);ctx.rotate(.68);ctx.fillStyle="#f0ddb8";ctx.strokeStyle="#fffdf3";ctx.lineWidth=7;rounded(-75,-9,75,18,9);ctx.fill();ctx.stroke();ctx.restore()}else for(const lx of[-13,16]){ctx.beginPath();ctx.ellipse(lx,41,12,9,0,0,7);ctx.fill()}ctx.restore();
}
function drawDrunk(x,y,v){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(performance.now()/250+x)*.1);ctx.fillStyle="#e6b18e";ctx.beginPath();ctx.arc(28,16,17,0,7);ctx.fill();ctx.fillStyle="#35303a";ctx.beginPath();ctx.arc(28,10,18,Math.PI,0);ctx.fill();ctx.fillStyle="#7a5b8c";rounded(4,34,48,45,13);ctx.fill();ctx.strokeStyle="#34374a";ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(15,75);ctx.lineTo(7,105);ctx.moveTo(40,75);ctx.lineTo(49,105);ctx.stroke();ctx.fillStyle="#fff";ctx.font="900 11px sans-serif";ctx.fillText("酔",22,61);ctx.restore()}
function drawPhoneWalker(x,y,v){ctx.save();ctx.translate(x,y);ctx.fillStyle="#e8b493";ctx.beginPath();ctx.arc(28,17,16,0,7);ctx.fill();ctx.fillStyle="#252c42";ctx.beginPath();ctx.arc(28,10,17,Math.PI,0);ctx.fill();ctx.fillStyle="#4f83a5";rounded(5,35,47,45,12);ctx.fill();ctx.strokeStyle="#30354a";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(16,77);ctx.lineTo(10,108);ctx.moveTo(40,77);ctx.lineTo(46,108);ctx.stroke();ctx.fillStyle="#111a30";rounded(44,30,17,29,3);ctx.fill();ctx.fillStyle="#72d5ee";ctx.fillRect(47,34,11,18);ctx.restore()}
function drawFlyingPhone(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.spin);ctx.fillStyle="#111a30";rounded(-10,-17,20,34,4);ctx.fill();ctx.fillStyle="#72d5ee";ctx.fillRect(-7,-12,14,20);ctx.restore()}
function drawDuck(x,y,b){ctx.save();ctx.translate(x,y);ctx.scale(1+b*.015,1-b*.02);ctx.fillStyle="#96623f";ctx.strokeStyle="#fff4d5";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,8,34,18,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#25715d";ctx.beginPath();ctx.ellipse(-6,5,23,12,0,0,7);ctx.fill();ctx.fillStyle="#584536";ctx.beginPath();ctx.arc(22,-8,16,0,7);ctx.fill();ctx.fillStyle="#dda33f";ctx.beginPath();ctx.moveTo(36,-7);ctx.lineTo(55,-1);ctx.lineTo(36,2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(27,-12,4,0,7);ctx.fill();ctx.restore()}
function drawCarrot(){ctx.fillStyle="#ef812e";ctx.strokeStyle="#bd5722";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,-10);ctx.quadraticCurveTo(17,-18,10,25);ctx.quadraticCurveTo(-5,16,-17,-10);ctx.fill();ctx.stroke();ctx.strokeStyle="#678e43";ctx.lineWidth=7;[-8,0,8].forEach(dx=>{ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(dx-11,-30);ctx.stroke()})}
function drawBone(){ctx.fillStyle="#fff4d7";ctx.strokeStyle="#c79563";ctx.lineWidth=4;ctx.beginPath();ctx.arc(-16,-8,9,0,7);ctx.arc(-16,8,9,0,7);ctx.arc(16,-8,9,0,7);ctx.arc(16,8,9,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#fff4d7";ctx.fillRect(-16,-9,32,18)}
function drawStation(x,y){ctx.fillStyle="#d8dbea";ctx.fillRect(x,y,280,350);ctx.fillStyle="#34477a";ctx.fillRect(x,y,280,55);ctx.fillStyle="#fff";ctx.font="900 28px 'M PLUS Rounded 1c'";ctx.fillText("たると駅",x+75,y+38);ctx.fillStyle="#8fc3d9";for(let wx=25;wx<260;wx+=75)for(let wy=85;wy<250;wy+=70)ctx.fillRect(x+wx,y+wy,45,40);ctx.fillStyle="#202b4c";ctx.fillRect(x+95,y+270,90,80)}
function drawDad(x,y){ctx.fillStyle="#efbd99";ctx.beginPath();ctx.arc(x+25,y+18,18,0,7);ctx.fill();ctx.fillStyle="#40342f";ctx.beginPath();ctx.arc(x+25,y+11,19,Math.PI,0);ctx.fill();ctx.fillStyle="#477e80";rounded(x,y+38,50,67,16);ctx.fill();ctx.strokeStyle="#2f3547";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(x+13,y+101);ctx.lineTo(x+10,y+140);ctx.moveTo(x+37,y+101);ctx.lineTo(x+40,y+140);ctx.stroke();ctx.fillStyle="#fff4d7";ctx.font="900 14px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText("とーちゃん",x+25,y-10)}
function draw(){ctx.clearRect(0,0,W,H);drawBackground();drawWorld()}
function loop(t){const dt=t-last;last=t;if(running&&dt<100)update();draw();requestAnimationFrame(loop)}

$("#storyBtn").onclick=showStory;$("#startBtn").onclick=start;$("#againBtn").onclick=start;$("#retryBtn").onclick=start;$("#homeBtn").onclick=()=>location.href="index.html";
$("#jumpBtn").onpointerdown=e=>{e.preventDefault();jump()};$("#kickBtn").onpointerdown=e=>{e.preventDefault();kick()};
addEventListener("keydown",e=>{if([" ","ArrowUp","w","W"].includes(e.key)){jump();e.preventDefault()}if(["x","X","k","K"].includes(e.key))kick()});
reset();last=performance.now();requestAnimationFrame(loop);
