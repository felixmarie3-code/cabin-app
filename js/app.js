// === Service Worker Registration ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.error('SW error:', err));
}

// === Tab Navigation ===
const tabBar = document.getElementById('tabBar');
tabBar.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  const target = tab.dataset.module;
  tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.module').forEach(m => {
    m.classList.toggle('active', m.id === 'mod-' + target);
  });
});

// ============================================================
// DATA: Bookmarks & Notes (persisted in localStorage)
// ============================================================
function loadBookmarks() {
  try { return JSON.parse(localStorage.getItem('cabin_bookmarks') || '{}'); } catch { return {}; }
}
function saveBookmarks(bm) { localStorage.setItem('cabin_bookmarks', JSON.stringify(bm)); }
function loadNotes() {
  try { return JSON.parse(localStorage.getItem('cabin_notes') || '{}'); } catch { return {}; }
}
function saveNotes(n) { localStorage.setItem('cabin_notes', JSON.stringify(n)); }

let bookmarks = loadBookmarks();
let notes = loadNotes();

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
const EXIT_ROWS = [1, 9, 15, 30, 46];
const GALLEY_POSITIONS = [
  { after: 'business', label: 'GAL' },
  { after: 'economy_front', label: 'GAL/LAV' }
];

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
  const meals = ['','','','','','VGML','VLML','HNML','DBML','CHML','AVML','KSML','MOML'];
  const remarks = ['','','','','','','','UM','WCHR','DEAF','BLND','PETC','VIP','MAAS'];
  const nationalities = ['FR','FR','FR','FR','RE','RE','MU','MG','IN','CN','JP','GB','DE','US','SN'];
  const pnrs = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  const pass = {};
  const allSeats = [];
  Object.values(CABIN_CONFIG).forEach(sec => {
    sec.rows.forEach(r => {
      sec.layout.forEach(p => {
        if (p !== '.' && p !== '|') allSeats.push({ seat: r + p, cls: sec.cls });
      });
    });
  });

  const count = Math.floor(allSeats.length * 0.82);
  const shuffled = allSeats.sort(() => Math.random() - 0.5).slice(0, count);
  shuffled.forEach(({ seat, cls }) => {
    let pnr = '';
    for (let i = 0; i < 6; i++) pnr += pnrs[Math.floor(Math.random() * pnrs.length)];
    const rm = remarks[Math.floor(Math.random() * remarks.length)];
    pass[seat] = {
      name: ln[Math.floor(Math.random()*ln.length)] + ' ' + fn[Math.floor(Math.random()*fn.length)],
      pnr: pnr,
      class: cls,
      meal: meals[Math.floor(Math.random()*meals.length)],
      remark: rm,
      nationality: nationalities[Math.floor(Math.random()*nationalities.length)],
      checkedIn: Math.random() > 0.08,
      boarded: Math.random() > 0.15,
      bags: Math.floor(Math.random() * 3),
      infant: Math.random() > 0.95,
      ffn: Math.random() > 0.7 ? 'SS' + String(Math.floor(Math.random()*9000000+1000000)) : ''
    };
  });
  return pass;
}

const passengers = generateMockPassengers();

// ============================================================
// BUILD CABIN PLAN
// ============================================================
let activeFilter = 'all';
let searchQuery = '';

