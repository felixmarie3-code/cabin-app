// === Splash Screen ===
(function() {
  var splash = document.getElementById('splash');
  if (!splash) return;
  var splashBg = document.getElementById('splash-bg');
  var splashPlane = document.getElementById('splash-plane');
  var splashLoader = document.getElementById('splash-loader');

  var BRAND_PAUSE = 3000;    // 3s brand + loader visible
  var TRAVEL_MS   = 1000;    // 1s plane traversal
  var FADE_IN     = 500;     // plane opacity fade-in
  var WING_MID    = 0.38;    // wing position from nose (% of plane length)

  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var isLandscape = vw > vh;

  /* ---------- setup plane orientation ---------- */
  if (isLandscape) {
    splashPlane.classList.add('landscape');
    // img is rotated 90° via CSS, sized to 100vh
    // Visual dims after rotation: width ≈ vh*aspectRatio, height = vh
    // We translate the container to move plane left→right
    splashPlane.style.transform = 'translate3d(' + (-(vw / 2 + vh * 0.6 + 60)) + 'px,0,0)';
  } else {
    // Portrait: park below viewport
    splashPlane.style.transform = 'translate3d(0,' + (vh + 60) + 'px,0)';
  }

  /* ---------- fade out loader before plane starts ---------- */
  setTimeout(function() {
    if (splashLoader) {
      splashLoader.style.transition = 'opacity 0.4s ease';
      splashLoader.style.opacity = '0';
    }
  }, BRAND_PAUSE - 500);

  /* ---------- start plane animation ---------- */
  setTimeout(function() {
    splashPlane.style.opacity = '1';
    splashPlane.style.transition = 'opacity ' + FADE_IN + 'ms ease-out';

    var startTime = performance.now();

    if (isLandscape) {
      /* ---- LANDSCAPE: left → right ---- */
      // Plane img is 100vh tall (pre-rotation), aspect ~1:1.1 → pre-rot width ≈ vh/1.1 ≈ vh*0.9
      // After 90° rotation: visual width ≈ vh, visual height ≈ vh*0.9
      var planeVisW = vh;           // visual width after rotation (approximate)
      var margin = 60;
      var startX = -(vw / 2 + planeVisW / 2 + margin);
      var endX   =  (vw / 2 + planeVisW / 2 + margin);

      function frameLandscape(now) {
        var t = Math.min((now - startTime) / TRAVEL_MS, 1); // linear = constant speed
        var curX = startX + (endX - startX) * t;
        splashPlane.style.transform = 'translate3d(' + curX + 'px,0,0)';

        // Wing line X on screen
        // Nose points right; wings at WING_MID from nose → toward the LEFT (rear)
        var planeCenterX = vw / 2 + curX;
        // Wing X = fuselage center - offset toward rear (left)
        var wingX = planeCenterX - planeVisW * (WING_MID - 0.5);
        // Shift clip slightly left so wings cover the edge
        wingX -= planeVisW * 0.03;
        var cPct = (wingX / vw) * 100;
        // 30° sweep: wing tips extend further LEFT (behind) than fuselage center
        var aOff = (0.577 * vh * 0.5) / vw * 100;
        var cX = Math.min(110, cPct);           // fuselage center (more right)
        var eX = Math.min(110, cX - aOff);      // wing tips (more left = behind)

        splashBg.style.clipPath = 'polygon(' +
          eX + '% 0%,100% 0%,100% 100%,' +
          eX + '% 100%,' +
          cX + '% 50%)';

        if (t < 1) requestAnimationFrame(frameLandscape);
        else splash.remove();
      }
      requestAnimationFrame(frameLandscape);

    } else {
      /* ---- PORTRAIT: bottom → top ---- */
      var img = document.getElementById('splash-plane-img');
      var imgRect = img.getBoundingClientRect();
      var planeH = imgRect.height || vh * 0.9;
      var planeW = imgRect.width  || vw;
      var startY = vh + 60;
      var endY   = -(planeH + 60);

      function framePortrait(now) {
        var t = Math.min((now - startTime) / TRAVEL_MS, 1); // linear = constant speed
        var curY = startY + (endY - startY) * t;
        splashPlane.style.transform = 'translate3d(0,' + curY + 'px,0)';

        // Wing line Y on screen
        // img centered in container → center at vh/2 + curY
        var wingY = vh / 2 + curY + planeH * (WING_MID - 0.5);
        // Shift clip slightly up so wings cover the edge
        wingY -= planeH * 0.03;
        var cPct = (wingY / vh) * 100;
        // 30° angle offset: V-shape horizontal
        var aOff = (0.577 * vw * 0.5) / vh * 100;
        var cY = Math.min(110, cPct);
        var eY = Math.min(110, cY + aOff);

        splashBg.style.clipPath = 'polygon(' +
          '0% 0%,100% 0%,' +
          '100% ' + eY + '%,' +
          '50% ' + cY + '%,' +
          '0% ' + eY + '%)';

        if (t < 1) requestAnimationFrame(framePortrait);
        else splash.remove();
      }
      requestAnimationFrame(framePortrait);
    }
  }, BRAND_PAUSE);

  // Fallback safety remove
  setTimeout(function() { if (splash.parentNode) splash.remove(); }, BRAND_PAUSE + TRAVEL_MS + 1500);
})();

// === Service Worker Registration ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.error('SW error:', err));
}

// === IndexedDB Mirror (safety net for localStorage) ===
var idb=null;
(function initIDB(){
  if(!window.indexedDB)return;
  var req=indexedDB.open('CabinReadyBackup',1);
  req.onupgradeneeded=function(e){e.target.result.createObjectStore('kv');};
  req.onsuccess=function(e){idb=e.target.result;};
  req.onerror=function(){idb=null;};
})();
function idbSet(k,v){
  if(!idb)return;
  try{var tx=idb.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);}catch(e){}
}
function idbGet(k){
  if(!idb)return Promise.resolve(undefined);
  return new Promise(function(resolve){
    try{
      var tx=idb.transaction('kv','readonly');
      var req=tx.objectStore('kv').get(k);
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){resolve(undefined);};
    }catch(e){resolve(undefined);}
  });
}
// Restore from IDB if localStorage was purged (runs after IDB is ready)
function restoreFromIDB(){
  if(!idb)return;
  var keys=['cabin_bookmarks','cabin_notes','cabin_otp_checks','cabin_checklist',
    'cabin_incidents','cabin_zones','cabin_services','cabin_doors','cabin_notifications',
    'cabin_defects','cabin_rest_tour','cabin_otp_remarks',
    'cabin_briefing_notes','cabin_report_notes','cabin_theme'];
  var restored=false;
  keys.forEach(function(k){
    if(localStorage.getItem(k)===null){
      idbGet(k).then(function(v){
        if(v!==undefined){
          localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
          restored=true;
          console.log('IDB restore:',k);
        }
      });
    }
  });
}
// Trigger restore check once IDB is open
setTimeout(restoreFromIDB,500);

// === Theme Toggle ===
const savedTheme = localStorage.getItem('cabin_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cabin_theme', next);idbSet('cabin_theme',next);
  updateThemeIcon(next);
});
function updateThemeIcon(theme) {
  const i = document.getElementById('themeIcon');
  i.innerHTML = theme === 'light'
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}

// === Tab Navigation ===
function switchToTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.module === name));
  document.querySelectorAll('.module').forEach(m => m.classList.toggle('active', m.id === 'mod-' + name));
}
document.getElementById('tabBar').addEventListener('click', e => {
  const t = e.target.closest('.tab'); if (!t) return; switchToTab(t.dataset.module);
});
function handleHash() { const h = window.location.hash.replace('#',''); if (h) switchToTab(h); }
window.addEventListener('hashchange', handleHash);
if (window.location.hash) handleHash();

// === Persistence ===
function lsGet(k,d){try{return JSON.parse(localStorage.getItem(k))||d;}catch{return d;}}
function lsSet(k,v){var s=JSON.stringify(v);localStorage.setItem(k,s);idbSet(k,s);}
let bookmarks=lsGet('cabin_bookmarks',{}), notes=lsGet('cabin_notes',{});
let milestoneChecks=lsGet('cabin_otp_checks',{}), checklistState=lsGet('cabin_checklist',{});
let incidents=lsGet('cabin_incidents',[]), cabinZones=lsGet('cabin_zones',{});
let serviceState=lsGet('cabin_services',{s1:{},s2:{}}), doorAssignments=lsGet('cabin_doors',{});
let appNotifications=lsGet('cabin_notifications',[]);

// === Cabin Config ===
const CABIN_CONFIG = {
  business:{label:'Business',cls:'business',rows:[1,2,3,4,5],layout:['K','.','.','|','.','F','E','|','.','.','A']},
  premium:{label:'Premium',cls:'premium',rows:[6,7,8],layout:['K','J','.','|','F','E','D','|','.','B','A']},
  economy_front:{label:'Economy',cls:'economy',rows:[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],layout:['K','J','H','|','F','E','D','|','C','B','A']},
  economy_rear:{label:'',cls:'economy',rows:[30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47],layout:['K','J','H','|','F','E','D','|','C','B','A']}
};
// Per-row layout overrides (special seat configurations)
const ROW_OVERRIDES={
  9: ['K','J','H','|','.','.','.','|','C','B','A'],          // row 9: no DEF
  29:['.','.','.',  '|','F','E','D','|','.','.','.' ],        // row 29: DEF only (lav replaces ABC & HJK)
  30:['.','.','.',  '|','F','E','D','|','.','.','.' ],        // row 30: DEF only
  47:['.','.','.',  '|','F','E','D','|','C','B','A']          // row 47: lav replaces HJK
};
// Lavatory indicators on specific rows
const ROW_LAVS={
  29:{positions:['K','J','H','C','B','A']},  // lav where ABC and HJK would be
  47:{positions:['K','J','H']}               // lav where HJK would be
};
const ALL_POSITIONS=['K','J','H','|','F','E','D','|','C','B','A'];
const EXIT_ROWS=[1,6,9,30,46];
const GALLEY_AFTER={premium:'GAL',economy_front:'GAL/LAV'};

// === Mock Passengers ===
function genPax(){
  const fn=['Marie','Thomas','Camille','Lucas','L\u00e9a','Hugo','Manon','Louis','Chlo\u00e9','Nathan','Emma','Rapha\u00ebl','Sarah','Jules','In\u00e8s','Arthur','Jade','Adam','Lola','Gabriel','Alice','Paul','Louise','No\u00ebl','Fatima','Jean-Pierre','Aisha','Ravi','Chen','Yuki','Sophie'];
  const ln=['MARTIN','BERNARD','DUBOIS','THOMAS','ROBERT','PETIT','DURAND','MOREAU','LAURENT','SIMON','MICHEL','GARCIA','ROUX','LEROY','FONTAINE','CHEVALIER','BOYER','BLANC','NAIR','WONG','SUZUKI','PAYET','HOARAU','RIVI\u00c8RE','GRONDIN','DIJOUX','CADET','MAILLOT'];
  const meals=['','','','','','VGML','VLML','HNML','DBML','CHML','AVML','KSML'];
  const remarks=['','','','','','','','UM','WCHR','DEAF','BLND','PETC','VIP','MAAS'];
  const nats=['FR','FR','FR','FR','RE','RE','MU','MG','IN','CN','JP','GB','DE','US'];
  const abc='ABCDEFGHJKLMNPQRSTUVWXYZ';
  const p={};const all=[];
  Object.values(CABIN_CONFIG).forEach(s=>s.rows.forEach(r=>{
    const layout=ROW_OVERRIDES[r]||s.layout;
    layout.forEach(c=>{if(c!=='.'&&c!=='|')all.push({seat:r+c,cls:s.cls});});
  }));
  const sh=all.sort(()=>Math.random()-0.5).slice(0,Math.floor(all.length*0.82));
  sh.forEach(({seat,cls})=>{let pnr='';for(let i=0;i<6;i++)pnr+=abc[Math.floor(Math.random()*abc.length)];
    p[seat]={name:ln[Math.floor(Math.random()*ln.length)]+' '+fn[Math.floor(Math.random()*fn.length)],pnr,class:cls,
      meal:meals[Math.floor(Math.random()*meals.length)],remark:remarks[Math.floor(Math.random()*remarks.length)],
      nationality:nats[Math.floor(Math.random()*nats.length)],checkedIn:Math.random()>0.08,boarded:Math.random()>0.15,
      bags:Math.floor(Math.random()*3),infant:Math.random()>0.95,ffn:Math.random()>0.7?'SS'+String(Math.floor(Math.random()*9e6+1e6)):''};
  });return p;
}
const passengers=genPax();

