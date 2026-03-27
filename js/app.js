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
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cabin_theme', next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (theme === 'light') {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

// === Notification Test ===
document.getElementById('notifTestBtn').addEventListener('click', function() {
  const btn = this;
  btn.disabled = true;
  const originalText = btn.querySelector('svg').nextSibling;
  let countdown = 5;
  btn.childNodes[btn.childNodes.length - 1].textContent = ' Envoi dans ' + countdown + 's...';
  const timer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      btn.childNodes[btn.childNodes.length - 1].textContent = ' Envoi dans ' + countdown + 's...';
    } else {
      clearInterval(timer);
      triggerNotification();
      btn.childNodes[btn.childNodes.length - 1].textContent = ' Notification envoyee !';
      setTimeout(() => {
        btn.disabled = false;
        btn.childNodes[btn.childNodes.length - 1].textContent = ' Tester une notification';
      }, 2000);
    }
  }, 1000);
});

function triggerNotification() {
  if (!('Notification' in window)) { alert('Notifications non supportees sur ce navigateur.'); return; }
  if (Notification.permission === 'granted') {
    new Notification('CORSAIR Cabin — SS 901', {
      body: 'Passager 22K — MARTIN Thomas demande une assistance medicale en Economy. Verifiez la trousse de premiers secours.',
      icon: 'icons/icon-192.svg',
      tag: 'cabin-test'
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        new Notification('CORSAIR Cabin — SS 901', {
          body: 'Passager 22K — MARTIN Thomas demande une assistance medicale en Economy. Verifiez la trousse de premiers secours.',
          icon: 'icons/icon-192.svg',
          tag: 'cabin-test'
        });
      }
    });
  }
}

// === Tab Navigation ===
document.getElementById('tabBar').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.module').forEach(m => {
    m.classList.toggle('active', m.id === 'mod-' + tab.dataset.module);
  });
});

// === Persistence helpers ===
function lsGet(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch { return def; } }
function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

let bookmarks = lsGet('cabin_bookmarks', {});
let notes = lsGet('cabin_notes', {});
let milestoneChecks = lsGet('cabin_otp_checks', {});
let checklistState = lsGet('cabin_checklist', {});
let incidents = lsGet('cabin_incidents', []);
let cabinZones = lsGet('cabin_zones', {});
let serviceState = lsGet('cabin_services', { s1: {}, s2: {} });

// ============================================================
// CABIN CONFIG — CORSAIR B787-9
// ============================================================
const CABIN_CONFIG = {
  business: { label: 'Business', cls: 'business', rows: [1,2,3,4,5,6,7,8],
    layout: ['K','.','.','|','.','F','E','|','.','.','A'] },
  premium: { label: 'Premium', cls: 'premium', rows: [9,10,11,12,13,14],
    layout: ['K','J','.','|','F','E','D','|','.','B','A'] },
  economy_front: { label: 'Economy', cls: 'economy', rows: [15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],
    layout: ['K','J','H','|','F','E','D','|','C','B','A'] },
  economy_rear: { label: '', cls: 'economy', rows: [30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47],
    layout: ['K','J','H','|','F','E','D','|','C','B','A'] }
};
const ALL_POSITIONS = ['K','J','H','|','F','E','D','|','C','B','A'];
const EXIT_ROWS = [1,9,15,30,46];
const GALLEY_AFTER = { business: 'GAL', economy_front: 'GAL/LAV' };