function buildCabinPlan() {
  const container = document.getElementById('cabinPlan');
  container.textContent = '';

  // Row labels column (left)
  const labelsCol = document.createElement('div');
  labelsCol.className = 'row-labels';
  ALL_POSITIONS.forEach(pos => {
    const label = document.createElement('div');
    if (pos === '|') { label.className = 'row-label aisle-gap'; }
    else { label.className = 'row-label'; label.textContent = pos; }
    labelsCol.appendChild(label);
  });
  // Add empty space for row numbers alignment
  const numSpacer = document.createElement('div');
  numSpacer.className = 'row-label';
  numSpacer.style.height = '16px';
  labelsCol.appendChild(numSpacer);
  container.appendChild(labelsCol);

  const sections = ['business','premium','economy_front','economy_rear'];
  sections.forEach((sectionKey, sIdx) => {
    const config = CABIN_CONFIG[sectionKey];

    if (sIdx > 0) {
      // Check if we need a galley divider
      const prevKey = sections[sIdx - 1];
      const galley = GALLEY_POSITIONS.find(g => g.after === prevKey);
      if (galley) {
        const galCol = document.createElement('div');
        galCol.className = 'galley-col';
        const gIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        gIcon.setAttribute('viewBox', '0 0 24 24');
        gIcon.setAttribute('class', 'galley-icon');
        const gPath = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        gPath.setAttribute('x', '4'); gPath.setAttribute('y', '2');
        gPath.setAttribute('width', '16'); gPath.setAttribute('height', '20');
        gPath.setAttribute('rx', '2');
        gIcon.appendChild(gPath);
        galCol.appendChild(gIcon);
        const gLabel = document.createElement('div');
        gLabel.className = 'galley-label';
        gLabel.textContent = galley.label;
        galCol.appendChild(gLabel);
        container.appendChild(galCol);
      } else {
        const divider = document.createElement('div');
        divider.className = 'section-divider';
        container.appendChild(divider);
      }
    }

    const sectionEl = document.createElement('div');
    sectionEl.className = 'cabin-section';

    const sLabel = document.createElement('div');
    sLabel.className = 'section-label ' + config.cls;
    sLabel.textContent = config.label;
    sectionEl.appendChild(sLabel);

    const colsContainer = document.createElement('div');
    colsContainer.className = 'cabin-columns';

    config.rows.forEach(rowNum => {
      const col = document.createElement('div');
      col.className = 'cabin-col';
      if (EXIT_ROWS.includes(rowNum)) col.classList.add('exit-row');

      config.layout.forEach(pos => {
        if (pos === '|') {
          const aisle = document.createElement('div');
          aisle.className = 'aisle';
          col.appendChild(aisle);
        } else if (pos === '.') {
          const noSeat = document.createElement('div');
          noSeat.className = 'seat no-seat';
          col.appendChild(noSeat);
        } else {
          const seatId = rowNum + pos;
          const seatEl = document.createElement('div');
          seatEl.className = 'seat';
          seatEl.dataset.seat = seatId;
          seatEl.textContent = pos;

          const pax = passengers[seatId];
          if (pax) {
            seatEl.classList.add('occupied', config.cls);
            if (pax.meal) seatEl.classList.add('special-meal');
            if (pax.remark === 'WCHR') seatEl.classList.add('wheelchair');
            if (pax.remark === 'UM') seatEl.classList.add('um');
          } else {
            seatEl.classList.add('empty');
          }
          if (bookmarks[seatId]) seatEl.classList.add('bookmarked');

          seatEl.addEventListener('click', (ev) => { ev.stopPropagation(); openPaxPanel(seatId, config.cls); });
          col.appendChild(seatEl);
        }
      });

      // Row number at bottom of column
      const rowNumEl = document.createElement('div');
      rowNumEl.className = 'row-num';
      rowNumEl.textContent = rowNum;
      rowNumEl.style.height = '16px';
      rowNumEl.style.display = 'flex';
      rowNumEl.style.alignItems = 'center';
      rowNumEl.style.justifyContent = 'center';
      col.appendChild(rowNumEl);

      colsContainer.appendChild(col);
    });

    sectionEl.appendChild(colsContainer);
    container.appendChild(sectionEl);
  });

  applyFilters();
  updateStats();
}

// ============================================================
// FILTERS & SEARCH
// ============================================================
document.getElementById('filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  applyFilters();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase().trim();
  applyFilters();
});

function applyFilters() {
  const allSeatEls = document.querySelectorAll('.seat:not(.no-seat)');
  const hasFilter = activeFilter !== 'all' || searchQuery.length > 0;

  allSeatEls.forEach(el => {
    const seatId = el.dataset.seat;
    const pax = passengers[seatId];
    let match = true;

    // Filter logic
    if (activeFilter === 'occupied') match = !!pax;
    else if (activeFilter === 'empty') match = !pax;
    else if (activeFilter === 'special-meal') match = pax && pax.meal;
    else if (activeFilter === 'um') match = pax && pax.remark === 'UM';
    else if (activeFilter === 'wchr') match = pax && pax.remark === 'WCHR';
    else if (activeFilter === 'bookmarked') match = !!bookmarks[seatId];

    // Search logic
    if (searchQuery && match) {
      if (pax) {
        const haystack = (pax.name + ' ' + pax.pnr + ' ' + seatId + ' ' + pax.remark + ' ' + pax.meal).toLowerCase();
        match = haystack.includes(searchQuery);
      } else {
        match = seatId.toLowerCase().includes(searchQuery);
      }
    }

    el.classList.toggle('dimmed', hasFilter && !match);
    el.classList.toggle('highlighted', hasFilter && match && (activeFilter !== 'all' || searchQuery));
  });
}