// ============================================================
// NOTIFICATIONS
// ============================================================
function addNotification(title,body,type){
  appNotifications.unshift({id:Date.now(),title,body,type:type||'info',time:fmt(new Date())});
  if(appNotifications.length>50)appNotifications=appNotifications.slice(0,50);
  lsSet('cabin_notifications',appNotifications);renderNotifCenter();updateNotifBadge();
  sendOSNotification(title,body);
  showInAppBanner(title,body,type);
}
// In-app iOS-style banner
let bannerTimeout=null;
function showInAppBanner(title,body,type){
  let banner=document.getElementById('inAppBanner');
  if(!banner){
    banner=document.createElement('div');banner.id='inAppBanner';banner.className='in-app-banner';
    banner.innerHTML='<div class="iab-icon"></div><div class="iab-content"><div class="iab-title"></div><div class="iab-body"></div></div><div class="iab-time">maintenant</div>';
    document.body.appendChild(banner);
    // Swipe up to dismiss
    let startY=0;
    banner.addEventListener('touchstart',e=>{startY=e.touches[0].clientY;},{passive:true});
    banner.addEventListener('touchmove',e=>{
      const dy=e.touches[0].clientY-startY;
      if(dy<0)banner.style.transform='translateY('+dy+'px)';
    },{passive:true});
    banner.addEventListener('touchend',e=>{
      const dy=parseInt(banner.style.transform.replace(/[^-\d]/g,'')||'0');
      if(dy<-30)dismissBanner();else banner.style.transform='';
    });
    banner.addEventListener('click',()=>{dismissBanner();document.getElementById('notifBtn').click();});
  }
  if(bannerTimeout)clearTimeout(bannerTimeout);
  const icon=banner.querySelector('.iab-icon');
  icon.textContent=type==='alert'?'!':'i';
  icon.className='iab-icon '+(type||'info');
  banner.querySelector('.iab-title').textContent=title;
  banner.querySelector('.iab-body').textContent=body;
  banner.classList.remove('dismiss');
  banner.classList.add('visible');
  bannerTimeout=setTimeout(dismissBanner,5000);
}
function dismissBanner(){
  const b=document.getElementById('inAppBanner');
  if(!b)return;b.classList.add('dismiss');
  setTimeout(()=>{b.classList.remove('visible','dismiss');b.style.transform='';},300);
  if(bannerTimeout){clearTimeout(bannerTimeout);bannerTimeout=null;}
}
function sendOSNotification(t,b){
  const o={body:b,icon:'logoapp.png',badge:'logoapp.png',tag:'cabin-'+Date.now(),renotify:true,vibrate:[200,100,200]};
  if('serviceWorker' in navigator&&navigator.serviceWorker.controller)
    navigator.serviceWorker.ready.then(r=>r.showNotification(t,o).catch(()=>{})).catch(()=>{});
  else if('Notification' in window&&Notification.permission==='granted') try{new Notification(t,o);}catch{}
}
function renderNotifCenter(){
  const list=document.getElementById('notifList'),empty=document.getElementById('notifEmpty');
  list.textContent='';
  if(!appNotifications.length){list.appendChild(empty);empty.style.display='';return;}
  empty.style.display='none';
  appNotifications.forEach((n,idx)=>{
    const item=document.createElement('div');item.className='notif-item';item.dataset.idx=idx;
    const ic=document.createElement('div');ic.className='notif-item-icon '+n.type;ic.textContent=n.type==='alert'?'!':'i';
    const ct=document.createElement('div');ct.className='notif-item-content';
    const t=document.createElement('div');t.className='notif-item-title';t.textContent=n.title;
    const b=document.createElement('div');b.className='notif-item-body';b.textContent=n.body;
    const tm=document.createElement('div');tm.className='notif-item-time';tm.textContent=n.time;
    ct.appendChild(t);ct.appendChild(b);ct.appendChild(tm);
    const dm=document.createElement('button');dm.className='notif-item-dismiss';dm.textContent='\u00d7';
    dm.addEventListener('click',e=>{e.stopPropagation();removeNotif(idx);});
    item.appendChild(ic);item.appendChild(ct);item.appendChild(dm);
    // Swipe to delete
    let sx=0,dx=0;
    item.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;dx=0;item.classList.add('swiping');},{passive:true});
    item.addEventListener('touchmove',e=>{dx=e.touches[0].clientX-sx;if(dx<0)item.style.transform='translateX('+dx+'px)';},{passive:true});
    item.addEventListener('touchend',()=>{item.classList.remove('swiping');if(dx<-80){item.classList.add('dismissed');setTimeout(()=>removeNotif(idx),200);}else{item.style.transform='';}});
    list.appendChild(item);
  });
  list.appendChild(empty);
}
function removeNotif(idx){appNotifications.splice(idx,1);lsSet('cabin_notifications',appNotifications);renderNotifCenter();updateNotifBadge();}
function updateNotifBadge(){const b=document.getElementById('notifBadge');const c=appNotifications.length;b.textContent=c>0?String(c):'';b.style.display=c>0?'':'none';if('setAppBadge' in navigator){if(c>0)navigator.setAppBadge(c).catch(()=>{});else navigator.clearAppBadge().catch(()=>{});}}
document.getElementById('notifToggle').addEventListener('click',()=>{
  closeAllPanels('notifCenter');
  document.getElementById('notifCenter').classList.toggle('visible');
});
document.getElementById('notifClearAll').addEventListener('click',()=>{appNotifications=[];lsSet('cabin_notifications',appNotifications);renderNotifCenter();updateNotifBadge();});

// Prepared notification types
const NOTIF_TYPES=[
  {title:'Embarquement débuté',body:'Le boarding du vol SS 901 a commencé. Porte 42A ouverte.',type:'info'},
  {title:'Boarding clos — 4 passagers annulés',body:'Fermeture des portes imminente. 4 PAX no-show retirés du manifeste. Bagages en cours de déchargement.',type:'alert'},
  {title:'ALERTE MÉDICALE — Siège 22K',body:'MARTIN Thomas demande une assistance en Économy. Vérifiez la trousse de premiers secours et le défibrillateur.',type:'alert'},
  {title:'Changement de porte',body:'Le vol SS 901 est transféré de la porte 42A vers la porte 38B. Informer les passagers.',type:'info'},
  {title:'Turbulences prévues',body:'Zone de turbulences modérées dans 15 minutes. Sécuriser la cabine et les galleys.',type:'alert'},
  {title:'Service 1er service terminé',body:'Le premier service repas est terminé en Economy. 3 repas spéciaux non distribués.',type:'info'},
  {title:'Retard au départ — +25 min',body:'Nouveau STD : 14:25. Cause : attente bagages correspondance. Informer les passagers.',type:'alert'}
];
let notifTypeIdx=0;

// Notif test button
document.getElementById('notifTestBtn').addEventListener('click',function(){
  const btn=this;btn.disabled=true;const tn=btn.childNodes[btn.childNodes.length-1];
  if('Notification' in window&&Notification.permission==='default')Notification.requestPermission();
  let c=5;tn.textContent=' Envoi dans '+c+'s...';
  const ti=setInterval(()=>{c--;if(c>0){tn.textContent=' Envoi dans '+c+'s...';}else{clearInterval(ti);
    const n=NOTIF_TYPES[notifTypeIdx%NOTIF_TYPES.length];notifTypeIdx++;
    addNotification(n.title,n.body,n.type);
    tn.textContent=' Notification envoyée !';setTimeout(()=>{btn.disabled=false;tn.textContent=' Tester une notification';},3000);}},1000);
});

// ============================================================
// SHARE (Web Share API = AirDrop on iOS)
// ============================================================
document.getElementById('shareToggle').addEventListener('click',()=>{
  closeAllPanels('sharePanel');
  document.getElementById('sharePanel').classList.toggle('visible');
});
document.getElementById('shareConfirm').addEventListener('click',()=>{
  const checks=document.querySelectorAll('#shareOptions input:checked');
  const parts=[];
  checks.forEach(c=>{
    if(c.value==='briefing')parts.push('VOL SS 901 ORY\u2192RUN B787-9 F-OLRA STD 14:00');
    if(c.value==='passengers'){let t='PASSAGERS:\n';Object.entries(passengers).forEach(([s,p])=>{t+=s+' '+p.name+(p.meal?' ['+p.meal+']':'')+(p.remark?' ('+p.remark+')':'')+'\n';});parts.push(t);}
    if(c.value==='meals'){let t='REPAS SP\u00c9CIAUX:\n';Object.entries(passengers).filter(([,p])=>p.meal).forEach(([s,p])=>{t+=s+' '+p.name+' - '+p.meal+'\n';});parts.push(t);}
    if(c.value==='checklist')parts.push('CHECKLISTS: '+Object.values(checklistState).filter(Boolean).length+' items valid\u00e9s');
    if(c.value==='incidents'){let t='INCIDENTS:\n';incidents.forEach(i=>{t+=i.time+' ['+i.type+'] '+i.desc+'\n';});parts.push(t||'Aucun incident');}
    if(c.value==='report')parts.push('RAPPORT: '+Object.values(cabinZones).filter(v=>v==='OK').length+'/11 zones OK');
  });
  const text=parts.join('\n\n');
  if(navigator.share){navigator.share({title:'CabinReady \u2014 SS 901',text}).catch(()=>{});}
  else{navigator.clipboard.writeText(text).then(()=>alert('Donn\u00e9es copi\u00e9es dans le presse-papier')).catch(()=>{});}
  document.getElementById('sharePanel').classList.remove('visible');
});

// ============================================================
// BRIEFING
// ============================================================
const CREW=[
  {name:'LEFEBVRE Sophie',trigramme:'LFS',role:'Responsable cabine',rank:'CCP',rankCls:'ccp',door:'1G'},
  {name:'DUPONT Marc',trigramme:'DPM',role:'Business',rank:'CC',rankCls:'cc',door:'1D'},
  {name:'PAYET Nathalie',trigramme:'PYN',role:'Premium',rank:'HST',rankCls:'hst',door:'2G'},
  {name:'HOARAU Kevin',trigramme:'HRK',role:'\u00c9co avant',rank:'HST',rankCls:'hst',door:'2D'},
  {name:'MARTIN Julie',trigramme:'MTJ',role:'\u00c9co centre',rank:'HST',rankCls:'hst',door:'3G'},
  {name:'RIVI\u00c8RE Paul',trigramme:'RVP',role:'\u00c9co arri\u00e8re',rank:'HST',rankCls:'hst',door:'3D'},
  {name:'GRONDIN L\u00e9a',trigramme:'GDL',role:'\u00c9co arri\u00e8re',rank:'HST',rankCls:'hst',door:'4G'},
  {name:'DIJOUX Sarah',trigramme:'DJS',role:'Galley',rank:'HST',rankCls:'hst',door:'4D'}
];
const DOORS=['1G','1D','2G','2D','3G','3D','4G','4D'];

function buildBriefing(){
  let biz=0,prem=0,eco=0;
  Object.values(passengers).forEach(p=>{if(p.class==='business')biz++;else if(p.class==='premium')prem++;else eco++;});
  const total=biz+prem+eco;
  const el=id=>document.getElementById(id);
  el('briefPaxTotal').textContent=total;el('briefPaxBiz').textContent=biz;el('briefPaxPrem').textContent=prem;el('briefPaxEco').textContent=eco;

  // Load bar
  const allSeats=[];Object.values(CABIN_CONFIG).forEach(s=>s.rows.forEach(r=>{const layout=ROW_OVERRIDES[r]||s.layout;layout.forEach(p=>{if(p!=='.'&&p!=='|')allSeats.push(1);});}));
  const pct=Math.round(total/allSeats.length*100);
  const bar=el('briefLoadBar');bar.textContent='';
  const fill=document.createElement('div');fill.className='brief-bar-fill';fill.style.width=pct+'%';
  fill.style.background=pct>90?'#4ade80':pct>70?'var(--corsair-bleu-economie)':'#fbbf24';bar.appendChild(fill);

  // Pax tags (clickable particularit\u00e9s)
  const tags=el('briefPaxTags');tags.textContent='';
  const counts={um:0,wchr:0,vip:0,meal:0,inf:0,noboard:0};
  Object.values(passengers).forEach(p=>{
    if(p.remark==='UM')counts.um++;if(p.remark==='WCHR')counts.wchr++;if(p.remark==='VIP')counts.vip++;
    if(p.meal)counts.meal++;if(p.infant)counts.inf++;if(!p.boarded)counts.noboard++;
  });
  [{k:'um',l:'UM',f:'um'},{k:'wchr',l:'WCHR',f:'wchr'},{k:'vip',l:'VIP',f:'occupied'},{k:'meal',l:'Repas sp\u00e9.',f:'special-meal'},{k:'inf',l:'Nourrissons',f:'occupied'},{k:'noboard',l:'Non embarqu\u00e9s',f:'not-boarded'}].forEach(t=>{
    if(!counts[t.k])return;
    const btn=document.createElement('button');btn.className='pax-tag '+t.k;
    const cnt=document.createElement('span');cnt.className='tag-count';cnt.textContent=counts[t.k];
    btn.appendChild(cnt);btn.appendChild(document.createTextNode(' '+t.l));
    btn.addEventListener('click',()=>{switchToTab('passengers');
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      const fb=document.querySelector('.filter-btn[data-filter="'+t.f+'"]');if(fb)fb.classList.add('active');
      activeFilter=t.f;applyFilters();});
    tags.appendChild(btn);
  });

  // Flight profile — horizontal line with dots (IATA only, hours top, labels bottom)
  const fp=el('flightProfile');fp.textContent='';
  const line=document.createElement('div');line.className='fp-line';fp.appendChild(line);
  [{label:'ORY',time:'10:10',cls:'dep'},{label:'TOC',time:'12:44',cls:'cruise'},{label:'TOD',time:'18:29',cls:'tod'},{label:'PTP',time:'18:53',cls:'arr'}].forEach(ph=>{
    const pt=document.createElement('div');pt.className='fp-point';
    const tm=document.createElement('div');tm.className='fp-time';tm.textContent=ph.time;
    const dot=document.createElement('div');dot.className='fp-dot'+(ph.cls?' '+ph.cls:'');
    const lb=document.createElement('div');lb.className='fp-label';lb.textContent=ph.label;
    pt.appendChild(tm);pt.appendChild(dot);pt.appendChild(lb);fp.appendChild(pt);
  });
  // Align departure dot under "Vol" (1st KPI) and arrival dot under "STD" (6th KPI)
  requestAnimationFrame(()=>{
    const kpiRow=el('briefKpiRow');
    if(kpiRow){
      const kpis=kpiRow.querySelectorAll('.brief-kpi');
      const fpRect=fp.getBoundingClientRect();
      if(kpis.length>=6){
        const volRect=kpis[0].getBoundingClientRect();
        const stdRect=kpis[5].getBoundingClientRect();
        const leftPad=volRect.left+volRect.width/2-fpRect.left;
        const rightPad=fpRect.right-(stdRect.left+stdRect.width/2);
        fp.style.paddingLeft=Math.max(0,leftPad)+'px';
        fp.style.paddingRight=Math.max(0,rightPad)+'px';
      }
    }
    const dots=fp.querySelectorAll('.fp-dot');
    if(dots.length>=2&&line){
      const fpRect2=fp.getBoundingClientRect();
      const firstRect=dots[0].getBoundingClientRect();
      const lastRect=dots[dots.length-1].getBoundingClientRect();
      line.style.top=(firstRect.top-fpRect2.top+firstRect.height/2-1)+'px';
      line.style.left=(firstRect.left-fpRect2.left+firstRect.width/2)+'px';
      line.style.right=(fpRect2.right-lastRect.right+lastRect.width/2)+'px';
    }
  });

  // Crew — sorted by door order, with door badge
  const crewEl=el('briefCrew');crewEl.textContent='';
  buildCrewList(crewEl);

  // Cabin defects
  const defList=el('cabinDefects');defList.textContent='';
  const defects=lsGet('cabin_defects',[]);
  if(!defects.length){const nd=document.createElement('div');nd.className='no-defects';nd.textContent='Aucun d\u00e9faut signal\u00e9';defList.appendChild(nd);}
  defects.forEach(d=>{
    const row=document.createElement('div');row.className='defect-row';
    const z=document.createElement('span');z.className='defect-zone';z.textContent=d.zone;
    const ds=document.createElement('span');ds.className='defect-desc';ds.textContent=d.desc;
    const im=document.createElement('span');im.className='defect-impact '+d.impact;im.textContent=d.impact.toUpperCase();
    row.appendChild(z);row.appendChild(ds);row.appendChild(im);defList.appendChild(row);
  });

  // Briefing notes
  const notesEl=el('briefingNotes');notesEl.value=localStorage.getItem('cabin_briefing_notes')||'';
  notesEl.addEventListener('input',()=>{localStorage.setItem('cabin_briefing_notes',notesEl.value);idbSet('cabin_briefing_notes',notesEl.value);});
}