// ============================================================
// MOCK PASSENGERS
// ============================================================
function generateMockPassengers() {
  const fn = ['Marie','Thomas','Camille','Lucas','Lea','Hugo','Manon','Louis','Chloe','Nathan',
    'Emma','Raphael','Sarah','Jules','Ines','Arthur','Jade','Adam','Lola','Gabriel',
    'Alice','Paul','Louise','Noel','Fatima','Jean-Pierre','Aisha','Ravi','Chen','Yuki','Sophie'];
  const ln = ['MARTIN','BERNARD','DUBOIS','THOMAS','ROBERT','PETIT','DURAND','MOREAU','LAURENT',
    'SIMON','MICHEL','GARCIA','ROUX','LEROY','FONTAINE','CHEVALIER','BOYER','BLANC',
    'NAIR','WONG','SUZUKI','PAYET','HOARAU','RIVIERE','GRONDIN','DIJOUX','CADET','MAILLOT'];
  const meals = ['','','','','','VGML','VLML','HNML','DBML','CHML','AVML','KSML'];
  const remarks = ['','','','','','','','UM','WCHR','DEAF','BLND','PETC','VIP','MAAS'];
  const nats = ['FR','FR','FR','FR','RE','RE','MU','MG','IN','CN','JP','GB','DE','US'];
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const pass = {};
  const allSeats = [];
  Object.values(CABIN_CONFIG).forEach(s => s.rows.forEach(r => s.layout.forEach(p => {
    if (p !== '.' && p !== '|') allSeats.push({ seat: r+p, cls: s.cls });
  })));
  const shuffled = allSeats.sort(() => Math.random()-0.5).slice(0, Math.floor(allSeats.length*0.82));
  shuffled.forEach(({seat,cls}) => {
    let pnr=''; for(let i=0;i<6;i++) pnr+=abc[Math.floor(Math.random()*abc.length)];
    pass[seat] = {
      name: ln[Math.floor(Math.random()*ln.length)]+' '+fn[Math.floor(Math.random()*fn.length)],
      pnr, class: cls,
      meal: meals[Math.floor(Math.random()*meals.length)],
      remark: remarks[Math.floor(Math.random()*remarks.length)],
      nationality: nats[Math.floor(Math.random()*nats.length)],
      checkedIn: Math.random()>0.08, boarded: Math.random()>0.15,
      bags: Math.floor(Math.random()*3), infant: Math.random()>0.95,
      ffn: Math.random()>0.7 ? 'SS'+String(Math.floor(Math.random()*9000000+1000000)) : ''
    };
  });
  return pass;
}
const passengers = generateMockPassengers();

// ============================================================
// BRIEFING
// ============================================================
function buildBriefing() {
  // Pax counts
  let biz=0, prem=0, eco=0;
  Object.values(passengers).forEach(p => {
    if (p.class==='business') biz++; else if (p.class==='premium') prem++; else eco++;
  });
  const total = biz+prem+eco;
  const el = id => document.getElementById(id);
  el('briefPaxTotal').textContent = total;
  el('briefPaxBiz').textContent = biz;
  el('briefPaxPrem').textContent = prem;
  el('briefPaxEco').textContent = eco;

  // Load bar
  const allSeats = []; Object.values(CABIN_CONFIG).forEach(s => s.rows.forEach(r => s.layout.forEach(p => { if(p!=='.'&&p!=='|') allSeats.push(1); })));
  const pct = Math.round(total/allSeats.length*100);
  const bar = el('briefLoadBar');
  bar.textContent = '';
  const fill = document.createElement('div');
  fill.className = 'brief-bar-fill';
  fill.style.width = pct+'%';
  fill.style.background = pct>90 ? '#4ade80' : pct>70 ? 'var(--corsair-bleu-economie)' : '#fbbf24';
  bar.appendChild(fill);

  // Crew
  const crew = [
    { name: 'LEFEBVRE Sophie', role: 'CCP', rank: 'ccp' },
    { name: 'DUPONT Marc', role: 'CC1 — Business', rank: 'cc' },
    { name: 'PAYET Nathalie', role: 'CC2 — Premium', rank: 'cc' },
    { name: 'HOARAU Kevin', role: 'CC3 — Eco avant', rank: 'cc' },
    { name: 'MARTIN Julie', role: 'CC4 — Eco centre', rank: 'cc' },
    { name: 'RIVIERE Paul', role: 'CC5 — Eco arriere', rank: 'cc' },
    { name: 'GRONDIN Lea', role: 'CC6 — Eco arriere', rank: 'cc' },
    { name: 'DIJOUX Sarah', role: 'CC7 — Galley', rank: 'cc' }
  ];
  const crewEl = el('briefCrew');
  crewEl.textContent = '';
  crew.forEach(c => {
    const row = document.createElement('div'); row.className = 'crew-member';
    const av = document.createElement('div'); av.className = 'crew-avatar '+c.rank;
    av.textContent = c.name.split(' ').map(w=>w[0]).join('');
    const info = document.createElement('div');
    const nm = document.createElement('div'); nm.className = 'crew-name'; nm.textContent = c.name;
    const rl = document.createElement('div'); rl.className = 'crew-role'; rl.textContent = c.role;
    info.appendChild(nm); info.appendChild(rl);
    row.appendChild(av); row.appendChild(info); crewEl.appendChild(row);
  });

  // Alerts
  const alerts = el('briefAlerts');
  alerts.textContent = '';
  const alertData = [];
  Object.entries(passengers).forEach(([seat,p]) => {
    if (p.remark==='UM') alertData.push({ seat, text: p.name+' — Mineur non accompagne', type: 'warn', tag: 'UM' });
    if (p.remark==='WCHR') alertData.push({ seat, text: p.name+' — Fauteuil roulant', type: 'info', tag: 'WCHR' });
    if (p.remark==='VIP') alertData.push({ seat, text: p.name+' — Passager VIP', type: 'info', tag: 'VIP' });
    if (p.remark==='DEAF'||p.remark==='BLND') alertData.push({ seat, text: p.name+' — '+p.remark, type: 'warn', tag: p.remark });
    if (p.infant) alertData.push({ seat, text: p.name+' — Nourrisson a bord', type: 'warn', tag: 'INF' });
    if (!p.boarded) alertData.push({ seat, text: p.name+' — Non embarque', type: 'critical', tag: 'MANQ' });
  });
  alertData.sort((a,b) => { const o = {critical:0,warn:1,info:2}; return (o[a.type]||3)-(o[b.type]||3); });
  alertData.slice(0, 20).forEach(a => {
    const row = document.createElement('div'); row.className = 'brief-alert '+a.type;
    const s = document.createElement('span'); s.className = 'brief-alert-seat'; s.textContent = a.seat;
    const t = document.createElement('span'); t.className = 'brief-alert-text'; t.textContent = a.text;
    const tag = document.createElement('span'); tag.className = 'brief-alert-tag'; tag.textContent = a.tag;
    row.appendChild(s); row.appendChild(t); row.appendChild(tag); alerts.appendChild(row);
  });

  // Briefing notes persistence
  const notesEl = el('briefingNotes');
  notesEl.value = localStorage.getItem('cabin_briefing_notes') || '';
  notesEl.addEventListener('input', () => localStorage.setItem('cabin_briefing_notes', notesEl.value));
}

