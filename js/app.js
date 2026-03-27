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
