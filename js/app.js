// === Service Worker Registration ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.error('SW error:', err));
}

// === Tab Navigation ===
const tabBar = document.getElementById('tabBar');
const tabs = tabBar.querySelectorAll('.tab');
const modules = document.querySelectorAll('.module');

tabBar.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  const target = tab.dataset.module;
  tabs.forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  modules.forEach(m => {
    m.classList.toggle('active', m.id === `mod-${target}`);
  });
});

// ============================================================
// CABIN PLAN — CORSAIR B787-9
// Business 1-2-1 (rows 1-8)
// Premium 2-3-2 (rows 9-14)
// Economy 3-3-3 (rows 15-29, 30-47)
// Seat letters: K J H | F E D | C B A
// ============================================================

const CABIN_CONFIG = {
  business: {
    label: 'Business',
    cls: 'business',
    rows: [1, 2, 3, 4, 5, 6, 7, 8],
    layout: ['K', '.', '.', '|', '.', 'F', 'E', '|', '.', '.', 'A']
  },
  premium: {
    label: 'Premium',
    cls: 'premium',
    rows: [9, 10, 11, 12, 13, 14],
    layout: ['K', 'J', '.', '|', 'F', 'E', 'D', '|', '.', 'B', 'A']
  },
  economy_front: {
    label: 'Economy',
    cls: 'economy',
    rows: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    layout: ['K', 'J', 'H', '|', 'F', 'E', 'D', '|', 'C', 'B', 'A']
  },
  economy_rear: {
    label: '',
    cls: 'economy',
    rows: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
    layout: ['K', 'J', 'H', '|', 'F', 'E', 'D', '|', 'C', 'B', 'A']
  }
};

const ALL_POSITIONS = ['K', 'J', 'H', '|', 'F', 'E', 'D', '|', 'C', 'B', 'A'];

// Mock passenger data
function generateMockPassengers() {
  const firstNames = [
    'Marie', 'Thomas', 'Camille', 'Lucas', 'Lea', 'Hugo', 'Manon', 'Louis',
    'Chloe', 'Nathan', 'Emma', 'Raphael', 'Sarah', 'Jules', 'Ines', 'Arthur',
    'Jade', 'Adam', 'Lola', 'Gabriel', 'Alice', 'Paul', 'Louise', 'Noel',
    'Fatima', 'Jean-Pierre', 'Aisha', 'Ravi', 'Chen', 'Yuki', 'Pierre', 'Sophie'
  ];
  const lastNames = [
    'MARTIN', 'BERNARD', 'DUBOIS', 'THOMAS', 'ROBERT', 'PETIT', 'DURAND',
    'MOREAU', 'LAURENT', 'SIMON', 'MICHEL', 'GARCIA', 'ROUX', 'LEROY',
    'FONTAINE', 'CHEVALIER', 'BOYER', 'BLANC', 'NAIR', 'WONG', 'SUZUKI',
    'PAYET', 'HOARAU', 'RIVIERE', 'GRONDIN', 'DIJOUX', 'CADET', 'MAILLOT'
  ];
  const specialMeals = ['', '', '', '', '', 'VGML', 'VLML', 'HNML', 'DBML', 'CHML', 'AVML'];
  const remarks = ['', '', '', '', '', '', '', 'UM', 'WCHR', 'DEAF', 'BLND', 'PETC'];

  const passengers = {};
  const allSeats = [];

  Object.values(CABIN_CONFIG).forEach(section => {
    section.rows.forEach(row => {
      section.layout.forEach(pos => {
        if (pos !== '.' && pos !== '|') {
          allSeats.push({ seat: `${row}${pos}`, cls: section.cls });
        }
      });
    });
  });

  const occupiedCount = Math.floor(allSeats.length * 0.82);
  const shuffled = allSeats.sort(() => Math.random() - 0.5).slice(0, occupiedCount);

  shuffled.forEach(({ seat, cls }) => {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const meal = specialMeals[Math.floor(Math.random() * specialMeals.length)];
    const remark = remarks[Math.floor(Math.random() * remarks.length)];
    passengers[seat] = {
      name: `${ln} ${fn}`,
      class: cls,
      meal: meal,
      remark: remark,
      checkedIn: Math.random() > 0.08
    };
  });

  return passengers;
}

const passengers = generateMockPassengers();