// ============================================================
// BUILD CABIN PLAN
// ============================================================
let activeFilter = 'all', searchQuery = '';

function buildCabinPlan() {
  const container = document.getElementById('cabinPlan');
  container.textContent = '';
  const labelsCol = document.createElement('div'); labelsCol.className = 'row-labels';
  ALL_POSITIONS.forEach(pos => {
    const l = document.createElement('div');
    if(pos==='|'){l.className='row-label aisle-gap';}else{l.className='row-label';l.textContent=pos;}
    labelsCol.appendChild(l);
  });
  const ns = document.createElement('div'); ns.className='row-label'; ns.style.height='16px'; labelsCol.appendChild(ns);
  container.appendChild(labelsCol);

  const sections = ['business','premium','economy_front','economy_rear'];
  sections.forEach((sk,si) => {
    const cfg = CABIN_CONFIG[sk];
    if(si>0){
      const prevKey = sections[si-1];
      if(GALLEY_AFTER[prevKey]){
        const g = document.createElement('div'); g.className='galley-col';
        const ic = document.createElementNS('http://www.w3.org/2000/svg','svg');
        ic.setAttribute('viewBox','0 0 24 24'); ic.setAttribute('class','galley-icon');
        const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
        r.setAttribute('x','4');r.setAttribute('y','2');r.setAttribute('width','16');r.setAttribute('height','20');r.setAttribute('rx','2');
        ic.appendChild(r); g.appendChild(ic);
        const lb = document.createElement('div'); lb.className='galley-label'; lb.textContent=GALLEY_AFTER[prevKey]; g.appendChild(lb);
        container.appendChild(g);
      } else {
        const d = document.createElement('div'); d.className='section-divider'; container.appendChild(d);
      }
    }
    const sec = document.createElement('div'); sec.className='cabin-section';
    const sl = document.createElement('div'); sl.className='section-label '+cfg.cls; sl.textContent=cfg.label; sec.appendChild(sl);
    const cols = document.createElement('div'); cols.className='cabin-columns';
    cfg.rows.forEach(rn => {
      const col = document.createElement('div'); col.className='cabin-col';
      if(EXIT_ROWS.includes(rn)) col.classList.add('exit-row');
      cfg.layout.forEach(pos => {
        if(pos==='|'){const a=document.createElement('div');a.className='aisle';col.appendChild(a);}
        else if(pos==='.'){const n=document.createElement('div');n.className='seat no-seat';col.appendChild(n);}
        else {
          const sid=rn+pos, se=document.createElement('div'); se.className='seat'; se.dataset.seat=sid; se.textContent=pos;
          const pax=passengers[sid];
          if(pax){se.classList.add('occupied',cfg.cls); if(pax.meal)se.classList.add('special-meal'); if(pax.remark==='WCHR')se.classList.add('wheelchair'); if(pax.remark==='UM')se.classList.add('um');}
          else se.classList.add('empty');
          if(bookmarks[sid])se.classList.add('bookmarked');
          se.addEventListener('click',ev=>{ev.stopPropagation();openPaxPanel(sid,cfg.cls);});
          col.appendChild(se);
        }
      });
      const rne=document.createElement('div'); rne.className='row-num'; rne.textContent=rn;
      rne.style.cssText='height:16px;display:flex;align-items:center;justify-content:center';
      col.appendChild(rne); cols.appendChild(col);
    });
    sec.appendChild(cols); container.appendChild(sec);
  });
  applyFilters(); updateStats();
}