// === Crew list builder + inline door edit with drag & drop ===
// Grip SVG: three horizontal lines (iOS reorder handle)
var GRIP_SVG='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="16" x2="20" y2="16"/></svg>';

function getCrewSorted(){
  var doorOrder={'G':0,'D':1};
  return [...CREW].sort(function(a,b){
    var da=doorAssignments[a.name]||a.door;
    var db=doorAssignments[b.name]||b.door;
    var na=parseInt(da),nb=parseInt(db);
    if(na!==nb)return na-nb;
    return (doorOrder[da.slice(-1)]||0)-(doorOrder[db.slice(-1)]||0);
  });
}

function buildCrewList(container){
  container.textContent='';
  var sorted=getCrewSorted();
  sorted.forEach(function(c,i){
    // Slot: [fixed badge] [crew card with grip inside]
    var slot=document.createElement('div');slot.className='crew-slot';
    slot.dataset.doorIndex=String(i);
    // Door badge — FIXED, never moves
    var badge=document.createElement('div');badge.className='crew-door-badge';
    badge.textContent=DOORS[i];
    // Crew card — the movable part
    var card=document.createElement('div');card.className='crew-member';
    card.dataset.crewName=c.name;
    // Grip handle (inside card, hidden until edit mode)
    var grip=document.createElement('div');grip.className='crew-grip';grip.innerHTML=GRIP_SVG;
    var av=document.createElement('div');av.className='crew-avatar '+c.rankCls;
    av.textContent=c.trigramme;
    var info=document.createElement('div');info.className='crew-info';
    var nm=document.createElement('div');nm.className='crew-name';nm.textContent=c.name;
    var rl=document.createElement('div');rl.className='crew-role';rl.textContent=c.rank;
    info.appendChild(nm);info.appendChild(rl);
    card.appendChild(grip);card.appendChild(av);card.appendChild(info);
    slot.appendChild(badge);slot.appendChild(card);
    card.addEventListener('click',function(){if(!crewEditMode)showCrewDetail(c);});
    container.appendChild(slot);
  });
}

// --- Door edit mode ---
var crewEditMode=false;
var dragState=null;

document.getElementById('editDoorsBtn').addEventListener('click',function(){
  if(!crewEditMode) enterDoorEditMode();
  else exitDoorEditMode();
});

function enterDoorEditMode(){
  crewEditMode=true;
  var btn=document.getElementById('editDoorsBtn');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Valider';
  btn.classList.add('validate');
  document.querySelectorAll('#briefCrew .crew-slot').forEach(function(s){s.classList.add('editing');});
  attachDragListeners();
}

function exitDoorEditMode(){
  crewEditMode=false;
  var btn=document.getElementById('editDoorsBtn');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg> Modifier';
  btn.classList.remove('validate');
  // Read crew name in each slot → assign to slot's door
  var slots=document.querySelectorAll('#briefCrew .crew-slot');
  var newAssign={};
  slots.forEach(function(slot,i){
    var card=slot.querySelector('.crew-member');
    var name=card?card.dataset.crewName:'';
    if(name&&DOORS[i]) newAssign[name]=DOORS[i];
  });
  Object.keys(doorAssignments).forEach(function(k){delete doorAssignments[k];});
  Object.assign(doorAssignments,newAssign);
  lsSet('cabin_doors',doorAssignments);
  buildCrewList(document.getElementById('briefCrew'));
  buildCabinPlan();
  detachDragListeners();
}

// --- Touch drag & drop: slots stay fixed, cards swap ---
var touchHandlers={};

function attachDragListeners(){
  var container=document.getElementById('briefCrew');

  touchHandlers.start=function(e){
    var grip=e.target.closest('.crew-grip');
    if(!grip)return;
    var slot=grip.closest('.crew-slot.editing');
    if(!slot)return;
    e.preventDefault();
    startDrag(slot,e.touches[0]);
  };
  touchHandlers.move=function(e){
    if(dragState){e.preventDefault();moveDrag(e.touches[0]);}
  };
  touchHandlers.end=function(){
    if(dragState)endDrag();
  };
  container.addEventListener('touchstart',touchHandlers.start,{passive:false});
  container.addEventListener('touchmove',touchHandlers.move,{passive:false});
  container.addEventListener('touchend',touchHandlers.end,{passive:true});
  container.addEventListener('touchcancel',touchHandlers.end,{passive:true});

  // Mouse support for desktop
  touchHandlers.mousedown=function(e){
    var grip=e.target.closest('.crew-grip');
    if(!grip)return;
    var slot=grip.closest('.crew-slot.editing');
    if(!slot)return;
    e.preventDefault();
    startDrag(slot,{clientY:e.clientY,clientX:e.clientX});
    function mm(ev){ev.preventDefault();moveDrag({clientY:ev.clientY});}
    function mu(){endDrag();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);}
    document.addEventListener('mousemove',mm);
    document.addEventListener('mouseup',mu);
  };
  container.addEventListener('mousedown',touchHandlers.mousedown);
}

function detachDragListeners(){
  var container=document.getElementById('briefCrew');
  if(!touchHandlers.start)return;
  container.removeEventListener('touchstart',touchHandlers.start);
  container.removeEventListener('touchmove',touchHandlers.move);
  container.removeEventListener('touchend',touchHandlers.end);
  container.removeEventListener('touchcancel',touchHandlers.end);
  container.removeEventListener('mousedown',touchHandlers.mousedown);
}

function startDrag(slot,touch){
  try{navigator.vibrate(10);}catch(e){}
  var card=slot.querySelector('.crew-member');
  var rect=card.getBoundingClientRect();
  // Ghost = visual copy of the card
  var ghost=card.cloneNode(true);
  ghost.querySelector('.crew-grip').style.display='none'; // hide grip in ghost
  ghost.className='crew-drag-ghost';
  ghost.style.width=rect.width+'px';
  ghost.style.height=rect.height+'px';
  ghost.style.left=rect.left+'px';
  ghost.style.top=rect.top+'px';
  ghost.style.background=getComputedStyle(document.documentElement).getPropertyValue('--bg-surface')||'#1a1a2e';
  ghost.style.padding='8px 10px';
  document.body.appendChild(ghost);
  slot.classList.add('drag-source');
  dragState={ghost:ghost,sourceSlot:slot,sourceCard:card,offsetY:touch.clientY-rect.top,overSlot:null};
}

function moveDrag(touch){
  if(!dragState)return;
  dragState.ghost.style.top=(touch.clientY-dragState.offsetY)+'px';
  // Find which slot the finger is over
  var container=document.getElementById('briefCrew');
  var slots=Array.from(container.querySelectorAll('.crew-slot:not(.drag-source)'));
  // Clear previous highlight
  slots.forEach(function(s){s.classList.remove('drag-over');});
  dragState.overSlot=null;
  var fingerY=touch.clientY;
  for(var i=0;i<slots.length;i++){
    var r=slots[i].getBoundingClientRect();
    if(fingerY>=r.top&&fingerY<=r.bottom){
      slots[i].classList.add('drag-over');
      dragState.overSlot=slots[i];
      break;
    }
  }
}

function endDrag(){
  if(!dragState)return;
  var container=document.getElementById('briefCrew');
  dragState.ghost.remove();
  // Clear highlights
  container.querySelectorAll('.crew-slot').forEach(function(s){
    s.classList.remove('drag-over');s.classList.remove('drag-source');
  });
  // Swap cards between source and target slots
  var srcSlot=dragState.sourceSlot;
  var tgtSlot=dragState.overSlot;
  if(tgtSlot&&tgtSlot!==srcSlot){
    var srcCard=srcSlot.querySelector('.crew-member');
    var tgtCard=tgtSlot.querySelector('.crew-member');
    // Swap: move tgtCard to srcSlot, srcCard to tgtSlot
    srcSlot.appendChild(tgtCard);
    tgtSlot.appendChild(srcCard);
  }
  dragState=null;
}

// Crew detail — opens in the pax detail panel (passengers tab)
function showCrewDetail(c){
  switchToTab('passengers');
  selectedPaxSeat=null;
  document.getElementById('paxListView').style.display='none';
  document.getElementById('paxDetailView').style.display='';
  const saved=doorAssignments[c.name];const door=(saved&&DOORS.includes(saved))?saved:c.door;
  const badge=document.getElementById('paxDetBadge');badge.textContent=c.trigramme;badge.className='pax-seat-badge crew-badge '+c.rankCls;
  document.getElementById('paxDetName').textContent=c.name;
  document.getElementById('paxDetClass').textContent=c.rank;
  document.getElementById('paxDetBookmark').classList.remove('bookmarked');
  document.getElementById('paxDetBookmark').style.display='none';
  const grid=document.getElementById('paxDetGrid');grid.textContent='';
  [{l:'Trigramme',v:c.trigramme},{l:'Rang',v:c.rank},{l:'Rôle',v:c.role},{l:'Porte',v:door}].forEach(f=>{
    const it=document.createElement('div');it.className='pax-info-item';
    const lb=document.createElement('div');lb.className='pax-info-label';lb.textContent=f.l;
    const vl=document.createElement('div');vl.className='pax-info-value';vl.textContent=f.v;
    it.appendChild(lb);it.appendChild(vl);grid.appendChild(it);
  });
  document.getElementById('paxDetNotes').value='';
  // Hide entire notes section for crew
  const notesSec=document.querySelector('#paxDetailView .pax-notes-section');
  if(notesSec)notesSec.style.display='none';
  document.querySelectorAll('.seat.selected').forEach(s=>s.classList.remove('selected'));
}

// Rest tour modal
document.getElementById('restTourBtn').addEventListener('click',()=>{
  const grid=document.getElementById('restGrid');grid.textContent='';
  const restData=lsGet('cabin_rest_tour',[]);
  // Build 3 rest slots
  const slots=restData.length?restData:[{crew:'',start:'',end:''},{crew:'',start:'',end:''},{crew:'',start:'',end:''}];
  slots.forEach((sl,idx)=>{
    const row=document.createElement('div');row.className='rest-slot';
    const order=document.createElement('div');order.className='rest-slot-order';order.textContent=idx+1;
    const sel=document.createElement('select');sel.className='door-assign-select';sel.dataset.restIdx=idx;
    const emptyOpt=document.createElement('option');emptyOpt.value='';emptyOpt.textContent='— Choisir PN —';sel.appendChild(emptyOpt);
    CREW.forEach(c=>{const o=document.createElement('option');o.value=c.name;o.textContent=c.trigramme+' — '+c.name.split(' ')[0];sel.appendChild(o);});
    if(sl.crew)sel.value=sl.crew;
    const startIn=document.createElement('input');startIn.type='time';startIn.className='door-assign-select';startIn.style.width='90px';startIn.value=sl.start||'';startIn.dataset.field='start';startIn.dataset.restIdx=idx;
    const endIn=document.createElement('input');endIn.type='time';endIn.className='door-assign-select';endIn.style.width='90px';endIn.value=sl.end||'';endIn.dataset.field='end';endIn.dataset.restIdx=idx;
    const sep=document.createElement('span');sep.textContent='→';sep.style.cssText='color:var(--text-muted);font-size:12px';
    row.appendChild(order);row.appendChild(sel);row.appendChild(startIn);row.appendChild(sep);row.appendChild(endIn);
    grid.appendChild(row);
  });
  document.getElementById('restOverlay').classList.add('visible');
});
document.getElementById('restClose').addEventListener('click',()=>document.getElementById('restOverlay').classList.remove('visible'));
document.getElementById('restOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)document.getElementById('restOverlay').classList.remove('visible');});
document.getElementById('restSave').addEventListener('click',()=>{
  const slots=[];
  document.querySelectorAll('#restGrid .rest-slot').forEach((row,idx)=>{
    const sel=row.querySelector('select');
    const start=row.querySelector('input[data-field="start"]');
    const end=row.querySelector('input[data-field="end"]');
    slots.push({crew:sel.value,start:start.value,end:end.value});
  });
  lsSet('cabin_rest_tour',slots);document.getElementById('restOverlay').classList.remove('visible');
});

// Cabin defect modal
document.getElementById('addDefectBtn').addEventListener('click',()=>document.getElementById('defectOverlay').classList.add('visible'));
document.getElementById('defectClose').addEventListener('click',()=>document.getElementById('defectOverlay').classList.remove('visible'));
document.getElementById('defectOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)document.getElementById('defectOverlay').classList.remove('visible');});
document.getElementById('defectImpact').addEventListener('click',e=>{const b=e.target.closest('.sev-btn');if(!b)return;document.querySelectorAll('#defectImpact .sev-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');});
document.getElementById('defectSave').addEventListener('click',()=>{
  const desc=document.getElementById('defectDesc').value.trim();if(!desc)return;
  const defects=lsGet('cabin_defects',[]);const sev=document.querySelector('#defectImpact .sev-btn.active');
  defects.push({zone:document.getElementById('defectZone').value,desc,impact:sev?sev.dataset.sev:'minor'});
  lsSet('cabin_defects',defects);document.getElementById('defectDesc').value='';
  document.getElementById('defectOverlay').classList.remove('visible');buildBriefing();
});

// ============================================================
// PAX LIST (bottom panel under cabin)
// ============================================================
let selectedPaxSeat=null;

function buildPaxList(){
  const scroll=document.getElementById('paxListScroll');scroll.textContent='';
  const hasFilter=activeFilter!=='all'||searchQuery.length>0;
  let list=Object.entries(passengers);
  // Apply current filter
  if(activeFilter==='occupied')list=list.filter(([,p])=>true);
  else if(activeFilter==='empty'){document.getElementById('paxListCount').textContent='0';return;}
  else if(activeFilter==='special-meal')list=list.filter(([,p])=>p.meal);
  else if(activeFilter==='um')list=list.filter(([,p])=>p.remark==='UM');
  else if(activeFilter==='wchr')list=list.filter(([,p])=>p.remark==='WCHR');
  else if(activeFilter==='not-boarded')list=list.filter(([,p])=>!p.boarded);
  else if(activeFilter==='bookmarked')list=list.filter(([s])=>bookmarks[s]);
  if(searchQuery)list=list.filter(([s,p])=>(p.name+' '+p.pnr+' '+s+' '+p.remark+' '+p.meal).toLowerCase().includes(searchQuery));
  list.sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}));
  document.getElementById('paxListCount').textContent=list.length;
  document.getElementById('paxListTitle').textContent=hasFilter?'R\u00e9sultat filtre':'Liste passagers';
  list.forEach(([seat,p])=>{
    const row=document.createElement('div');row.className='pax-list-row';if(seat===selectedPaxSeat)row.classList.add('selected');
    const s=document.createElement('span');s.className='pax-list-seat';s.textContent=seat;
    const n=document.createElement('span');n.className='pax-list-name';n.textContent=p.name;
    const tags=document.createElement('span');tags.className='pax-list-tags';
    if(p.meal){const t=document.createElement('span');t.className='pax-list-tag meal';t.textContent=p.meal;tags.appendChild(t);}
    if(p.remark){const t=document.createElement('span');t.className='pax-list-tag remark';t.textContent=p.remark;tags.appendChild(t);}
    row.appendChild(s);row.appendChild(n);row.appendChild(tags);
    row.addEventListener('click',()=>showPaxDetail(seat));
    scroll.appendChild(row);
  });
}

