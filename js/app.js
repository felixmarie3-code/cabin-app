// === Splash Screen ===
(function() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const splashBg = document.getElementById('splash-bg');
  const splashPlane = document.getElementById('splash-plane');
  const splashBrand = document.getElementById('splash-brand');

  const BRAND_PAUSE = 3000;   // 3s brand visible
  const RISE_DURATION = 2800; // 2.8s plane traversal
  const FADE_IN = 600;        // plane fade-in ms

  // Wing geometry ratios (from SVG viewBox 200x220)
  // Wing trailing edge at fuselage: y=106 → 106/220 = 0.482
  // Wing trailing edge at tips:     y=122 → 122/220 = 0.555
  var WING_CENTER = 0.482;
  var WING_TIP = 0.555;

  // Park plane below viewport (translate3d for GPU compositing)
  splashPlane.style.transform = 'translate3d(0,' + (window.innerHeight + 60) + 'px,0)';

  setTimeout(function() {
    // Measure plane height after layout
    splashPlane.style.opacity = '1';
    splashPlane.style.transition = 'opacity ' + FADE_IN + 'ms ease-out';
    var planeH = splashPlane.getBoundingClientRect().height || window.innerHeight * 0.9;
    var vh = window.innerHeight;
    var startY = vh + 60;
    var endY = -(planeH + 60);
    var brandFaded = false;
    var startTime = performance.now();

    function frame(now) {
      var elapsed = now - startTime;
      var raw = Math.min(elapsed / RISE_DURATION, 1);
      // Ease-out cubic (smooth deceleration)
      var eased = 1 - Math.pow(1 - raw, 3);
      var curY = startY + (endY - startY) * eased;
      splashPlane.style.transform = 'translate3d(0,' + curY + 'px,0)';

      // Clip at wing trailing edge level (plane body hides the boundary)
      var centerPct = ((curY + planeH * WING_CENTER) / vh) * 100;
      var edgePct = ((curY + planeH * WING_TIP) / vh) * 100;
      var cY = Math.max(-5, Math.min(105, centerPct));
      var eY = Math.max(-5, Math.min(105, edgePct));
      // Simplified 7-point polygon following wing sweep
      var mid = eY - (eY - cY) * 0.55;
      splashBg.style.clipPath = 'polygon(' +
        '0% 0%,100% 0%,' +
        '100% ' + eY + '%,' +
        '75% ' + mid + '%,' +
        '50% ' + cY + '%,' +
        '25% ' + mid + '%,' +
        '0% ' + eY + '%)';

      // Brand is inside splash-bg, so it gets clipped with it automatically
      if (raw < 1) {
        requestAnimationFrame(frame);
      } else {
        splash.remove();
      }
    }
    requestAnimationFrame(frame);
  }, BRAND_PAUSE);

  // Fallback
  setTimeout(function() { if (splash.parentNode) splash.remove(); }, BRAND_PAUSE + RISE_DURATION + 1000);
})();

// === Service Worker Registration ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.error('SW error:', err));
}

// === Theme Toggle ===
const savedTheme = localStorage.getItem('cabin_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cabin_theme', next);
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
function lsSet(k,v){localStorage.setItem(k,JSON.stringify(v));}
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
  // Align line through dot centers after render
  requestAnimationFrame(()=>{
    const firstDot=fp.querySelector('.fp-dot');
    if(firstDot&&line){
      const fpRect=fp.getBoundingClientRect();
      const dotRect=firstDot.getBoundingClientRect();
      line.style.top=(dotRect.top-fpRect.top+dotRect.height/2-1)+'px';
    }
  });

  // Crew — sorted by assigned door
  const crewEl=el('briefCrew');crewEl.textContent='';
  const doorOrder={'G':0,'D':1};
  const sortedCrew=[...CREW].sort((a,b)=>{
    const da=doorAssignments[a.name]||a.door;
    const db=doorAssignments[b.name]||b.door;
    const na=parseInt(da),nb=parseInt(db);
    if(na!==nb)return na-nb;
    return (doorOrder[da.slice(-1)]||0)-(doorOrder[db.slice(-1)]||0);
  });
  sortedCrew.forEach(c=>{
    const row=document.createElement('div');row.className='crew-member';
    const av=document.createElement('div');av.className='crew-avatar '+c.rankCls;
    av.textContent=c.trigramme;
    const info=document.createElement('div');info.className='crew-info';
    const nm=document.createElement('div');nm.className='crew-name';nm.textContent=c.name;
    const rl=document.createElement('div');rl.className='crew-role';rl.textContent=c.rank;
    info.appendChild(nm);info.appendChild(rl);
    const saved=doorAssignments[c.name];
    const door=(saved&&DOORS.includes(saved))?saved:c.door;
    const doorEl=document.createElement('div');doorEl.className='crew-door';doorEl.textContent=door;
    row.appendChild(av);row.appendChild(info);row.appendChild(doorEl);
    row.addEventListener('click',()=>showCrewDetail(c));
    crewEl.appendChild(row);
  });

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
  notesEl.addEventListener('input',()=>localStorage.setItem('cabin_briefing_notes',notesEl.value));
}