// Filters
document.getElementById('filters').addEventListener('click',e=>{
  const b=e.target.closest('.filter-btn'); if(!b)return;
  document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); activeFilter=b.dataset.filter; applyFilters();
});
document.getElementById('searchInput').addEventListener('input',e=>{searchQuery=e.target.value.toLowerCase().trim();applyFilters();});

function applyFilters(){
  const has=activeFilter!=='all'||searchQuery.length>0;
  document.querySelectorAll('.seat:not(.no-seat)').forEach(el=>{
    const sid=el.dataset.seat, pax=passengers[sid]; let m=true;
    if(activeFilter==='occupied')m=!!pax;
    else if(activeFilter==='empty')m=!pax;
    else if(activeFilter==='special-meal')m=pax&&pax.meal;
    else if(activeFilter==='um')m=pax&&pax.remark==='UM';
    else if(activeFilter==='wchr')m=pax&&pax.remark==='WCHR';
    else if(activeFilter==='not-boarded')m=pax&&!pax.boarded;
    else if(activeFilter==='bookmarked')m=!!bookmarks[sid];
    if(searchQuery&&m){
      if(pax){m=(pax.name+' '+pax.pnr+' '+sid+' '+pax.remark+' '+pax.meal).toLowerCase().includes(searchQuery);}
      else m=sid.toLowerCase().includes(searchQuery);
    }
    el.classList.toggle('dimmed',has&&!m);
    el.classList.toggle('highlighted',has&&m&&(activeFilter!=='all'||searchQuery));
  });
}

// Stats
function updateStats(){
  const se=document.getElementById('cabinStats'); se.textContent='';
  const biz=document.querySelectorAll('.seat.occupied.business').length;
  const prem=document.querySelectorAll('.seat.occupied.premium').length;
  const eco=document.querySelectorAll('.seat.occupied.economy').length;
  const total=document.querySelectorAll('.seat:not(.no-seat)').length;
  const occ=biz+prem+eco, pct=Math.round(occ/total*100);
  const sm=document.querySelectorAll('.seat.special-meal').length;
  [{v:pct+'%',l:'Remplissage'},null,{v:''+biz,l:'Business'},null,{v:''+prem,l:'Premium'},null,{v:''+eco,l:'Economy'},null,{v:''+sm,l:'Repas spe.'},null,{v:''+Object.keys(bookmarks).length,l:'Marques'}].forEach(i=>{
    if(!i){const d=document.createElement('div');d.className='stat-divider';se.appendChild(d);return;}
    const si=document.createElement('div');si.className='stat-item';const w=document.createElement('div');
    const v=document.createElement('div');v.className='stat-value';v.textContent=i.v;
    const l=document.createElement('div');l.className='stat-label';l.textContent=i.l;
    w.appendChild(v);w.appendChild(l);si.appendChild(w);se.appendChild(si);
  });
}