function showPaxDetail(seatId){
  selectedPaxSeat=seatId;const pax=passengers[seatId];if(!pax)return;
  const sec=Object.values(CABIN_CONFIG).find(s=>s.rows.some(r=>seatId.startsWith(String(r))));
  const cls=sec?sec.cls:'economy';
  document.getElementById('paxListView').style.display='none';
  document.getElementById('paxDetailView').style.display='';
  const badge=document.getElementById('paxDetBadge');badge.textContent=seatId;badge.className='pax-seat-badge '+cls;
  document.getElementById('paxDetName').textContent=pax.name;
  document.getElementById('paxDetClass').textContent=cls+(pax.ffn?' | FFN '+pax.ffn:'');
  document.getElementById('paxDetBookmark').classList.toggle('bookmarked',!!bookmarks[seatId]);
  const grid=document.getElementById('paxDetGrid');grid.textContent='';
  [{l:'PNR',v:pax.pnr},{l:'Nationalit\u00e9',v:pax.nationality},{l:'Embarquement',v:pax.boarded?'\u00c0 bord':'En attente',c:pax.boarded?'ok':'warn'},{l:'Check-in',v:pax.checkedIn?'Oui':'Non',c:pax.checkedIn?'ok':'warn'},{l:'Repas',v:pax.meal||'Standard'},{l:'Remarque',v:pax.remark||'Aucune',c:pax.remark?'warn':''},{l:'Bagages',v:pax.bags+' pcs'},{l:'Nourrisson',v:pax.infant?'Oui':'Non',c:pax.infant?'warn':''}].forEach(f=>{
    const it=document.createElement('div');it.className='pax-info-item';const lb=document.createElement('div');lb.className='pax-info-label';lb.textContent=f.l;const vl=document.createElement('div');vl.className='pax-info-value'+(f.c?' '+f.c:'');vl.textContent=f.v;it.appendChild(lb);it.appendChild(vl);grid.appendChild(it);});
  document.getElementById('paxDetNotes').value=notes[seatId]||'';
  // Re-show notes section (may be hidden by showCrewDetail)
  const notesSec=document.querySelector('#paxDetailView .pax-notes-section');
  if(notesSec)notesSec.style.display='';
  document.getElementById('paxDetBookmark').style.display='';
  // Highlight seat in cabin
  document.querySelectorAll('.seat.selected').forEach(s=>s.classList.remove('selected'));
  const se=document.querySelector('[data-seat="'+seatId+'"]');if(se){se.classList.add('selected');se.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
}
document.getElementById('paxDetailBack').addEventListener('click',()=>{
  document.getElementById('paxDetailView').style.display='none';document.getElementById('paxListView').style.display='';
  document.getElementById('paxDetBookmark').style.display='';
  document.getElementById('paxDetNotes').style.display='';
  document.getElementById('paxDetSaveNote').style.display='';
  document.querySelectorAll('.seat.selected').forEach(s=>s.classList.remove('selected'));selectedPaxSeat=null;
});
document.getElementById('paxDetBookmark').addEventListener('click',()=>{
  if(!selectedPaxSeat)return;if(bookmarks[selectedPaxSeat])delete bookmarks[selectedPaxSeat];else bookmarks[selectedPaxSeat]=true;
  lsSet('cabin_bookmarks',bookmarks);document.getElementById('paxDetBookmark').classList.toggle('bookmarked',!!bookmarks[selectedPaxSeat]);
  const se=document.querySelector('[data-seat="'+selectedPaxSeat+'"]');if(se)se.classList.toggle('bookmarked',!!bookmarks[selectedPaxSeat]);
});
document.getElementById('paxDetSaveNote').addEventListener('click',()=>{
  if(!selectedPaxSeat)return;const v=document.getElementById('paxDetNotes').value.trim();
  if(v)notes[selectedPaxSeat]=v;else delete notes[selectedPaxSeat];lsSet('cabin_notes',notes);
  const btn=document.getElementById('paxDetSaveNote');btn.textContent='Enregistr\u00e9 !';setTimeout(()=>{btn.textContent='Enregistrer la note';},1500);
});

// ============================================================
// CABIN PLAN
// ============================================================
let activeFilter='all',searchQuery='';
function buildCabinPlan(){
  const c=document.getElementById('cabinPlan');c.textContent='';
  const lc=document.createElement('div');lc.className='row-labels';
  ALL_POSITIONS.forEach(p=>{const l=document.createElement('div');if(p==='|'){l.className='row-label aisle-gap';}else{l.className='row-label';l.textContent=p;}lc.appendChild(l);});
  const ns=document.createElement('div');ns.className='row-label';ns.style.height='16px';lc.appendChild(ns);c.appendChild(lc);
  ['business','premium','economy_front','economy_rear'].forEach((sk,si)=>{
    const cfg=CABIN_CONFIG[sk];
    if(si>0){
      const prevKey=['business','premium','economy_front','economy_rear'][si-1];
      const galleyLabel=GALLEY_AFTER[prevKey];
      // Galley between sections: prem→eco=door2, eco_f→eco_r=door3
      const doorNum=si===2?2:si===3?3:null;
      if(galleyLabel||doorNum){
        const g=buildGalleyCol(galleyLabel||'',doorNum||(si+1));
        c.appendChild(g);
      }else{const d=document.createElement('div');d.className='section-divider';c.appendChild(d);}
    }
    const sec=document.createElement('div');sec.className='cabin-section';
    const sl=document.createElement('div');sl.className='section-label '+cfg.cls;sl.textContent=cfg.label;sec.appendChild(sl);
    const cols=document.createElement('div');cols.className='cabin-columns';
    cfg.rows.forEach(rn=>{const col=document.createElement('div');col.className='cabin-col';if(EXIT_ROWS.includes(rn))col.classList.add('exit-row');
      const rowLayout=ROW_OVERRIDES[rn]||cfg.layout;
      const lavPositions=ROW_LAVS[rn]?ROW_LAVS[rn].positions:[];
      // Pre-compute lav groups for merged rendering
      const lavSet=new Set();
      lavPositions.forEach(p=>{const idx=ALL_POSITIONS.indexOf(p);if(idx>=0)lavSet.add(idx);});
      // Build lav groups (consecutive lav indices between aisles)
      const lavGroups=[];let curLavGrp=[];
      for(let pi=0;pi<rowLayout.length;pi++){
        if(lavSet.has(pi)){curLavGrp.push(pi);}
        else{if(curLavGrp.length){lavGroups.push([...curLavGrp]);curLavGrp=[];}}}
      if(curLavGrp.length)lavGroups.push(curLavGrp);
      const lavGroupOf={};// pi → {start, count, isFirst, isLast}
      lavGroups.forEach(g=>{g.forEach((pi,i)=>{lavGroupOf[pi]={start:g[0],count:g.length,isFirst:i===0,isLast:i===g.length-1,isMid:i>0&&i<g.length-1};});});

      rowLayout.forEach((pos,pi)=>{if(pos==='|'){const a=document.createElement('div');a.className='aisle';col.appendChild(a);}
        else if(pos==='.'){
          if(lavGroupOf[pi]){
            const info=lavGroupOf[pi];
            const lv=document.createElement('div');lv.className='seat seat-lav';lv.title='Toilettes';
            // Visual merging via CSS classes
            if(info.isFirst)lv.classList.add('lav-first');
            if(info.isLast)lv.classList.add('lav-last');
            if(info.isMid)lv.classList.add('lav-mid');
            // Icon only on middle or single cell
            if(info.count===1||(info.count<=3&&info.isFirst)||(info.count>3&&Math.floor(info.count/2)===lavGroups.find(g=>g[0]===info.start).indexOf(pi))){
              lv.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><circle cx="8" cy="6" r="2"/><path d="M5 10h6v1.5H8.5v2H11V15H8.5v3h-3v-3H5v-1.5h.5v-2H5V10z"/><circle cx="16" cy="6" r="2"/><path d="M19 10v5h-1.5v3h-3v-3H13v-5h6z"/></svg>';
            }
            col.appendChild(lv);
          }else{const n=document.createElement('div');n.className='seat no-seat';col.appendChild(n);}
        }
        else{const sid=rn+pos,se=document.createElement('div');se.className='seat';se.dataset.seat=sid;se.textContent=pos;
          const pax=passengers[sid];if(pax){se.classList.add('occupied',cfg.cls);if(pax.meal)se.classList.add('special-meal');if(pax.remark==='WCHR')se.classList.add('wheelchair');if(pax.remark==='UM')se.classList.add('um');}else se.classList.add('empty');
          if(bookmarks[sid])se.classList.add('bookmarked');se.addEventListener('click',ev=>{ev.stopPropagation();showPaxDetail(sid);});col.appendChild(se);}});
      const rne=document.createElement('div');rne.className='row-num';rne.textContent=rn;rne.style.cssText='height:16px;display:flex;align-items:center;justify-content:center';
      col.appendChild(rne);cols.appendChild(col);});
    sec.appendChild(cols);c.appendChild(sec);});
  // Add door 1 (before business) and door 4 (after economy rear)
  const firstSection=c.querySelector('.cabin-section');
  if(firstSection)c.insertBefore(buildGalleyCol('',1),firstSection);
  c.appendChild(buildGalleyCol('',4));

  applyFilters();updateStats();
}

function buildCrewAvatar(crew){
  const av=document.createElement('div');av.className='crew-avatar cabin-crew-marker '+crew.rankCls;
  av.textContent=crew.trigramme;av.title=crew.name+' — '+crew.rank;
  av.addEventListener('click',e=>{e.stopPropagation();showCrewDetail(crew);});
  return av;
}

// Galley facility SVG icons
const GALLEY_SVG={
  crew:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7" r="3.5"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/><path d="M6.5 7.5h11" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 7.5c0-3 2-5 4-5s4 2 4 5" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  galley:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="3"/><path d="M18 22H6a2 2 0 0 1-2-2V12c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2zM6 14h12M6 18h12" stroke="currentColor" stroke-width="0.5" fill="none"/><rect x="5" y="11" width="14" height="10" rx="1.5" fill="currentColor" opacity="0.15"/></svg>',
  lav:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm6 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 10h4.5v12h-2v-5h-.5v5H5V10zm7.5 0H17v12h-2v-5h-.5v5h-2V10z"/></svg>'
};

// Galley layout per door — each zone is a rectangle with optional icon inside
// Zones arranged in a 2-column grid (left=D side/top, right=G side/bottom)
// {type:'icon',icon:'crew'|'lav'|'galley'} or {type:'cart'} (grey container)
const GALLEY_ZONES={
  1:{
    width:'wide',
    left:[ // K side (top of plan)
      {type:'icon',icon:'lav',h:1},
      {type:'icon',icon:'crew',h:1}
    ],
    right:[ // A side (bottom of plan)
      {type:'icon',icon:'crew',h:1},
      {type:'icon',icon:'galley',h:1}
    ]
  },
  2:{
    width:'x-wide',
    left:[
      {type:'icon',icon:'lav',h:1},
      {type:'icon',icon:'crew',h:1},
      {type:'cart',h:1}
    ],
    right:[
      {type:'icon',icon:'crew',h:1},
      {type:'icon',icon:'galley',h:1},
      {type:'cart',h:1}
    ]
  },
  3:{
    width:'medium',
    left:[
      {type:'icon',icon:'lav',h:1}
    ],
    right:[
      {type:'icon',icon:'lav',h:1}
    ]
  },
  4:{
    width:'wide',
    left:[
      {type:'icon',icon:'crew',h:1},
      {type:'icon',icon:'lav',h:1}
    ],
    right:[
      {type:'icon',icon:'crew',h:1},
      {type:'icon',icon:'galley',h:1}
    ]
  }
};

function buildZoneRect(zone){
  const el=document.createElement('div');
  if(zone.type==='cart'){
    el.className='gz-cart';
  }else{
    el.className='gz-icon';
    el.innerHTML=GALLEY_SVG[zone.icon]||'';
  }
  return el;
}

// Build a galley column with 2-column zone layout + crew avatars
function buildGalleyCol(label,doorNum){
  const col=document.createElement('div');col.className='galley-col';
  const zones=GALLEY_ZONES[doorNum];
  if(zones&&zones.width)col.classList.add('galley-'+zones.width);
  const crewD=getCrewForDoor(doorNum,'D');
  const crewG=getCrewForDoor(doorNum,'G');

  // Galley box (full cabin height)
  const box=document.createElement('div');box.className='galley-box';

  // Crew D avatar at top
  if(crewD)box.appendChild(buildCrewAvatar(crewD));

  // Zone grid: 2 columns (left=K side, right=A side)
  if(zones){
    const grid=document.createElement('div');grid.className='gz-grid';
    const colL=document.createElement('div');colL.className='gz-col';
    const colR=document.createElement('div');colR.className='gz-col';
    (zones.left||[]).forEach(z=>colL.appendChild(buildZoneRect(z)));
    (zones.right||[]).forEach(z=>colR.appendChild(buildZoneRect(z)));
    grid.appendChild(colL);grid.appendChild(colR);
    box.appendChild(grid);
  }

  // Label
  const lbl=document.createElement('div');lbl.className='galley-box-label';lbl.textContent=label||'P'+doorNum;
  box.appendChild(lbl);

  // Crew G avatar at bottom
  if(crewG)box.appendChild(buildCrewAvatar(crewG));
  col.appendChild(box);

  // Row number spacer
  const rns=document.createElement('div');rns.style.height='16px';col.appendChild(rns);
  return col;
}
document.getElementById('filters').addEventListener('click',e=>{const b=e.target.closest('.filter-btn');if(!b)return;document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;applyFilters();});
document.getElementById('searchInput').addEventListener('input',e=>{searchQuery=e.target.value.toLowerCase().trim();applyFilters();});
function applyFilters(){const has=activeFilter!=='all'||searchQuery.length>0;document.querySelectorAll('.seat:not(.no-seat)').forEach(el=>{const sid=el.dataset.seat,pax=passengers[sid];let m=true;
  if(activeFilter==='occupied')m=!!pax;else if(activeFilter==='empty')m=!pax;else if(activeFilter==='special-meal')m=pax&&pax.meal;else if(activeFilter==='um')m=pax&&pax.remark==='UM';else if(activeFilter==='wchr')m=pax&&pax.remark==='WCHR';else if(activeFilter==='not-boarded')m=pax&&!pax.boarded;else if(activeFilter==='bookmarked')m=!!bookmarks[sid];
  if(searchQuery&&m){if(pax)m=(pax.name+' '+pax.pnr+' '+sid+' '+pax.remark+' '+pax.meal).toLowerCase().includes(searchQuery);else m=sid.toLowerCase().includes(searchQuery);}
  el.classList.toggle('dimmed',has&&!m);el.classList.toggle('breathing',has&&m);});
  // Update pax list below cabin
  buildPaxList();
}
// Cached references for performance
let cachedTotalSeats=0;
const filterBadgeRefs={};
function cacheTotalSeats(){cachedTotalSeats=document.querySelectorAll('.seat:not(.no-seat)').length;}
function cacheFilterBadges(){document.querySelectorAll('.filter-btn').forEach(btn=>{const f=btn.dataset.filter;let badge=btn.querySelector('.filter-count');if(!badge){badge=document.createElement('span');badge.className='filter-count';btn.appendChild(badge);}filterBadgeRefs[f]=badge;});}

function getCrewForDoor(doorNum,side){return CREW.find(c=>{const d=doorAssignments[c.name]||c.door;return d===doorNum+side;});}

function updateStats(){
  // Ensure caches are populated
  if(!cachedTotalSeats)cacheTotalSeats();
  if(!Object.keys(filterBadgeRefs).length)cacheFilterBadges();
  // Single pass over passengers
  let occ=0,sm=0,um=0,wchr=0,nb=0;
  for(const id in passengers){
    const p=passengers[id];occ++;
    if(p.meal)sm++;
    if(p.remark==='UM')um++;
    if(p.remark==='WCHR')wchr++;
    if(!p.boarded)nb++;
  }
  const bk=Object.keys(bookmarks).length;
  const empty=cachedTotalSeats-occ;
  const counts={all:occ,occupied:occ,empty:empty,'special-meal':sm,um:um,wchr:wchr,'not-boarded':nb,bookmarked:bk};
  for(const f in filterBadgeRefs){
    filterBadgeRefs[f].textContent=counts[f]!=null?counts[f]:'';
  }
}

// === Pax Panel ===
let currentPanelSeat=null;
function openPaxPanel(sid,sc){currentPanelSeat=sid;const pax=passengers[sid];const badge=document.getElementById('panelSeatBadge');badge.textContent=sid;badge.className='pax-seat-badge '+(pax?sc:'empty-seat');
  document.getElementById('panelName').textContent=pax?pax.name:'Si\u00e8ge libre';document.getElementById('panelClass').textContent=pax?(sc+(pax.ffn?' | FFN '+pax.ffn:'')):sc;
  document.getElementById('panelBookmark').style.display=pax?'':'none';const grid=document.getElementById('panelGrid');grid.textContent='';
  if(pax){[{l:'PNR',v:pax.pnr},{l:'Nationalit\u00e9',v:pax.nationality},{l:'Embarquement',v:pax.boarded?'\u00c0 bord':'En attente',c:pax.boarded?'ok':'warn'},{l:'Check-in',v:pax.checkedIn?'Oui':'Non',c:pax.checkedIn?'ok':'warn'},{l:'Repas',v:pax.meal||'Standard'},{l:'Remarque',v:pax.remark||'Aucune',c:pax.remark?'warn':''},{l:'Bagages',v:pax.bags+' pcs'},{l:'Nourrisson',v:pax.infant?'Oui':'Non',c:pax.infant?'warn':''}].forEach(f=>{
    const it=document.createElement('div');it.className='pax-info-item';const lb=document.createElement('div');lb.className='pax-info-label';lb.textContent=f.l;const vl=document.createElement('div');vl.className='pax-info-value'+(f.c?' '+f.c:'');vl.textContent=f.v;it.appendChild(lb);it.appendChild(vl);grid.appendChild(it);});}
  document.getElementById('panelBookmark').classList.toggle('bookmarked',!!bookmarks[sid]);document.getElementById('panelNotes').value=notes[sid]||'';
  [document.getElementById('panelNotes'),document.getElementById('panelSaveNote'),document.querySelector('.pax-notes-label')].forEach(e=>{if(e)e.style.display=pax?'':'none';});
  document.querySelectorAll('.seat.selected').forEach(s=>s.classList.remove('selected'));const se=document.querySelector('[data-seat="'+sid+'"]');if(se)se.classList.add('selected');
  document.getElementById('paxOverlay').classList.add('visible');}
function closePaxPanel(){document.getElementById('paxOverlay').classList.remove('visible');document.querySelectorAll('.seat.selected').forEach(s=>s.classList.remove('selected'));currentPanelSeat=null;}
document.getElementById('panelClose').addEventListener('click',closePaxPanel);
document.getElementById('paxOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closePaxPanel();});
document.getElementById('panelBookmark').addEventListener('click',()=>{if(!currentPanelSeat)return;if(bookmarks[currentPanelSeat])delete bookmarks[currentPanelSeat];else bookmarks[currentPanelSeat]=true;lsSet('cabin_bookmarks',bookmarks);document.getElementById('panelBookmark').classList.toggle('bookmarked',!!bookmarks[currentPanelSeat]);const se=document.querySelector('[data-seat="'+currentPanelSeat+'"]');if(se)se.classList.toggle('bookmarked',!!bookmarks[currentPanelSeat]);});
document.getElementById('panelSaveNote').addEventListener('click',()=>{if(!currentPanelSeat)return;const v=document.getElementById('panelNotes').value.trim();if(v)notes[currentPanelSeat]=v;else delete notes[currentPanelSeat];lsSet('cabin_notes',notes);const btn=document.getElementById('panelSaveNote');btn.textContent='Enregistr\u00e9 !';setTimeout(()=>{btn.textContent='Enregistrer la note';},1500);});

// ============================================================
// MEALS
// ============================================================
function buildMeals(){const mc={};let st=0;Object.entries(passengers).forEach(([,p])=>{const m=p.meal||'STD';mc[m]=(mc[m]||0)+1;if(p.meal)st++;});
  document.getElementById('mealsBadge').textContent=st+' sp\u00e9ciaux';
  const row=document.getElementById('mealsCountRow');row.textContent='';Object.entries(mc).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{const k=document.createElement('div');k.className='brief-kpi';const v=document.createElement('div');v.className='brief-kpi-value';v.textContent=c;const l=document.createElement('div');l.className='brief-kpi-label';l.textContent=t;k.appendChild(v);k.appendChild(l);row.appendChild(k);});
  const list=document.getElementById('mealsSpecialList');list.textContent='';Object.entries(passengers).filter(([,p])=>p.meal).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([s,p])=>{const r=document.createElement('div');r.className='meal-special-row';const se=document.createElement('span');se.className='meal-seat';se.textContent=s;const n=document.createElement('span');n.className='meal-name';n.textContent=p.name;const t=document.createElement('span');t.className='meal-type';t.textContent=p.meal;r.appendChild(se);r.appendChild(n);r.appendChild(t);list.appendChild(r);});
  ['1','2'].forEach(svc=>{['Biz','Prem','Eco'].forEach(cls=>{const bar=document.getElementById('svc'+svc+cls),pctEl=document.getElementById('svc'+svc+cls+'Pct');const key=svc+'_'+cls.toLowerCase();const val=serviceState['s'+svc][cls.toLowerCase()]||0;const maxMap={Biz:document.querySelectorAll('.seat.occupied.business').length||1,Prem:document.querySelectorAll('.seat.occupied.premium').length||1,Eco:document.querySelectorAll('.seat.occupied.economy').length||1};const max=maxMap[cls];const p=Math.min(100,Math.round(val/max*100));bar.style.width=p+'%';pctEl.textContent=p+'%';bar.addEventListener('click',()=>{let cur=serviceState['s'+svc][cls.toLowerCase()]||0;cur=Math.min(max,cur+Math.ceil(max*0.1));serviceState['s'+svc][cls.toLowerCase()]=cur;lsSet('cabin_services',serviceState);const p2=Math.min(100,Math.round(cur/max*100));bar.style.width=p2+'%';pctEl.textContent=p2+'%';});});});}