// ============================================================
// PAX DETAIL PANEL
// ============================================================
let currentPanelSeat = null;

function openPaxPanel(seatId, sectionClass) {
  currentPanelSeat = seatId;
  const pax = passengers[seatId];
  const overlay = document.getElementById('paxOverlay');
  const badge = document.getElementById('panelSeatBadge');
  const nameEl = document.getElementById('panelName');
  const classEl = document.getElementById('panelClass');
  const grid = document.getElementById('panelGrid');
  const notesEl = document.getElementById('panelNotes');
  const bmBtn = document.getElementById('panelBookmark');

  badge.textContent = seatId;
  badge.className = 'pax-seat-badge ' + (pax ? sectionClass : 'empty-seat');

  if (pax) {
    nameEl.textContent = pax.name;
    classEl.textContent = sectionClass + (pax.ffn ? ' | FFN ' + pax.ffn : '');
    bmBtn.style.display = '';

    grid.textContent = '';
    const fields = [
      { label: 'PNR', value: pax.pnr },
      { label: 'Nationalite', value: pax.nationality },
      { label: 'Embarquement', value: pax.boarded ? 'A bord' : 'En attente', cls: pax.boarded ? 'ok' : 'warn' },
      { label: 'Check-in', value: pax.checkedIn ? 'Oui' : 'Non', cls: pax.checkedIn ? 'ok' : 'warn' },
      { label: 'Repas', value: pax.meal || 'Standard' },
      { label: 'Remarque', value: pax.remark || 'Aucune', cls: pax.remark ? 'warn' : '' },
      { label: 'Bagages', value: pax.bags + ' pcs' },
      { label: 'Nourrisson', value: pax.infant ? 'Oui' : 'Non', cls: pax.infant ? 'warn' : '' }
    ];
    fields.forEach(f => {
      const item = document.createElement('div');
      item.className = 'pax-info-item';
      const lab = document.createElement('div');
      lab.className = 'pax-info-label';
      lab.textContent = f.label;
      const val = document.createElement('div');
      val.className = 'pax-info-value' + (f.cls ? ' ' + f.cls : '');
      val.textContent = f.value;
      item.appendChild(lab);
      item.appendChild(val);
      grid.appendChild(item);
    });
  } else {
    nameEl.textContent = 'Siege libre';
    classEl.textContent = sectionClass;
    bmBtn.style.display = 'none';
    grid.textContent = '';
  }

  // Bookmark state
  bmBtn.classList.toggle('bookmarked', !!bookmarks[seatId]);

  // Notes
  notesEl.value = notes[seatId] || '';
  notesEl.style.display = pax ? '' : 'none';
  document.getElementById('panelSaveNote').style.display = pax ? '' : 'none';
  document.querySelector('.pax-notes-label').style.display = pax ? '' : 'none';

  // Highlight seat
  document.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected'));
  const seatEl = document.querySelector('[data-seat="' + seatId + '"]');
  if (seatEl) seatEl.classList.add('selected');

  overlay.classList.add('visible');
}

function closePaxPanel() {
  document.getElementById('paxOverlay').classList.remove('visible');
  document.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected'));
  currentPanelSeat = null;
}

document.getElementById('panelClose').addEventListener('click', closePaxPanel);
document.getElementById('paxOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closePaxPanel();
});

// Bookmark toggle
document.getElementById('panelBookmark').addEventListener('click', () => {
  if (!currentPanelSeat) return;
  if (bookmarks[currentPanelSeat]) { delete bookmarks[currentPanelSeat]; }
  else { bookmarks[currentPanelSeat] = true; }
  saveBookmarks(bookmarks);
  document.getElementById('panelBookmark').classList.toggle('bookmarked', !!bookmarks[currentPanelSeat]);
  const seatEl = document.querySelector('[data-seat="' + currentPanelSeat + '"]');
  if (seatEl) seatEl.classList.toggle('bookmarked', !!bookmarks[currentPanelSeat]);
});