// ============================================================
// PAX DETAIL PANEL
// ============================================================
let currentPanelSeat = null;
function openPaxPanel(seatId, secCls){
  currentPanelSeat=seatId; const pax=passengers[seatId];
  const badge=document.getElementById('panelSeatBadge');
  badge.textContent=seatId; badge.className='pax-seat-badge '+(pax?secCls:'empty-seat');
  document.getElementById('panelName').textContent=pax?pax.name:'Siege libre';
  document.getElementById('panelClass').textContent=pax?(secCls+(pax.ffn?' | FFN '+pax.ffn:'')):secCls;
  document.getElementById('panelBookmark').style.display=pax?'':'none';
  const grid=document.getElementById('panelGrid'); grid.textContent='';
  if(pax){
    [{l:'PNR',v:pax.pnr},{l:'Nationalite',v:pax.nationality},
     {l:'Embarquement',v:pax.boarded?'A bord':'En attente',c:pax.boarded?'ok':'warn'},
     {l:'Check-in',v:pax.checkedIn?'Oui':'Non',c:pax.checkedIn?'ok':'warn'},
     {l:'Repas',v:pax.meal||'Standard'},{l:'Remarque',v:pax.remark||'Aucune',c:pax.remark?'warn':''},
     {l:'Bagages',v:pax.bags+' pcs'},{l:'Nourrisson',v:pax.infant?'Oui':'Non',c:pax.infant?'warn':''}
    ].forEach(f=>{
      const it=document.createElement('div');it.className='pax-info-item';
      const lb=document.createElement('div');lb.className='pax-info-label';lb.textContent=f.l;
      const vl=document.createElement('div');vl.className='pax-info-value'+(f.c?' '+f.c:'');vl.textContent=f.v;
      it.appendChild(lb);it.appendChild(vl);grid.appendChild(it);
    });
  }
  document.getElementById('panelBookmark').classList.toggle('bookmarked',!!bookmarks[seatId]);
  document.getElementById('panelNotes').value=notes[seatId]||'';
  [document.getElementById('panelNotes'),document.getElementById('panelSaveNote'),document.querySelector('.pax-notes-label')].forEach(e=>{if(e)e.style.display=pax?'':'none';});
  document.querySelectorAll('.seat.selected').forEach(s=>s.classList.remove('selected'));
  const se=document.querySelector('[data-seat="'+seatId+'"]'); if(se)se.classList.add('selected');
  document.getElementById('paxOverlay').classList.add('visible');
}
function closePaxPanel(){document.getElementById('paxOverlay').classList.remove('visible');document.querySelectorAll('.seat.selected').forEach(s=>s.classList.remove('selected'));currentPanelSeat=null;}
document.getElementById('panelClose').addEventListener('click',closePaxPanel);
document.getElementById('paxOverlay').addEventListener('click',e=>{if(e.target===e.currentTarget)closePaxPanel();});
document.getElementById('panelBookmark').addEventListener('click',()=>{
  if(!currentPanelSeat)return;
  if(bookmarks[currentPanelSeat])delete bookmarks[currentPanelSeat];else bookmarks[currentPanelSeat]=true;
  lsSet('cabin_bookmarks',bookmarks);
  document.getElementById('panelBookmark').classList.toggle('bookmarked',!!bookmarks[currentPanelSeat]);
  const se=document.querySelector('[data-seat="'+currentPanelSeat+'"]');if(se)se.classList.toggle('bookmarked',!!bookmarks[currentPanelSeat]);
});
document.getElementById('panelSaveNote').addEventListener('click',()=>{
  if(!currentPanelSeat)return;
  const v=document.getElementById('panelNotes').value.trim();
  if(v)notes[currentPanelSeat]=v;else delete notes[currentPanelSeat];
  lsSet('cabin_notes',notes);
  const btn=document.getElementById('panelSaveNote');btn.textContent='Enregistre !';
  setTimeout(()=>{btn.textContent='Enregistrer la note';},1500);
});

// ============================================================
// MEALS MODULE
// ============================================================
function buildMeals(){
  // Count meals by type
  const mealCounts = {};
  let specialTotal = 0;
  Object.entries(passengers).forEach(([seat,p])=>{
    const m = p.meal || 'STD';
    mealCounts[m] = (mealCounts[m]||0)+1;
    if(p.meal) specialTotal++;
  });
  document.getElementById('mealsBadge').textContent = specialTotal+' speciaux';

  // KPI row
  const row = document.getElementById('mealsCountRow'); row.textContent='';
  Object.entries(mealCounts).sort((a,b)=>b[1]-a[1]).forEach(([type,count])=>{
    const kpi=document.createElement('div');kpi.className='brief-kpi';
    const v=document.createElement('div');v.className='brief-kpi-value';v.textContent=count;
    const l=document.createElement('div');l.className='brief-kpi-label';l.textContent=type;
    kpi.appendChild(v);kpi.appendChild(l);row.appendChild(kpi);
  });

  // Special meals list
  const list=document.getElementById('mealsSpecialList');list.textContent='';
  Object.entries(passengers).filter(([,p])=>p.meal).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([seat,p])=>{
    const r=document.createElement('div');r.className='meal-special-row';
    const s=document.createElement('span');s.className='meal-seat';s.textContent=seat;
    const n=document.createElement('span');n.className='meal-name';n.textContent=p.name;
    const t=document.createElement('span');t.className='meal-type';t.textContent=p.meal;
    r.appendChild(s);r.appendChild(n);r.appendChild(t);list.appendChild(r);
  });

  // Service trackers — click to increment
  ['1','2'].forEach(svc=>{
    ['Biz','Prem','Eco'].forEach(cls=>{
      const bar=document.getElementById('svc'+svc+cls);
      const pctEl=document.getElementById('svc'+svc+cls+'Pct');
      const key=svc+'_'+cls.toLowerCase();
      const val=serviceState['s'+svc][cls.toLowerCase()]||0;
      const maxMap={Biz:document.querySelectorAll('.seat.occupied.business').length||1,
                    Prem:document.querySelectorAll('.seat.occupied.premium').length||1,
                    Eco:document.querySelectorAll('.seat.occupied.economy').length||1};
      const max=maxMap[cls];
      const pctVal=Math.min(100,Math.round(val/max*100));
      bar.style.width=pctVal+'%';
      pctEl.textContent=pctVal+'%';
      bar.addEventListener('click',()=>{
        let cur=serviceState['s'+svc][cls.toLowerCase()]||0;
        cur=Math.min(max,cur+Math.ceil(max*0.1));
        serviceState['s'+svc][cls.toLowerCase()]=cur;
        lsSet('cabin_services',serviceState);
        const p2=Math.min(100,Math.round(cur/max*100));
        bar.style.width=p2+'%'; pctEl.textContent=p2+'%';
      });
    });
  });
}