// ============================================================
// CHECKLISTS — Tiles layout
// ============================================================
const CHECKLISTS = {
  'Pr\u00e9vol': {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', color: 'prevol',
    subs: {
      'Check pr\u00e9-vol': [
        'V\u00e9rifier les \u00e9quipements de secours (gilets, masques O2)',
        'V\u00e9rifier les extincteurs et leur date de validit\u00e9',
        'V\u00e9rifier les issues de secours et leur signalisation',
        'V\u00e9rifier les toboggans (armed/disarmed)',
        'V\u00e9rifier le mat\u00e9riel m\u00e9dical (trousse, d\u00e9fibrillateur)',
        'V\u00e9rifier les ceintures et accoudoirs des si\u00e8ges',
        'V\u00e9rifier l\'\u00e9clairage de secours au sol',
        'V\u00e9rifier les compartiments \u00e0 bagages',
        'V\u00e9rifier la propret\u00e9 g\u00e9n\u00e9rale de la cabine'
      ],
      'Avant fermeture portes': [
        'Comptage passagers effectu\u00e9',
        'Bagages cabine correctement rang\u00e9s',
        'Tablettes et dossiers relev\u00e9s',
        'Ceintures attach\u00e9es v\u00e9rifi\u00e9es',
        'Hublots ouverts',
        'Appareils \u00e9lectroniques en mode avion',
        'Portes arm\u00e9es et cross-check'
      ]
    }
  },
  'En vol': {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l5.2 3L6 14l-2-1c-.4-.2-.9-.1-1.1.3l-.4.6c-.2.4-.1.8.2 1.1l4 3 3 4c.3.3.7.4 1.1.2l.6-.4c.4-.2.5-.7.3-1.1l-1-2 2.9-2.9 3 5.2c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>', color: 'envol',
    subs: {
      'Mont\u00e9e': [
        'Consigne ceintures \u00e9teinte \u2014 service autoris\u00e9',
        'Distribution serviettes chaudes (Business/Premium)',
        'D\u00e9but service boissons',
        'V\u00e9rification cabine post-d\u00e9collage'
      ],
      'Descente': [
        'Annonce pr\u00e9paration atterrissage',
        'Cabine s\u00e9curis\u00e9e pour atterrissage',
        'Tablettes et dossiers relev\u00e9s',
        'Ceintures attach\u00e9es v\u00e9rifi\u00e9es',
        'Portes d\u00e9sarm\u00e9es apr\u00e8s arr\u00eat complet'
      ],
      'Turbulences': [
        'Annonce ceintures attach\u00e9es',
        'Service interrompu et galleys s\u00e9curis\u00e9es',
        'V\u00e9rification attache ceintures passagers',
        '\u00c9quipement galley arrim\u00e9',
        'Chariots frein\u00e9s et bloqu\u00e9s'
      ]
    }
  },
  'Annonces': {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>', color: 'annonces',
    isManual: true
  },
  'M\u00e9mo': {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', color: 'memo',
    subs: {
      'Descente d\'urgence': [
        'Masques O2 tomb\u00e9s \u2014 assister les passagers',
        'V\u00e9rifier la pression cabine',
        'Position brace command\u00e9e si n\u00e9cessaire',
        '\u00c9vacuation pr\u00e9par\u00e9e'
      ],
      'Feu cabine': [
        'Localiser le feu',
        'Alerter le CDB',
        'Utiliser l\'extincteur adapt\u00e9',
        '\u00c9vacuer la zone si n\u00e9cessaire',
        'Surveiller apr\u00e8s extinction'
      ],
      'PAXI (passager indisciplin\u00e9)': [
        '\u00c9valuer le niveau de menace',
        'Tenter la d\u00e9-escalade verbale',
        'Isoler le passager si possible',
        'Informer le CDB',
        'R\u00e9diger le PV'
      ],
      'FORDEC': [
        'F \u2014 Faits : identifier la situation',
        'O \u2014 Options : lister les alternatives',
        'R \u2014 Risques : \u00e9valuer chaque option',
        'D \u2014 D\u00e9cision : choisir',
        'E \u2014 Ex\u00e9cution : appliquer',
        'C \u2014 Contr\u00f4le : v\u00e9rifier le r\u00e9sultat'
      ]
    }
  }
};