// Save note
document.getElementById('panelSaveNote').addEventListener('click', () => {
  if (!currentPanelSeat) return;
  const val = document.getElementById('panelNotes').value.trim();
  if (val) { notes[currentPanelSeat] = val; } else { delete notes[currentPanelSeat]; }
  saveNotes(notes);
  document.getElementById('panelSaveNote').textContent = 'Enregistre !';
  setTimeout(() => { document.getElementById('panelSaveNote').textContent = 'Enregistrer la note'; }, 1500);
});

// ============================================================
// STATS
// ============================================================
function updateStats() {
  const statsEl = document.getElementById('cabinStats');
  statsEl.textContent = '';
  const allSeats = document.querySelectorAll('.seat:not(.no-seat)');
  const biz = document.querySelectorAll('.seat.occupied.business').length;
  const prem = document.querySelectorAll('.seat.occupied.premium').length;
  const eco = document.querySelectorAll('.seat.occupied.economy').length;
  const occ = biz + prem + eco;
  const total = allSeats.length;
  const pct = Math.round((occ / total) * 100);
  const sm = document.querySelectorAll('.seat.special-meal').length;

  const data = [
    { v: pct + '%', l: 'Remplissage' }, null,
    { v: String(biz), l: 'Business' }, null,
    { v: String(prem), l: 'Premium' }, null,
    { v: String(eco), l: 'Economy' }, null,
    { v: String(sm), l: 'Repas spe.' }, null,
    { v: String(Object.keys(bookmarks).length), l: 'Marques' }
  ];
  data.forEach(item => {
    if (item === null) {
      const d = document.createElement('div'); d.className = 'stat-divider'; statsEl.appendChild(d);
    } else {
      const si = document.createElement('div'); si.className = 'stat-item';
      const w = document.createElement('div');
      const v = document.createElement('div'); v.className = 'stat-value'; v.textContent = item.v;
      const l = document.createElement('div'); l.className = 'stat-label'; l.textContent = item.l;
      w.appendChild(v); w.appendChild(l); si.appendChild(w); statsEl.appendChild(si);
    }
  });
}

// ============================================================
// PONCTUALITE — DEPART ORY MILESTONES
// ============================================================
const MILESTONES = [
  { offset: -120, label: 'Check-in ouvert', category: 'sol' },
  { offset: -120, label: 'Security check', category: 'sol' },
  { offset: -120, label: 'Tow in', category: 'avion' },
  { offset: -110, label: 'Crew pick up', category: 'equipage' },
  { offset: -110, label: 'Security search', category: 'sol' },
  { offset: -100, label: 'Crew at counter', category: 'equipage' },
  { offset: -100, label: 'Cargo at aircraft', category: 'avion' },
  { offset: -90, label: 'Crew bus', category: 'equipage' },
  { offset: -80, label: 'Agent at gate', category: 'sol' },
  { offset: -80, label: 'Crew at gate', category: 'equipage' },
  { offset: -70, label: 'Cleaning', category: 'avion' },
  { offset: -70, label: 'Catering', category: 'avion' },
  { offset: -70, label: 'Loading', category: 'avion' },
  { offset: -70, label: 'Fueling', category: 'avion' },
  { offset: -60, label: 'LDS sent', category: 'sol' },
  { offset: -50, label: 'Boarding', category: 'sol' },
  { offset: -50, label: 'OK Cabin', category: 'equipage' },
  { offset: -40, label: 'PMR / Remote', category: 'sol' },
  { offset: -40, label: 'Pax bus', category: 'sol' },
  { offset: -30, label: 'Servicing', category: 'avion' },
  { offset: -20, label: 'Dep GPU', category: 'avion' },
  { offset: -20, label: 'Bulk closed', category: 'avion' },
  { offset: -20, label: 'Bag search', category: 'sol' },
  { offset: -10, label: 'Dep jetbridge', category: 'sol' },
  { offset: -10, label: 'Marshaller', category: 'avion' },
  { offset: -10, label: 'Pushback ready', category: 'avion' },
  { offset: 0, label: 'DEPART', category: 'depart' }
];