// ============================================================
// CHECKLIST MODULE
// ============================================================
const CHECKLISTS = {
  'Pre-vol — Securite cabine': [
    'Verifier les equipements de secours (gilets, masques O2)',
    'Verifier les extincteurs et leur date de validite',
    'Verifier les issues de secours et leur signalisation',
    'Verifier les toboggans (armed/disarmed)',
    'Verifier le materiel medical (trousse, defibrillateur)',
    'Verifier les ceintures et accoudoirs des sieges',
    'Verifier l\'eclairage de secours au sol',
    'Verifier les compartiments a bagages',
    'Verifier la proprete generale de la cabine'
  ],
  'Pre-depart — Avant fermeture portes': [
    'Comptage passagers effectue',
    'Bagages cabine correctement ranges',
    'Tablettes et dossiers releves',
    'Ceintures attachees verifiees',
    'Hublots ouverts',
    'Appareils electroniques en mode avion',
    'Annonce bienvenue effectuee',
    'Demo securite effectuee / video lancee',
    'Portes armees et cross-check'
  ],
  'En vol — Turbulences': [
    'Annonce ceintures attachees',
    'Service interrompu et galleys securisees',
    'Verification attache ceintures passagers',
    'Equipement galley arrime',
    'Chariots freines et bloques'
  ],
  'Post-vol — Arrivee': [
    'Annonce atterrissage et consignes',
    'Verification cabine position atterrissage',
    'Cabine securisee pour atterrissage',
    'Portes desarmees apres arret complet',
    'Assistance passagers PMR/UM',
    'Inspection finale des sieges et poches',
    'Objets trouves repertories',
    'Rapport cabine complete'
  ]
};

function buildChecklists(){
  const container=document.getElementById('checklistSections');container.textContent='';
  let totalItems=0,doneItems=0;
  Object.entries(CHECKLISTS).forEach(([title,items])=>{
    const group=document.createElement('div');group.className='checklist-group';
    const header=document.createElement('div');header.className='checklist-group-header';
    const gt=document.createElement('div');gt.className='checklist-group-title';gt.textContent=title;
    const gc=document.createElement('div');gc.className='checklist-group-count';
    const doneInGroup=items.filter((_,i)=>checklistState[title+'_'+i]).length;
    gc.textContent=doneInGroup+'/'+items.length;
    header.appendChild(gt);header.appendChild(gc);group.appendChild(header);

    const list=document.createElement('div');list.className='checklist-items';
    items.forEach((text,idx)=>{
      totalItems++;
      const key=title+'_'+idx;
      const done=!!checklistState[key];
      if(done)doneItems++;
      const item=document.createElement('div');item.className='checklist-item'+(done?' done':'');
      const check=document.createElement('div');check.className='cl-check';
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');
      const poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');poly.setAttribute('points','20 6 9 17 4 12');
      svg.appendChild(poly);check.appendChild(svg);
      const txt=document.createElement('div');txt.className='cl-text';txt.textContent=text;
      item.appendChild(check);item.appendChild(txt);
      item.addEventListener('click',()=>{
        if(checklistState[key])delete checklistState[key];else checklistState[key]=true;
        lsSet('cabin_checklist',checklistState);
        buildChecklists();
      });
      list.appendChild(item);
    });
    group.appendChild(list);container.appendChild(group);
  });
  document.getElementById('checklistBadge').textContent=doneItems+' / '+totalItems;
}

// ============================================================
// REPORT MODULE
// ============================================================
const CABIN_ZONES_LIST = [
  'Business','Premium','Economy avant','Economy centre','Economy arriere',
  'Galley avant','Galley milieu','Galley arriere',
  'Toilettes avant','Toilettes milieu','Toilettes arriere'
];