// Door assignment modal — mini cabin plan with doors on each side
document.getElementById('assignDoorsBtn').addEventListener('click',()=>{
  const grid=document.getElementById('doorGrid');grid.textContent='';
  // Doors are paired: 1G/1D, 2G/2D, 3G/3D, 4G/4D — displayed top to bottom
  const pairs=[['1G','1D'],['2G','2D'],['3G','3D'],['4G','4D']];
  const sectionLabels={0:'BUSINESS',1:'PREMIUM',2:'ECONOMY AV.',3:'ECONOMY ARR.'};
  pairs.forEach(([doorG,doorD],idx)=>{
    // Section label
    if(sectionLabels[idx]){const lbl=document.createElement('div');lbl.className='door-pair-label';lbl.textContent=sectionLabels[idx];grid.appendChild(lbl);}
    const row=document.createElement('div');row.className='door-row';
    // Left door (Gauche)
    const slotG=buildDoorSlot(doorG);
    // Label
    const rlbl=document.createElement('div');rlbl.className='door-row-label';rlbl.textContent='Porte '+String(idx+1);
    // Right door (Droite)
    const slotD=buildDoorSlot(doorD);
    row.appendChild(slotG);row.appendChild(rlbl);row.appendChild(slotD);
    grid.appendChild(row);
  });
  document.getElementById('doorOverlay').classList.add('visible');
  setTimeout(validateDoorAssignments,0);
});
function buildDoorSlot(doorName){
  const slot=document.createElement('div');slot.className='door-slot';
  const label=document.createElement('div');label.style.cssText='font-size:9px;color:var(--text-muted);letter-spacing:0.3px;';label.textContent=doorName;
  const sel=document.createElement('select');sel.className='door-assign-select';sel.dataset.door=doorName;
  const emptyOpt=document.createElement('option');emptyOpt.value='';emptyOpt.textContent='— Libre —';sel.appendChild(emptyOpt);
  CREW.forEach(c=>{
    const o=document.createElement('option');o.value=c.name;
    o.textContent=c.trigramme+' — '+c.rank;
    sel.appendChild(o);
  });
  // Find who's assigned to this door
  const assigned=Object.entries(doorAssignments).find(([,d])=>d===doorName);
  if(assigned)sel.value=assigned[0];
  else{const def=CREW.find(c=>c.door===doorName);if(def)sel.value=def.name;}
  if(sel.value)slot.classList.add('assigned');
  sel.addEventListener('change',()=>{slot.classList.toggle('assigned',!!sel.value);validateDoorAssignments();});
  slot.appendChild(label);slot.appendChild(sel);
  return slot;
}
document.getElementById('doorClose').addEventListener('click',()=>document.getElementById('doorOverlay').classList.remove('visible'));
document.getElementById('doorOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)document.getElementById('doorOverlay').classList.remove('visible');});
// Validate door assignments in real-time
function validateDoorAssignments(){
  const warn=document.getElementById('doorWarning');
  const selects=document.querySelectorAll('#doorGrid .door-assign-select');
  const issues=[];
  // Check unassigned doors
  const unassigned=[];
  selects.forEach(s=>{if(!s.value)unassigned.push(s.dataset.door);});
  if(unassigned.length)issues.push('Portes non assignées : '+unassigned.join(', '));
  // Check duplicates
  const crewCount={};
  selects.forEach(s=>{if(s.value){crewCount[s.value]=(crewCount[s.value]||0)+1;}});
  Object.entries(crewCount).forEach(([name,count])=>{
    if(count>1){const c=CREW.find(cr=>cr.name===name);issues.push((c?c.trigramme:name)+' assigné(e) à '+count+' portes');}
  });
  // Check unassigned crew
  const assignedNames=new Set();selects.forEach(s=>{if(s.value)assignedNames.add(s.value);});
  const unassignedCrew=CREW.filter(c=>!assignedNames.has(c.name));
  if(unassignedCrew.length)issues.push('PN non assignés : '+unassignedCrew.map(c=>c.trigramme).join(', '));
  if(issues.length){warn.textContent=issues.join(' · ');warn.style.display='';}
  else{warn.style.display='none';warn.textContent='';}
}

document.getElementById('doorSave').addEventListener('click',()=>{
  // Read all selects BEFORE closing overlay
  const selects=Array.from(document.querySelectorAll('#doorGrid .door-assign-select'));
  const newAssign={};
  selects.forEach(s=>{
    const crewName=s.value;const door=s.dataset.door;
    if(crewName&&door)newAssign[crewName]=door;
  });
  // Replace doorAssignments
  Object.keys(doorAssignments).forEach(k=>delete doorAssignments[k]);
  Object.assign(doorAssignments,newAssign);
  lsSet('cabin_doors',doorAssignments);
  // Close overlay and rebuild
  document.getElementById('doorOverlay').classList.remove('visible');
  buildBriefing();buildCabinPlan();
});

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
    subs: {
      'Bienvenue \u00e0 bord': [
        'FR \u2014 Mesdames et Messieurs, bienvenue \u00e0 bord de ce vol CORSAIR SS 901 \u00e0 destination de La R\u00e9union. Notre temps de vol pr\u00e9vu est de 11 heures et 15 minutes.',
        'EN \u2014 Ladies and Gentlemen, welcome aboard this CORSAIR flight SS 901 to R\u00e9union Island. Our estimated flight time is 11 hours and 15 minutes.',
        'D\u00e9mo s\u00e9curit\u00e9 / vid\u00e9o lanc\u00e9e'
      ],
      'Service en vol': [
        'FR \u2014 Nous allons proc\u00e9der au service des boissons suivi du repas. N\'h\u00e9sitez pas \u00e0 solliciter notre \u00e9quipage.',
        'EN \u2014 We will now begin our beverage and meal service. Please do not hesitate to call our crew.',
        'FR \u2014 La vente \u00e0 bord est disponible. D\u00e9couvrez notre catalogue duty-free CORSAIR.',
        'EN \u2014 Our onboard duty-free shop is now open. Please browse our CORSAIR catalog.'
      ],
      'Pr\u00e9paration arriv\u00e9e': [
        'FR \u2014 Mesdames et Messieurs, nous commen\u00e7ons notre descente vers La R\u00e9union. Veuillez regagner votre si\u00e8ge et attacher votre ceinture.',
        'EN \u2014 Ladies and Gentlemen, we are beginning our descent into R\u00e9union. Please return to your seat and fasten your seatbelt.',
        'FR \u2014 La temp\u00e9rature au sol est de 28 degr\u00e9s. L\'heure locale est [heure]. Nous esp\u00e9rons que vous avez pass\u00e9 un agr\u00e9able voyage.',
        'EN \u2014 The local temperature is 28 degrees. Local time is [time]. We hope you enjoyed your flight with CORSAIR.'
      ]
    }
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
    const tile=document.createElement('div');tile.className='cl-tile';
    // Header: icon + title + badge
    const header=document.createElement('div');header.className='cl-tile-header';
    const icon=document.createElement('div');icon.className='cl-tile-icon';icon.innerHTML=cat.icon;
    const title=document.createElement('div');title.className='cl-tile-title';title.textContent=catName;
    // Count total for this category
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
    // Sub-items as list rows
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
document.getElementById('checklistBack').addEventListener('click',()=>{document.getElementById('checklistTiles').style.display='';document.getElementById('checklistDetail').style.display='none';});

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
  const notesEl=document.getElementById('reportNotes');notesEl.value=localStorage.getItem('cabin_report_notes')||'';notesEl.addEventListener('input',()=>localStorage.setItem('cabin_report_notes',notesEl.value));
}
document.getElementById('addIncidentBtn').addEventListener('click',()=>document.getElementById('incidentOverlay').classList.add('visible'));
document.getElementById('incidentClose').addEventListener('click',()=>document.getElementById('incidentOverlay').classList.remove('visible'));
document.getElementById('incidentOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)document.getElementById('incidentOverlay').classList.remove('visible');});
document.getElementById('severityBtns').addEventListener('click',e=>{const b=e.target.closest('.sev-btn');if(!b)return;document.querySelectorAll('.sev-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');});
document.getElementById('incidentSave').addEventListener('click',()=>{const desc=document.getElementById('incidentDesc').value.trim();if(!desc)return;const now=new Date();const sev=document.querySelector('.sev-btn.active');
  incidents.push({time:fmt(now),type:document.getElementById('incidentType').value,seat:document.getElementById('incidentSeat').value.trim(),desc,severity:sev?sev.dataset.sev:'low'});lsSet('cabin_incidents',incidents);
  document.getElementById('incidentDesc').value='';document.getElementById('incidentSeat').value='';document.getElementById('incidentOverlay').classList.remove('visible');buildReport();updateAppBadge();});

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