let milestoneChecks = {};
try { milestoneChecks = JSON.parse(localStorage.getItem('cabin_otp_checks') || '{}'); } catch { milestoneChecks = {}; }

function getSTD() {
  const input = document.getElementById('stdInput');
  if (!input) return null;
  const parts = input.value.split(':');
  const d = new Date();
  d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  return d;
}

function formatTime(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function buildTimeline() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;
  container.textContent = '';

  const std = getSTD();
  if (!std) return;
  const now = new Date();

  // Group by offset
  const groups = {};
  MILESTONES.forEach((m, idx) => {
    const key = m.offset;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...m, idx });
  });

  const sortedKeys = Object.keys(groups).map(Number).sort((a, b) => a - b);

  sortedKeys.forEach(offset => {
    const items = groups[offset];
    const targetTime = new Date(std.getTime() + offset * 60000);
    const diffMin = Math.round((targetTime - now) / 60000);

    const groupEl = document.createElement('div');
    groupEl.className = 'timeline-group';

    const groupLabel = document.createElement('div');
    groupLabel.className = 'timeline-group-label';
    const hh = Math.floor(Math.abs(offset) / 60);
    const mm = Math.abs(offset) % 60;
    groupLabel.textContent = offset === 0 ? 'H - DEPART' :
      'H - ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    groupEl.appendChild(groupLabel);

    items.forEach(m => {
      const row = document.createElement('div');
      row.className = 'timeline-item';

      const isChecked = !!milestoneChecks[m.idx];

      // Status
      if (isChecked) { row.classList.add('past'); }
      else if (diffMin > 5) { row.classList.add('upcoming'); }
      else if (diffMin >= -5) { row.classList.add('current'); }
      else { row.classList.add('overdue'); }

      // Time label
      const timeEl = document.createElement('div');
      timeEl.className = 'timeline-time';
      timeEl.textContent = offset === 0 ? 'STD' : 'H' + (offset > 0 ? '+' : '') + offset + 'min';
      row.appendChild(timeEl);

      // Absolute time
      const absEl = document.createElement('div');
      absEl.className = 'timeline-abs-time';
      absEl.textContent = formatTime(targetTime);
      row.appendChild(absEl);

      // Label
      const labelEl = document.createElement('div');
      labelEl.className = 'timeline-label';
      labelEl.textContent = m.label;
      row.appendChild(labelEl);

      // Status badge
      const statusEl = document.createElement('div');
      statusEl.className = 'timeline-status';
      if (isChecked) { statusEl.classList.add('done'); statusEl.textContent = 'Fait'; }
      else if (diffMin > 5) { statusEl.classList.add('waiting'); statusEl.textContent = 'A venir'; }
      else if (diffMin >= -5) { statusEl.classList.add('now'); statusEl.textContent = 'En cours'; }
      else { statusEl.classList.add('late'); statusEl.textContent = 'Retard'; }
      row.appendChild(statusEl);

      // Checkmark button
      const checkEl = document.createElement('div');
      checkEl.className = 'timeline-check' + (isChecked ? ' checked' : '');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '20 6 9 17 4 12');
      svg.appendChild(polyline);
      checkEl.appendChild(svg);
      checkEl.addEventListener('click', () => {
        if (milestoneChecks[m.idx]) { delete milestoneChecks[m.idx]; }
        else { milestoneChecks[m.idx] = Date.now(); }
        localStorage.setItem('cabin_otp_checks', JSON.stringify(milestoneChecks));
        buildTimeline();
      });
      row.appendChild(checkEl);

      groupEl.appendChild(row);
    });

    container.appendChild(groupEl);
  });
}

// Clock update
function updateOTPClock() {
  const el = document.getElementById('otpClock');
  if (el) el.textContent = formatTime(new Date());
}

// STD change listener
const stdInput = document.getElementById('stdInput');
if (stdInput) stdInput.addEventListener('change', buildTimeline);

// Refresh timeline every 30s
setInterval(() => { buildTimeline(); updateOTPClock(); }, 30000);

// ============================================================
// INIT
// ============================================================
buildCabinPlan();
buildTimeline();
updateOTPClock();