function buildChecklists(){
  const tiles=document.getElementById('checklistTiles');tiles.textContent='';
  let totalItems=0,doneItems=0;
  Object.entries(CHECKLISTS).forEach(([catName,cat])=>{
    // Special case: Annonces tile uses ANNONCES_MANUAL data
    if(cat.isManual){
      buildAnnoncesTile(tiles,catName,cat);
      return;
    }
    const tile=document.createElement('div');tile.className='cl-tile';
    const header=document.createElement('div');header.className='cl-tile-header';
    const icon=document.createElement('div');icon.className='cl-tile-icon';icon.innerHTML=cat.icon;
    const title=document.createElement('div');title.className='cl-tile-title';title.textContent=catName;
    let catTotal=0,catDone=0;
    Object.entries(cat.subs).forEach(([subName,items])=>{
      catTotal+=items.length;
      catDone+=items.filter((_,i)=>checklistState[catName+'_'+subName+'_'+i]).length;
    });
    totalItems+=catTotal;doneItems+=catDone;
    const badge=document.createElement('div');badge.className='cl-tile-badge';
    badge.textContent=catDone+'/'+catTotal;
    header.appendChild(icon);header.appendChild(title);header.appendChild(badge);
    tile.appendChild(header);
    const subs=document.createElement('div');subs.className='cl-subtiles';
    Object.entries(cat.subs).forEach(([subName,items])=>{
      const subTile=document.createElement('div');subTile.className='cl-subtile';
      const st=document.createElement('div');st.className='cl-subtile-title';st.textContent=subName;
      const right=document.createElement('div');right.className='cl-subtile-right';
      const done=items.filter((_,i)=>checklistState[catName+'_'+subName+'_'+i]).length;
      const sc=document.createElement('div');sc.className='cl-subtile-count';
      sc.textContent=done+'/'+items.length;
      if(done===items.length)sc.style.color='#4ade80';
      const arrow=document.createElement('div');arrow.className='cl-subtile-arrow';arrow.textContent='\u203A';
      right.appendChild(sc);right.appendChild(arrow);
      subTile.appendChild(st);subTile.appendChild(right);
      subTile.addEventListener('click',()=>openChecklistDetail(catName,subName,items));
      subs.appendChild(subTile);
    });
    tile.appendChild(subs);tiles.appendChild(tile);
  });
  document.getElementById('checklistBadge').textContent=doneItems+' / '+totalItems;
}

// Build the Annonces tile using ANNONCES_MANUAL chapters
function buildAnnoncesTile(container,catName,cat){
  if(typeof ANNONCES_MANUAL==='undefined')return;
  var tile=document.createElement('div');tile.className='cl-tile';
  // Header
  var header=document.createElement('div');header.className='cl-tile-header';
  var icon=document.createElement('div');icon.className='cl-tile-icon';icon.innerHTML=cat.icon;
  var title=document.createElement('div');title.className='cl-tile-title';title.textContent=catName;
  var totalSections=0;
  ANNONCES_MANUAL.forEach(function(ch){totalSections+=ch.sections.length;});
  var badge=document.createElement('div');badge.className='cl-tile-badge';
  badge.textContent=totalSections+' annonces';
  header.appendChild(icon);header.appendChild(title);header.appendChild(badge);
  tile.appendChild(header);
  // Chapters as sub-tiles (compact)
  var subs=document.createElement('div');subs.className='cl-subtiles';
  ANNONCES_MANUAL.forEach(function(ch){
    var sub=document.createElement('div');sub.className='cl-subtile';
    var st=document.createElement('div');st.className='cl-subtile-title';st.textContent=ch.chapter;
    var right=document.createElement('div');right.className='cl-subtile-right';
    var sc=document.createElement('div');sc.className='cl-subtile-count';
    sc.textContent=ch.sections.length;
    var arrow=document.createElement('div');arrow.className='cl-subtile-arrow';arrow.textContent='\u203A';
    right.appendChild(sc);right.appendChild(arrow);
    sub.appendChild(st);sub.appendChild(right);
    sub.addEventListener('click',function(){openAnnonceChapter(ch);});
    subs.appendChild(sub);
  });
  tile.appendChild(subs);container.appendChild(tile);
}

// Open a chapter: shows list of sections as clickable rows
function openAnnonceChapter(ch){
  document.getElementById('checklistTiles').style.display='none';
  var detail=document.getElementById('checklistDetail');detail.style.display='';
  document.getElementById('checklistDetailTitle').textContent=ch.chapter;
  var list=document.getElementById('checklistDetailItems');list.textContent='';

  // Check if this chapter has any station-specific sections
  var chapterHasStations=ch.sections.some(function(sec){return !!ANNONCE_STATIONS[sec.title];});

  // IATA filter bar (only if chapter has station-specific announcements)
  if(chapterHasStations){
    var filterBar=document.createElement('div');filterBar.className='annonce-filter-bar';
    // "Toutes" button
    var allBtn=document.createElement('button');
    allBtn.className='annonce-filter-btn'+(currentAnnonceFilter===null?' active':'');
    allBtn.textContent='Toutes';
    allBtn.addEventListener('click',function(){currentAnnonceFilter=null;openAnnonceChapter(ch);});
    filterBar.appendChild(allBtn);
    // Collect IATA codes relevant to this chapter
    var chapterCodes=[];
    ch.sections.forEach(function(sec){
      var codes=ANNONCE_STATIONS[sec.title];
      if(codes)codes.forEach(function(c){if(chapterCodes.indexOf(c)===-1)chapterCodes.push(c);});
    });
    // Sort by ANNONCE_IATA_ALL order
    chapterCodes.sort(function(a,b){return ANNONCE_IATA_ALL.indexOf(a)-ANNONCE_IATA_ALL.indexOf(b);});
    chapterCodes.forEach(function(code){
      var btn=document.createElement('button');
      btn.className='annonce-filter-btn'+(currentAnnonceFilter===code?' active':'');
      btn.textContent=code;
      btn.addEventListener('click',function(){currentAnnonceFilter=code;openAnnonceChapter(ch);});
      filterBar.appendChild(btn);
    });
    list.appendChild(filterBar);
  }

  // Section rows (filtered)
  ch.sections.forEach(function(sec){
    var stationCodes=ANNONCE_STATIONS[sec.title]; // undefined = general
    // If filter active: show general (no codes) + matching codes
    if(currentAnnonceFilter && stationCodes && stationCodes.indexOf(currentAnnonceFilter)===-1) return;

    var row=document.createElement('div');row.className='cl-subtile';
    var st=document.createElement('div');st.className='cl-subtile-title';st.textContent=sec.title;
    var right=document.createElement('div');right.className='cl-subtile-right';
    // Station badges
    if(stationCodes){
      stationCodes.forEach(function(c){
        var badge=document.createElement('span');badge.className='annonce-station-badge';
        badge.textContent=c;right.appendChild(badge);
      });
    }
    if(sec.tags&&sec.tags.length){
      sec.tags.forEach(function(t){
        var tag=document.createElement('span');tag.className='annonce-tag '+t.replace(/\s+/g,'-');
        tag.textContent=t;right.appendChild(tag);
      });
    }
    var arrow=document.createElement('div');arrow.className='cl-subtile-arrow';arrow.textContent='\u203A';
    right.appendChild(arrow);
    row.appendChild(st);row.appendChild(right);
    row.addEventListener('click',function(){openAnnonceDetail(ch.chapter,sec);});
    list.appendChild(row);
  });
}

function openChecklistDetail(cat,sub,items){
  document.getElementById('checklistTiles').style.display='none';
  const detail=document.getElementById('checklistDetail');detail.style.display='';
  document.getElementById('checklistDetailTitle').textContent=cat+' \u2014 '+sub;
  const list=document.getElementById('checklistDetailItems');list.textContent='';
  items.forEach((text,idx)=>{
    const key=cat+'_'+sub+'_'+idx;const done=!!checklistState[key];
    const item=document.createElement('div');item.className='checklist-item'+(done?' done':'');
    const check=document.createElement('div');check.className='cl-check';
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');
    const poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');poly.setAttribute('points','20 6 9 17 4 12');
    svg.appendChild(poly);check.appendChild(svg);
    const txt=document.createElement('div');txt.className='cl-text';txt.textContent=text;
    item.appendChild(check);item.appendChild(txt);
    item.addEventListener('click',()=>{if(checklistState[key])delete checklistState[key];else checklistState[key]=true;lsSet('cabin_checklist',checklistState);openChecklistDetail(cat,sub,items);buildChecklists();});
    list.appendChild(item);
  });
}
document.getElementById('checklistBack').addEventListener('click',function(){
  document.getElementById('checklistTiles').style.display='';
  document.getElementById('checklistDetail').style.display='none';
  currentAnnonceFilter=null;
});

// Lucide-style SVG icons for annonces chapters
var ANNONCE_ICONS={
  'book-open':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  'languages':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
  'crown':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14v4H5z"/></svg>',
  'plane-takeoff':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2L22 4.5"/></svg>',
  'plane':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l5.2 3L6 14l-2-1c-.4-.2-.9-.1-1.1.3l-.4.6c-.2.4-.1.8.2 1.1l4 3 3 4c.3.3.7.4 1.1.2l.6-.4c.4-.2.5-.7.3-1.1l-1-2 2.9-2.9 3 5.2c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>',
  'alert-triangle':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  'plane-landing':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M2 22h20"/><path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l7.55 3.78"/></svg>',
  'alert-circle':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
};

// buildAnnonces is now integrated into buildChecklists via buildAnnoncesTile

function openAnnonceDetail(chapterTitle,sec){
  document.getElementById('checklistTiles').style.display='none';
  var detail=document.getElementById('checklistDetail');detail.style.display='';
  document.getElementById('checklistDetailTitle').textContent=sec.title;
  var list=document.getElementById('checklistDetailItems');list.textContent='';
  // Tags row
  if(sec.tags&&sec.tags.length){
    var tagRow=document.createElement('div');tagRow.style.cssText='margin-bottom:8px;';
    sec.tags.forEach(function(t){
      var tag=document.createElement('span');tag.className='annonce-tag '+t.replace(/\s+/g,'-');
      tag.textContent=t;tagRow.appendChild(tag);
    });
    list.appendChild(tagRow);
  }
  // Content — split by \n\n blocks, detect language, add flag + italicize EN
  var content=document.createElement('div');content.className='annonce-content';
  var blocks=sec.content.split('\n\n');
  blocks.forEach(function(block,idx){
    if(idx>0){
      var spacer=document.createElement('div');spacer.style.height='14px';
      content.appendChild(spacer);
    }
    var lang=detectBlockLang(block, sec.title);
    // Flag + block wrapper
    var wrapper=document.createElement('div');wrapper.className='annonce-block';
    var flag=document.createElement('span');flag.className='annonce-flag';
    if(lang==='en') flag.textContent='\uD83C\uDDEC\uD83C\uDDE7';           // 🇬🇧
    else if(lang==='cr-re') flag.textContent='\uD83C\uDDF7\uD83C\uDDEA';   // 🇷🇪 Réunion
    else if(lang==='cr-mq') flag.textContent='\uD83C\uDDF2\uD83C\uDDF6';   // 🇲🇶 Martinique
    else if(lang==='cr-gp') flag.textContent='\uD83C\uDDEC\uD83C\uDDF5';   // 🇬🇵 Guadeloupe
    else if(lang==='cr-mu') flag.textContent='\uD83C\uDDF2\uD83C\uDDFA';   // 🇲🇺 Maurice
    else if(lang==='cr-yt') flag.textContent='\uD83C\uDDFE\uD83C\uDDF9';   // 🇾🇹 Mayotte
    else if(lang==='cr') flag.textContent='\uD83C\uDDEB\uD83C\uDDF7 CR';   // 🇫🇷 CR fallback
    else flag.textContent='\uD83C\uDDEB\uD83C\uDDF7';                       // 🇫🇷
    wrapper.appendChild(flag);
    if(lang==='en'){
      var em=document.createElement('em');
      em.textContent=block;
      wrapper.appendChild(em);
    } else {
      var span=document.createElement('span');
      span.textContent=block;
      wrapper.appendChild(span);
    }
    content.appendChild(wrapper);
  });
  list.appendChild(content);
}