// === Build Cabin Plan ===
function buildCabinPlan() {
  const container = document.getElementById('cabinPlan');
  container.textContent = '';

  // Row labels column
  const labelsCol = document.createElement('div');
  labelsCol.className = 'row-labels';
  ALL_POSITIONS.forEach(pos => {
    const label = document.createElement('div');
    if (pos === '|') {
      label.className = 'row-label aisle-gap';
    } else {
      label.className = 'row-label';
      label.textContent = pos;
    }
    labelsCol.appendChild(label);
  });
  container.appendChild(labelsCol);

  const sections = ['business', 'premium', 'economy_front', 'economy_rear'];
  sections.forEach((sectionKey, sIdx) => {
    const config = CABIN_CONFIG[sectionKey];

    if (sIdx > 0) {
      const divider = document.createElement('div');
      divider.className = 'section-divider';
      container.appendChild(divider);
    }

    const sectionEl = document.createElement('div');
    sectionEl.className = 'cabin-section';

    const sLabel = document.createElement('div');
    sLabel.className = `section-label ${config.cls}`;
    sLabel.textContent = config.label;
    sectionEl.appendChild(sLabel);

    const colsContainer = document.createElement('div');
    colsContainer.className = 'cabin-columns';

    config.rows.forEach(rowNum => {
      const col = document.createElement('div');
      col.className = 'cabin-col';

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
          const seatId = `${rowNum}${pos}`;
          const seatEl = document.createElement('div');
          seatEl.className = 'seat';
          seatEl.dataset.seat = seatId;
          seatEl.dataset.row = String(rowNum);
          seatEl.dataset.letter = pos;
          seatEl.textContent = pos;

          const pax = passengers[seatId];
          if (pax) {
            seatEl.classList.add('occupied', config.cls);
            if (pax.meal) seatEl.classList.add('special-meal');
            if (pax.remark === 'WCHR') seatEl.classList.add('wheelchair');
          } else {
            seatEl.classList.add('empty');
          }

          seatEl.addEventListener('click', () => showSeatInfo(seatId, config.cls));
          col.appendChild(seatEl);
        }
      });

      colsContainer.appendChild(col);
    });

    sectionEl.appendChild(colsContainer);
    container.appendChild(sectionEl);
  });

  updateStats();
}

// === Seat Info Panel ===
let selectedSeat = null;

function showSeatInfo(seatId, sectionClass) {
  const infoPanel = document.getElementById('seatInfo');
  const pax = passengers[seatId];

  if (selectedSeat) {
    const prev = document.querySelector('.seat.selected');
    if (prev) prev.classList.remove('selected');
  }

  const seatEl = document.querySelector(`[data-seat="${seatId}"]`);
  if (seatEl) seatEl.classList.add('selected');
  selectedSeat = seatId;

  document.getElementById('seatInfoId').textContent = seatId;

  if (pax) {
    document.getElementById('seatInfoName').textContent = pax.name;
    let meta = sectionClass.charAt(0).toUpperCase() + sectionClass.slice(1);
    if (pax.meal) meta += ` | ${pax.meal}`;
    if (pax.remark) meta += ` | ${pax.remark}`;
    if (!pax.checkedIn) meta += ' | Non embarque';
    document.getElementById('seatInfoMeta').textContent = meta;
  } else {
    document.getElementById('seatInfoName').textContent = 'Siege libre';
    document.getElementById('seatInfoMeta').textContent =
      sectionClass.charAt(0).toUpperCase() + sectionClass.slice(1);
  }

  infoPanel.classList.add('visible');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.seat') && !e.target.closest('.seat-info')) {
    const infoPanel = document.getElementById('seatInfo');
    infoPanel.classList.remove('visible');
    if (selectedSeat) {
      const prev = document.querySelector('.seat.selected');
      if (prev) prev.classList.remove('selected');
      selectedSeat = null;
    }
  }
});

// === Stats ===
function updateStats() {
  const statsEl = document.getElementById('cabinStats');
  statsEl.textContent = '';

  const allSeats = document.querySelectorAll('.seat:not(.no-seat)');
  const occupied = document.querySelectorAll('.seat.occupied');
  const specialMeals = document.querySelectorAll('.seat.special-meal');

  const biz = document.querySelectorAll('.seat.occupied.business').length;
  const prem = document.querySelectorAll('.seat.occupied.premium').length;
  const eco = document.querySelectorAll('.seat.occupied.economy').length;

  const total = allSeats.length;
  const occ = occupied.length;
  const pct = Math.round((occ / total) * 100);

  document.getElementById('paxCount').textContent = `${occ} / ${total}`;

  const statsData = [
    { value: `${pct}%`, label: 'Taux de remplissage' },
    null,
    { value: String(biz), label: 'Business' },
    null,
    { value: String(prem), label: 'Premium' },
    null,
    { value: String(eco), label: 'Economy' },
    null,
    { value: String(specialMeals.length), label: 'Repas speciaux' }
  ];

  statsData.forEach(item => {
    if (item === null) {
      const divider = document.createElement('div');
      divider.className = 'stat-divider';
      statsEl.appendChild(divider);
    } else {
      const statItem = document.createElement('div');
      statItem.className = 'stat-item';
      const wrapper = document.createElement('div');
      const val = document.createElement('div');
      val.className = 'stat-value';
      val.textContent = item.value;
      const lab = document.createElement('div');
      lab.className = 'stat-label';
      lab.textContent = item.label;
      wrapper.appendChild(val);
      wrapper.appendChild(lab);
      statItem.appendChild(wrapper);
      statsEl.appendChild(statItem);
    }
  });
}

// === Init ===
buildCabinPlan();