function buildReport(){
  // Cabin zones
  const grid=document.getElementById('reportCabinGrid');grid.textContent='';
  CABIN_ZONES_LIST.forEach(zone=>{
    const row=document.createElement('div');row.className='cabin-zone';
    const nm=document.createElement('div');nm.className='cabin-zone-name';nm.textContent=zone;
    const btns=document.createElement('div');btns.className='cabin-zone-status';
    ['OK','ATT','KO'].forEach((label,i)=>{
      const cls=['active-ok','active-warn','active-ko'][i];
      const btn=document.createElement('button');btn.className='zone-btn';btn.textContent=label;
      const cur=cabinZones[zone];
      if(cur===label)btn.classList.add(cls);
      btn.addEventListener('click',()=>{
        cabinZones[zone]=label;lsSet('cabin_zones',cabinZones);buildReport();
      });
      btns.appendChild(btn);
    });
    row.appendChild(nm);row.appendChild(btns);grid.appendChild(row);
  });

  // Incidents
  const list=document.getElementById('incidentsList');list.textContent='';
  incidents.forEach((inc,idx)=>{
    const row=document.createElement('div');row.className='incident-row';
    const time=document.createElement('span');time.className='incident-time';time.textContent=inc.time;
    const tag=document.createElement('span');tag.className='incident-type-tag '+inc.severity;tag.textContent=inc.type;
    const desc=document.createElement('span');desc.className='incident-desc';desc.textContent=(inc.seat?'['+inc.seat+'] ':'')+inc.desc;
    row.appendChild(time);row.appendChild(tag);row.appendChild(desc);list.appendChild(row);
  });

  // Summary
  const summary=document.getElementById('reportSummary');summary.textContent='';
  const occ=Object.keys(passengers).length;
  const boarded=Object.values(passengers).filter(p=>p.boarded).length;
  [{v:''+occ,l:'Passagers'},{v:''+boarded,l:'Embarques'},{v:''+incidents.length,l:'Incidents'},
   {v:''+Object.values(cabinZones).filter(v=>v==='OK').length+'/'+CABIN_ZONES_LIST.length,l:'Zones OK'},
   {v:''+Object.values(checklistState).filter(Boolean).length,l:'Checks faits'},
   {v:''+Object.values(passengers).filter(p=>p.meal).length,l:'Repas spe.'}
  ].forEach(s=>{
    const d=document.createElement('div');d.className='report-stat';
    const v=document.createElement('div');v.className='report-stat-value';v.textContent=s.v;
    const l=document.createElement('div');l.className='report-stat-label';l.textContent=s.l;
    d.appendChild(v);d.appendChild(l);summary.appendChild(d);
  });

  // Report notes persistence
  const notesEl=document.getElementById('reportNotes');
  notesEl.value=localStorage.getItem('cabin_report_notes')||'';
  notesEl.addEventListener('input',()=>localStorage.setItem('cabin_report_notes',notesEl.value));
}