// Detect language of a text block: 'fr', 'en', 'cr-re', 'cr-mq', 'cr-gp', 'cr-mu', 'cr-yt', 'cr'
function detectBlockLang(text, sectionTitle){
  var t=text.trim();
  var st=(sectionTitle||'').toLowerCase();

  // Creole detection — first check if it's Creole, then identify variant
  var isCreole=/\b(zot|lekipaj|gayar|ti caillou|lokal|deor i fait|Mesie ze danm|Matinik|koumandan de bow|dekolaj-la|Gwadloup|Komandan la|senti a zot|onpil davwa|chwazi|Korse|lekipaj-li|risive|risouwe|Mesye ze dam|kabin|anlè|sièj|tablèt|ékipaj|ranjé|bagaj|ridrésé)\b/i.test(t);
  if(isCreole){
    // Identify variant from block content (headers) or section title
    // Réunion: "RÉUNION", "RUN", "zot", "na le plaisir", "caillou"
    if(/R[ÉE]UNION|RUN/i.test(t)||/R[ÉE]UNION|RUN/i.test(st)||/\b(gayar|ti caillou|heure lokal|deor i fait|na le plaisir)\b/i.test(t))return 'cr-re';
    // Martinique: "MARTINIQUE", "FDF", "Mesié ze danm", "Matinik"
    if(/MARTINIQUE|FDF/i.test(t)||/MARTINIQUE|FDF/i.test(st)||/\b(Mesie ze danm|Matinik|Misié|koumandan de bow|dekolaj-la|Korse)\b/i.test(t))return 'cr-mq';
    // Guadeloupe: "GUADELOUPE", "PTP", "Mésyé zé dam", "Gwadloup"
    if(/GUADELOUPE|PTP/i.test(t)||/GUADELOUPE|PTP/i.test(st)||/\b(Gwadloup|Komandan la|risiv[eé]|M[eé]sy[eé] z[eé] dam)\b/i.test(t))return 'cr-gp';
    // Maurice: "MAURICE", "MRU"
    if(/MAURICE|MRU/i.test(t)||/MAURICE|MRU/i.test(st))return 'cr-mu';
    // Mayotte: "MAYOTTE", "DZA"
    if(/MAYOTTE|DZA/i.test(t)||/MAYOTTE|DZA/i.test(st))return 'cr-yt';
    // Generic Creole (unknown variant)
    return 'cr';
  }

  // English detection
  if(/^Ladies and Gentlemen/i.test(t))return 'en';
  if(/^(Please |Thank you|Your |The |In the event|Due to|May I|Would you|Are you|Do you|Have you|Could I|Good morning|Captain |Passengers |To all passengers|Cabin crew|WIFI is|We inform|Drinks will|Headphones|You are trav|If ever you|Cases of Mpox|For future|If you have any|Buses operating|Further to|Flight and duty|Following on|The Captain|We are|We have|We will|We remind|We ask|We invite|We welcome|We would|We carry|We may|Correctly|Put on|Pull down|Make sure|Fasten|Keep your|Wait for|You will|Then,|Emergency|When opening|Only cash|Kiosks|An identity|Payments|A circulation|Ministry|Ocean users|The Mauritian|For your safety|Mobile phones|Please note|When the illuminated|You can find|In business|All electronic|Your laptop|In case of|The life jacket|The product used|To comply|Tampering|Recharging|The crew member|We also inform|For transit|The cabin crew|It is|Swimming)\b/i.test(t))return 'en';
  // Word frequency heuristic
  var enWords=(t.match(/\b(the|and|you|your|please|that|this|with|from|have|will|are|for|our|not|can|all|must|been|seat|belt|cabin|crew|board|flight|passengers|safety|luggage|emergency)\b/gi)||[]).length;
  var frWords=(t.match(/\b(les|des|nous|vous|est|une|sur|dans|pour|que|votre|notre|sont|pas|avec|aux|ses|qui|par|ont|mesdames|messieurs|bord|ceinture|cabine|equipage|securite)\b/gi)||[]).length;
  if(enWords>frWords&&enWords>=3)return 'en';
  return 'fr';
}

// === IATA station filter for announcements ===
// Map section titles → IATA codes they apply to. Absent = all stations.
var ANNONCE_STATIONS={
  '5.6 D\u00e9sinsectisation':['RUN','DZA','FDF','PTP','MRU','TNR'],
  '5.8.3 Vol sans WIFI ABJ':['ABJ'],
  '5.18 Mesures sanitaires Antilles':['FDF','PTP'],
  '5.19 Agriculture MRU':['MRU'],
  '5.20 Agriculture RUN':['RUN'],
  '5.21 Fi\u00e8vre aphteuse Oc\u00e9an Indien':['MRU','RUN','DZA','TNR'],
  '5.22 \u00c9pid\u00e9mie de Chikungunya RUN / DZA':['RUN','DZA'],
  '5.23 \u00c9pid\u00e9mie de Dengue vol retour de TNR et MRU':['TNR','MRU'],
  '5.24 Variole B, Mpox arriv\u00e9e/d\u00e9part TNR':['TNR'],
  '5.28 ORY - Train + Air':['ORY'],
  '7.3 Pr\u00e9sentation passeport':['MRU','TNR','ABJ','BKO','COO','DZA'],
  '8.1 Arriv\u00e9e CDG':['CDG']
};
// All IATA codes used in filters
var ANNONCE_IATA_ALL=['ORY','CDG','RUN','MRU','DZA','TNR','FDF','PTP','ABJ','BKO','COO','CAY'];
var currentAnnonceFilter=null; // null = all

// ============================================================
// REPORT
// ============================================================
const CABIN_ZONES_LIST=['Business','Premium','\u00c9conomy avant','\u00c9conomy centre','\u00c9conomy arri\u00e8re','Galley avant','Galley milieu','Galley arri\u00e8re','Toilettes avant','Toilettes milieu','Toilettes arri\u00e8re'];
function buildReport(){
  const grid=document.getElementById('reportCabinGrid');grid.textContent='';
  CABIN_ZONES_LIST.forEach(zone=>{const row=document.createElement('div');row.className='cabin-zone';const nm=document.createElement('div');nm.className='cabin-zone-name';nm.textContent=zone;const btns=document.createElement('div');btns.className='cabin-zone-status';
    ['OK','ATT','KO'].forEach((label,i)=>{const cls=['active-ok','active-warn','active-ko'][i];const btn=document.createElement('button');btn.className='zone-btn';btn.textContent=label;if(cabinZones[zone]===label)btn.classList.add(cls);
      btn.addEventListener('click',()=>{cabinZones[zone]=label;lsSet('cabin_zones',cabinZones);buildReport();});btns.appendChild(btn);});row.appendChild(nm);row.appendChild(btns);grid.appendChild(row);});
  const list=document.getElementById('incidentsList');list.textContent='';incidents.forEach(inc=>{const row=document.createElement('div');row.className='incident-row';const time=document.createElement('span');time.className='incident-time';time.textContent=inc.time;const tag=document.createElement('span');tag.className='incident-type-tag '+inc.severity;tag.textContent=inc.type;const desc=document.createElement('span');desc.className='incident-desc';desc.textContent=(inc.seat?'['+inc.seat+'] ':'')+inc.desc;row.appendChild(time);row.appendChild(tag);row.appendChild(desc);list.appendChild(row);});
  const summary=document.getElementById('reportSummary');summary.textContent='';const occ=Object.keys(passengers).length,boarded=Object.values(passengers).filter(p=>p.boarded).length;
  [{v:''+occ,l:'Passagers'},{v:''+boarded,l:'Embarqu\u00e9s'},{v:''+incidents.length,l:'Incidents'},{v:Object.values(cabinZones).filter(v=>v==='OK').length+'/'+CABIN_ZONES_LIST.length,l:'Zones OK'},{v:''+Object.values(checklistState).filter(Boolean).length,l:'Checks faits'},{v:''+Object.values(passengers).filter(p=>p.meal).length,l:'Repas sp\u00e9.'}].forEach(s=>{const d=document.createElement('div');d.className='report-stat';const v=document.createElement('div');v.className='report-stat-value';v.textContent=s.v;const l=document.createElement('div');l.className='report-stat-label';l.textContent=s.l;d.appendChild(v);d.appendChild(l);summary.appendChild(d);});
  const notesEl=document.getElementById('reportNotes');notesEl.value=localStorage.getItem('cabin_report_notes')||'';notesEl.addEventListener('input',()=>{localStorage.setItem('cabin_report_notes',notesEl.value);idbSet('cabin_report_notes',notesEl.value);});
}
document.getElementById('addIncidentBtn').addEventListener('click',()=>document.getElementById('incidentOverlay').classList.add('visible'));
document.getElementById('incidentClose').addEventListener('click',()=>document.getElementById('incidentOverlay').classList.remove('visible'));
document.getElementById('incidentOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)document.getElementById('incidentOverlay').classList.remove('visible');});
document.getElementById('severityBtns').addEventListener('click',e=>{const b=e.target.closest('.sev-btn');if(!b)return;document.querySelectorAll('.sev-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');});
document.getElementById('incidentSave').addEventListener('click',()=>{const desc=document.getElementById('incidentDesc').value.trim();if(!desc)return;const now=new Date();const sev=document.querySelector('.sev-btn.active');
  incidents.push({time:fmt(now),type:document.getElementById('incidentType').value,seat:document.getElementById('incidentSeat').value.trim(),desc,severity:sev?sev.dataset.sev:'low'});lsSet('cabin_incidents',incidents);
  document.getElementById('incidentDesc').value='';document.getElementById('incidentSeat').value='';document.getElementById('incidentOverlay').classList.remove('visible');buildReport();updateAppBadge();});

// ============================================================
// REPORT PHOTOS (IndexedDB storage, canvas resize)
// ============================================================
var PHOTO_MAX_PX = 1600;  // max dimension (keeps detail for zoom)
var PHOTO_QUALITY = 0.82; // JPEG quality (good balance)
var PHOTO_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB
var PHOTO_WARN_BYTES = 80 * 1024 * 1024;   // 80 MB warning
var photoDb = null;
var photoTotalBytes = 0;

(function initPhotoDB() {
  if (!window.indexedDB) return;
  var req = indexedDB.open('CabinReadyPhotos', 1);
  req.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains('photos')) {
      db.createObjectStore('photos', { keyPath: 'id' });
    }
  };
  req.onsuccess = function(e) { photoDb = e.target.result; renderPhotos(); };
  req.onerror = function() { photoDb = null; };
})();