// Incident form
document.getElementById('addIncidentBtn').addEventListener('click',()=>{
  document.getElementById('incidentOverlay').classList.add('visible');
});
document.getElementById('incidentClose').addEventListener('click',()=>{
  document.getElementById('incidentOverlay').classList.remove('visible');
});
document.getElementById('incidentOverlay').addEventListener('click',e=>{
  if(e.target===e.currentTarget)document.getElementById('incidentOverlay').classList.remove('visible');
});
document.getElementById('severityBtns').addEventListener('click',e=>{
  const b=e.target.closest('.sev-btn');if(!b)return;
  document.querySelectorAll('.sev-btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
});
document.getElementById('incidentSave').addEventListener('click',()=>{
  const desc=document.getElementById('incidentDesc').value.trim();
  if(!desc)return;
  const now=new Date();
  const sev=document.querySelector('.sev-btn.active');
  incidents.push({
    time:String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'),
    type:document.getElementById('incidentType').value,
    seat:document.getElementById('incidentSeat').value.trim(),
    desc:desc,
    severity:sev?sev.dataset.sev:'low'
  });
  lsSet('cabin_incidents',incidents);
  document.getElementById('incidentDesc').value='';
  document.getElementById('incidentSeat').value='';
  document.getElementById('incidentOverlay').classList.remove('visible');
  buildReport();
});

// ============================================================
// PONCTUALITE
// ============================================================
const MILESTONES=[
  {offset:-120,label:'Check-in ouvert',cat:'sol'},{offset:-120,label:'Security check',cat:'sol'},
  {offset:-120,label:'Tow in',cat:'avion'},{offset:-110,label:'Crew pick up',cat:'equip'},
  {offset:-110,label:'Security search',cat:'sol'},{offset:-100,label:'Crew at counter',cat:'equip'},
  {offset:-100,label:'Cargo at aircraft',cat:'avion'},{offset:-90,label:'Crew bus',cat:'equip'},
  {offset:-80,label:'Agent at gate',cat:'sol'},{offset:-80,label:'Crew at gate',cat:'equip'},
  {offset:-70,label:'Cleaning',cat:'avion'},{offset:-70,label:'Catering',cat:'avion'},
  {offset:-70,label:'Loading',cat:'avion'},{offset:-70,label:'Fueling',cat:'avion'},
  {offset:-60,label:'LDS sent',cat:'sol'},{offset:-50,label:'Boarding',cat:'sol'},
  {offset:-50,label:'OK Cabin',cat:'equip'},{offset:-40,label:'PMR / Remote',cat:'sol'},
  {offset:-40,label:'Pax bus',cat:'sol'},{offset:-30,label:'Servicing',cat:'avion'},
  {offset:-20,label:'Dep GPU',cat:'avion'},{offset:-20,label:'Bulk closed',cat:'avion'},
  {offset:-20,label:'Bag search',cat:'sol'},{offset:-10,label:'Dep jetbridge',cat:'sol'},
  {offset:-10,label:'Marshaller',cat:'avion'},{offset:-10,label:'Pushback ready',cat:'avion'},
  {offset:0,label:'DEPART',cat:'depart'}
];

function getSTD(){const p=document.getElementById('stdInput').value.split(':');const d=new Date();d.setHours(+p[0],+p[1],0,0);return d;}
function fmt(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}

function buildTimeline(){
  const c=document.getElementById('timelineContainer');if(!c)return;c.textContent='';
  const std=getSTD(),now=new Date();
  const groups={};
  MILESTONES.forEach((m,i)=>{if(!groups[m.offset])groups[m.offset]=[];groups[m.offset].push({...m,idx:i});});
  Object.keys(groups).map(Number).sort((a,b)=>a-b).forEach(off=>{
    const items=groups[off],target=new Date(std.getTime()+off*60000),diff=Math.round((target-now)/60000);
    const ge=document.createElement('div');ge.className='timeline-group';
    const gl=document.createElement('div');gl.className='timeline-group-label';
    const hh=Math.floor(Math.abs(off)/60),mm=Math.abs(off)%60;
    gl.textContent=off===0?'H - DEPART':'H - '+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
    ge.appendChild(gl);
    items.forEach(m=>{
      const row=document.createElement('div');row.className='timeline-item';
      const chk=!!milestoneChecks[m.idx];
      if(chk)row.classList.add('past');else if(diff>5)row.classList.add('upcoming');else if(diff>=-5)row.classList.add('current');else row.classList.add('overdue');
      const te=document.createElement('div');te.className='timeline-time';te.textContent=off===0?'STD':'H'+off+'min';
      const ae=document.createElement('div');ae.className='timeline-abs-time';ae.textContent=fmt(target);
      const le=document.createElement('div');le.className='timeline-label';le.textContent=m.label;
      const se=document.createElement('div');se.className='timeline-status';
      if(chk){se.classList.add('done');se.textContent='Fait';}else if(diff>5){se.classList.add('waiting');se.textContent='A venir';}else if(diff>=-5){se.classList.add('now');se.textContent='En cours';}else{se.classList.add('late');se.textContent='Retard';}
      const ce=document.createElement('div');ce.className='timeline-check'+(chk?' checked':'');
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');
      const poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');poly.setAttribute('points','20 6 9 17 4 12');
      svg.appendChild(poly);ce.appendChild(svg);
      ce.addEventListener('click',()=>{if(milestoneChecks[m.idx])delete milestoneChecks[m.idx];else milestoneChecks[m.idx]=Date.now();lsSet('cabin_otp_checks',milestoneChecks);buildTimeline();});
      row.appendChild(te);row.appendChild(ae);row.appendChild(le);row.appendChild(se);row.appendChild(ce);ge.appendChild(row);
    });
    c.appendChild(ge);
  });
}

function updateClocks(){
  const t=fmt(new Date());
  const c1=document.getElementById('otpClock');if(c1)c1.textContent=t;
  const c2=document.getElementById('briefingClock');if(c2)c2.textContent=t;
}
const stdIn=document.getElementById('stdInput');if(stdIn)stdIn.addEventListener('change',buildTimeline);
setInterval(()=>{buildTimeline();updateClocks();},30000);

// ============================================================
// INIT
// ============================================================
buildBriefing();
buildCabinPlan();
buildMeals();
buildTimeline();
buildChecklists();
buildReport();
updateClocks();