function resizePhoto(file) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > PHOTO_MAX_PX || h > PHOTO_MAX_PX) {
          if (w > h) { h = Math.round(h * PHOTO_MAX_PX / w); w = PHOTO_MAX_PX; }
          else { w = Math.round(w * PHOTO_MAX_PX / h); h = PHOTO_MAX_PX; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', PHOTO_QUALITY);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function savePhoto(blob) {
  if (!photoDb) return Promise.resolve();
  var id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  return new Promise(function(resolve) {
    var tx = photoDb.transaction('photos', 'readwrite');
    tx.objectStore('photos').put({ id: id, blob: blob, date: new Date().toISOString() });
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function() { resolve(); };
  });
}

function deletePhoto(id) {
  if (!photoDb) return Promise.resolve();
  return new Promise(function(resolve) {
    var tx = photoDb.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(id);
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function() { resolve(); };
  });
}

function getAllPhotos() {
  if (!photoDb) return Promise.resolve([]);
  return new Promise(function(resolve) {
    var tx = photoDb.transaction('photos', 'readonly');
    var req = tx.objectStore('photos').getAll();
    req.onsuccess = function() { resolve(req.result || []); };
    req.onerror = function() { resolve([]); };
  });
}

function renderPhotos() {
  var grid = document.getElementById('photoGrid');
  var storageLabel = document.getElementById('photoStorage');
  if (!grid) return;
  getAllPhotos().then(function(photos) {
    grid.textContent = '';
    var totalBytes = 0;
    photos.forEach(function(p) {
      totalBytes += p.blob.size || 0;
      var thumb = document.createElement('div');
      thumb.className = 'photo-thumb';
      var img = document.createElement('img');
      img.src = URL.createObjectURL(p.blob);
      img.addEventListener('load', function() { URL.revokeObjectURL(img.src); });
      img.addEventListener('click', function() { openLightbox(p.blob); });
      var del = document.createElement('button');
      del.className = 'photo-delete';
      del.textContent = '\u00d7';
      del.addEventListener('click', function(e) {
        e.stopPropagation();
        deletePhoto(p.id).then(renderPhotos);
      });
      thumb.appendChild(img);
      thumb.appendChild(del);
      grid.appendChild(thumb);
    });
    photoTotalBytes = totalBytes;
    if (storageLabel) {
      if (photos.length === 0) { storageLabel.textContent = ''; storageLabel.style.color = ''; }
      else {
        var mb = (totalBytes / 1024 / 1024).toFixed(1);
        var maxMb = (PHOTO_LIMIT_BYTES / 1024 / 1024).toFixed(0);
        storageLabel.textContent = photos.length + ' photo' + (photos.length > 1 ? 's' : '') + ' \u2014 ' + mb + ' / ' + maxMb + ' MB';
        if (totalBytes >= PHOTO_LIMIT_BYTES) storageLabel.style.color = 'var(--corsair-rouge-vermillon)';
        else if (totalBytes >= PHOTO_WARN_BYTES) storageLabel.style.color = '#e8a838';
        else storageLabel.style.color = '';
      }
    }
  });
}

function openLightbox(blob) {
  var lb = document.getElementById('photoLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'photoLightbox';
    lb.className = 'photo-lightbox';
    lb.innerHTML = '<button class="photo-lightbox-close">\u00d7</button><img>';
    lb.addEventListener('click', function(e) { if (e.target === lb || e.target.classList.contains('photo-lightbox-close')) { lb.classList.remove('visible'); } });
    document.body.appendChild(lb);
  }
  var img = lb.querySelector('img');
  img.src = URL.createObjectURL(blob);
  img.onload = function() { URL.revokeObjectURL(img.src); };
  lb.classList.add('visible');
}

// File input handler
document.getElementById('photoInput').addEventListener('change', function(e) {
  var files = Array.from(e.target.files);
  if (!files.length) return;
  if (photoTotalBytes >= PHOTO_LIMIT_BYTES) {
    alert('Limite de stockage photos atteinte (100 MB). Supprimez des photos avant d\u2019en ajouter.');
    e.target.value = '';
    return;
  }
  Promise.all(files.map(function(f) { return resizePhoto(f); }))
    .then(function(blobs) {
      var saved = [];
      var running = photoTotalBytes;
      for (var i = 0; i < blobs.length; i++) {
        if (running + blobs[i].size > PHOTO_LIMIT_BYTES) {
          alert('Limite 100 MB atteinte. ' + saved.length + '/' + blobs.length + ' photos ajout\u00e9es.');
          break;
        }
        running += blobs[i].size;
        saved.push(blobs[i]);
      }
      return Promise.all(saved.map(function(b) { return savePhoto(b); }));
    })
    .then(function() { renderPhotos(); });
  e.target.value = '';
});

// ============================================================
// OTP
// ============================================================
// Crew-relevant milestones only
const MILESTONES=[
  {offset:-110,label:'Prise en charge équipage'},
  {offset:-100,label:'Équipage au comptoir'},
  {offset:-90,label:'Bus équipage'},
  {offset:-80,label:'Équipage en porte'},
  {offset:-70,label:'Accueil pré-vol / Briefing'},
  {offset:-70,label:'Catering chargé'},
  {offset:-60,label:'Vérification cabine'},
  {offset:-50,label:'Début embarquement'},
  {offset:-50,label:'Annonce embarquement'},
  {offset:-40,label:'PMR / Embarquement distant'},
  {offset:-30,label:'Fin embarquement'},
  {offset:-20,label:'Comptage final / rapprochement'},
  {offset:-15,label:'Annonce bienvenue'},
  {offset:-10,label:'Portes fermées — cross-check'},
  {offset:-5,label:'Annonce sécurité'},
  {offset:0,label:'DÉPART'}
];
function getSTD(){const p=document.getElementById('stdInput').value.split(':');const d=new Date();d.setHours(+p[0],+p[1],0,0);return d;}
function fmt(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
let otpRemarks=lsGet('cabin_otp_remarks',{});
function buildTimeline(){
  const c=document.getElementById('timelineContainer');if(!c)return;c.textContent='';
  const std=getSTD(),now=new Date();

  MILESTONES.forEach((m,idx)=>{
    const target=new Date(std.getTime()+m.offset*60000);
    const diff=Math.round((target-now)/60000);
    const chk=!!milestoneChecks[idx];

    const row=document.createElement('div');row.className='otp-row';
    // Status
    if(chk)row.classList.add('done');
    else if(diff>5)row.classList.add('upcoming');
    else if(diff>=-5)row.classList.add('current');
    else row.classList.add('overdue');

    // Left: time column
    const timeCol=document.createElement('div');timeCol.className='otp-time-col';
    const absTime=document.createElement('div');absTime.className='otp-abs-time';absTime.textContent=fmt(target);
    const relTime=document.createElement('div');relTime.className='otp-rel-time';
    relTime.textContent=m.offset===0?'STD':'H'+m.offset;
    timeCol.appendChild(absTime);timeCol.appendChild(relTime);

    // Center: dot + line
    const dotCol=document.createElement('div');dotCol.className='otp-dot-col';
    const dot=document.createElement('div');dot.className='otp-dot';
    if(chk)dot.classList.add('checked');
    dot.addEventListener('click',e=>{
      e.stopPropagation();
      if(milestoneChecks[idx])delete milestoneChecks[idx];else milestoneChecks[idx]=Date.now();
      lsSet('cabin_otp_checks',milestoneChecks);buildTimeline();
    });
    dotCol.appendChild(dot);

    // Right: label + remark
    const contentCol=document.createElement('div');contentCol.className='otp-content-col';
    const label=document.createElement('div');label.className='otp-label';label.textContent=m.label;
    // Status badge
    const badge=document.createElement('span');badge.className='otp-status-badge';
    if(chk){badge.textContent='Fait';badge.classList.add('done');}
    else if(diff>5){badge.textContent='\u00c0 venir';badge.classList.add('waiting');}
    else if(diff>=-5){badge.textContent='En cours';badge.classList.add('now');}
    else{badge.textContent='Retard';badge.classList.add('late');}
    label.appendChild(badge);
    contentCol.appendChild(label);

    // Remark area
    const remarkKey='otp_remark_'+idx;
    const existingRemark=otpRemarks[remarkKey]||'';
    if(existingRemark){
      const remarkDiv=document.createElement('div');remarkDiv.className='otp-remark';remarkDiv.textContent=existingRemark;
      contentCol.appendChild(remarkDiv);
    }
    // Add remark button
    const addBtn=document.createElement('div');addBtn.className='otp-add-remark';addBtn.textContent='+ Note';
    addBtn.addEventListener('click',e=>{
      e.stopPropagation();
      const input=document.createElement('input');input.type='text';input.className='otp-remark-input';
      input.value=existingRemark;input.placeholder='Ajouter une remarque...';
      input.addEventListener('keydown',ev=>{
        if(ev.key==='Enter'){
          if(input.value.trim())otpRemarks[remarkKey]=input.value.trim();
          else delete otpRemarks[remarkKey];
          lsSet('cabin_otp_remarks',otpRemarks);buildTimeline();
        }
      });
      input.addEventListener('blur',()=>{
        if(input.value.trim())otpRemarks[remarkKey]=input.value.trim();
        else delete otpRemarks[remarkKey];
        lsSet('cabin_otp_remarks',otpRemarks);buildTimeline();
      });
      addBtn.replaceWith(input);input.focus();
    });
    contentCol.appendChild(addBtn);

    row.appendChild(timeCol);row.appendChild(dotCol);row.appendChild(contentCol);
    c.appendChild(row);
  });
}
function updateClocks(){const t=fmt(new Date());const c1=document.getElementById('otpClock');if(c1)c1.textContent=t;const c2=document.getElementById('briefingClock');if(c2)c2.textContent=t;}
const stdIn=document.getElementById('stdInput');if(stdIn)stdIn.addEventListener('change',buildTimeline);
setInterval(()=>{buildTimeline();updateClocks();},30000);

// === App Badge ===
function updateAppBadge(){if(!('setAppBadge' in navigator))return;let c=0;Object.values(passengers).forEach(p=>{if(!p.boarded)c++;});c+=incidents.length;if(c>0)navigator.setAppBadge(c).catch(()=>{});else navigator.clearAppBadge().catch(()=>{});}

// ============================================================
// INIT
// ============================================================
// === UTC Clock ===
let activeClockTz='utc';
const TZ_OFFSETS={utc:0,dep:1,arr:-4}; // ORY=UTC+1 (CET), PTP=UTC-4
function updateUTCClock(){
  const now=new Date();
  const utcH=now.getUTCHours(),utcM=now.getUTCMinutes();
  const fmtT=(h,m)=>String(((h%24)+24)%24).padStart(2,'0')+':'+String(m).padStart(2,'0');
  document.getElementById('clockUtcTime').textContent=fmtT(utcH,utcM)+'Z';
  document.getElementById('clockDepTime').textContent=fmtT(utcH+TZ_OFFSETS.dep,utcM);
  document.getElementById('clockArrTime').textContent=fmtT(utcH+TZ_OFFSETS.arr,utcM);
  // Update button label based on active tz
  const labels={utc:fmtT(utcH,utcM)+'Z',dep:fmtT(utcH+TZ_OFFSETS.dep,utcM),arr:fmtT(utcH+TZ_OFFSETS.arr,utcM)};
  document.getElementById('utcLabel').textContent=labels[activeClockTz];
}
updateUTCClock();setInterval(updateUTCClock,10000);

// === Unified header panel management (same pattern as notifCenter) ===
const ALL_PANELS=['notifCenter','clockPanel','timerPanel','sharePanel'];
function closeAllPanels(except){
  ALL_PANELS.forEach(id=>{if(id!==except)document.getElementById(id).classList.remove('visible');});
}
document.addEventListener('click',e=>{
  ALL_PANELS.forEach(id=>{
    const panel=document.getElementById(id);
    const toggleId=id==='notifCenter'?'notifToggle':id==='clockPanel'?'utcToggle':id==='timerPanel'?'timerToggle':'shareToggle';
    if(!e.target.closest('#'+id)&&!e.target.closest('#'+toggleId))panel.classList.remove('visible');
  });
});

document.getElementById('utcToggle').addEventListener('click',()=>{
  closeAllPanels('clockPanel');
  document.getElementById('clockPanel').classList.toggle('visible');
});
document.getElementById('clockPanel').addEventListener('click',e=>{
  const opt=e.target.closest('.clock-option');if(!opt)return;
  activeClockTz=opt.dataset.tz;
  document.querySelectorAll('.clock-option').forEach(o=>o.classList.toggle('active',o===opt));
  updateUTCClock();
});

// === Timer ===
let timerEndTime=null,timerInterval=null,timerTotalSec=0;
const timerBtn=document.getElementById('timerToggle');
const timerLabel=document.getElementById('timerLabel');
const timerDisplay=document.getElementById('timerDisplay');

document.getElementById('timerToggle').addEventListener('click',()=>{
  closeAllPanels('timerPanel');
  document.getElementById('timerPanel').classList.toggle('visible');
});

// Presets
document.querySelectorAll('.timer-preset').forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    document.querySelectorAll('.timer-preset').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    timerTotalSec=parseInt(btn.dataset.sec);
    const picker=document.getElementById('timerPicker');
    const h=Math.floor(timerTotalSec/3600),m=Math.floor((timerTotalSec%3600)/60);
    picker.value=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
    updateTimerDisplay(timerTotalSec);
  });
});

// iOS wheel picker (type="time" triggers native wheel on iOS)
const timerPicker=document.getElementById('timerPicker');
['change','input'].forEach(evt=>{
  timerPicker.addEventListener(evt,function(){
    document.querySelectorAll('.timer-preset').forEach(b=>b.classList.remove('active'));
    const parts=this.value.split(':');
    timerTotalSec=(parseInt(parts[0])||0)*3600+(parseInt(parts[1])||0)*60;
    updateTimerDisplay(timerTotalSec);
  });
});

function updateTimerDisplay(sec){
  timerDisplay.textContent=fmtTimerFull(sec);
}

document.getElementById('timerStart').addEventListener('click',e=>{
  e.stopPropagation();
  if(timerTotalSec<=0)return;
  timerEndTime=Date.now()+timerTotalSec*1000;
  timerBtn.classList.add('running');timerBtn.classList.remove('expired');
  timerLabel.style.display='';
  document.getElementById('timerStart').style.display='none';
  document.getElementById('timerStop').style.display='';
  document.getElementById('timerReset').style.display='';
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=setInterval(tickTimer,500);
  tickTimer();
});

document.getElementById('timerStop').addEventListener('click',e=>{
  e.stopPropagation();
  clearInterval(timerInterval);timerInterval=null;
  timerBtn.classList.remove('running');
  document.getElementById('timerStart').style.display='';
  document.getElementById('timerStop').style.display='none';
  const remaining=Math.max(0,Math.round((timerEndTime-Date.now())/1000));
  timerTotalSec=remaining;timerEndTime=null;
});

document.getElementById('timerReset').addEventListener('click',e=>{
  e.stopPropagation();
  clearInterval(timerInterval);timerInterval=null;timerEndTime=null;timerTotalSec=0;
  timerBtn.classList.remove('running','expired');
  timerLabel.style.display='none';timerLabel.textContent='';
  timerDisplay.textContent='00:00';
  document.getElementById('timerStart').style.display='';
  document.getElementById('timerStop').style.display='none';
  document.getElementById('timerReset').style.display='none';
  document.querySelectorAll('.timer-preset').forEach(b=>b.classList.remove('active'));
});

function fmtTimerFull(sec){
  const abs=Math.abs(sec);
  const h=Math.floor(abs/3600),m=Math.floor((abs%3600)/60),s=abs%60;
  const sign=sec<0?'-':'';
  return sign+(h>0?h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'));
}
function fmtTimerPill(sec){
  const abs=Math.abs(sec);
  const h=Math.floor(abs/3600),m=Math.floor((abs%3600)/60),s=abs%60;
  // >1h show HH:MM, <1h show MM:SS
  if(h>0)return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function tickTimer(){
  if(!timerEndTime)return;
  const remaining=Math.max(0,Math.round((timerEndTime-Date.now())/1000));
  timerLabel.textContent=fmtTimerPill(remaining);
  updateTimerDisplay(remaining);
  if(remaining<=0&&!timerBtn.classList.contains('expired')){
    // Stop the timer — keep displaying 00:00
    clearInterval(timerInterval);timerInterval=null;
    timerBtn.classList.remove('running');timerBtn.classList.add('expired');
    timerEndTime=null;timerTotalSec=0;
    timerLabel.textContent='00:00';timerLabel.style.display='';
    updateTimerDisplay(0);
    document.getElementById('timerStop').style.display='none';
    document.getElementById('timerStart').style.display='none';
    document.getElementById('timerReset').style.display='';
    addNotification('Minuteur terminé','Le minuteur est arrivé à zéro.','alert');
  }
}

// Header date (28MAR26 format)
(function(){const d=new Date();const m=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];document.getElementById('headerDate').textContent=String(d.getDate()).padStart(2,'0')+m[d.getMonth()]+String(d.getFullYear()).slice(-2);})();
buildBriefing();buildCabinPlan();cacheFilterBadges();cacheTotalSeats();buildPaxList();buildMeals();buildTimeline();buildChecklists();buildReport();updateClocks();updateAppBadge();renderNotifCenter();updateNotifBadge();

// Notification permission prompt on launch
(function(){
  if(!('Notification' in window))return; // no support
  if(Notification.permission!=='default')return; // already granted or denied
  if(localStorage.getItem('cabin_notif_prompt_dismissed'))return; // user said "later"
  setTimeout(()=>{
    document.getElementById('notifPromptOverlay').classList.add('visible');
  },1500);
  document.getElementById('notifPromptAllow').addEventListener('click',()=>{
    document.getElementById('notifPromptOverlay').classList.remove('visible');
    Notification.requestPermission();
  });
  document.getElementById('notifPromptLater').addEventListener('click',()=>{
    document.getElementById('notifPromptOverlay').classList.remove('visible');
    localStorage.setItem('cabin_notif_prompt_dismissed','1');
  });
})();

// Standalone vs browser detection
(function(){
  var isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  document.documentElement.setAttribute('data-mode', isStandalone ? 'standalone' : 'browser');
  if (!isStandalone) {
    var bar = document.createElement('div');
    bar.id = 'installBanner';
    bar.innerHTML = '<span>Installez CabinReady : appuyez sur <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="vertical-align:-2px;margin:0 2px"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> puis <b>Sur l\u2019\u00e9cran d\u2019accueil</b></span>' +
      '<button id="installBannerClose">\u00d7</button>';
    document.body.prepend(bar);
    document.getElementById('installBannerClose').addEventListener('click', function() {
      bar.remove();
    });
  }
})();
