/**
 * DailyCode — Smooth Theme Toggle
 * Paste this wherever you handle the theme button click.
 */

function toggleTheme() {
  const body = document.body;

  // Prevent flash by disabling transition for 1 frame
  body.classList.add('no-transition');
  body.classList.toggle('light');

  localStorage.setItem('theme', body.classList.contains('light') ? 'light' : 'dark');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      body.classList.remove('no-transition');
    });
  });
}

// Restore saved theme on load, without any flash
function initTheme() {
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('no-transition', 'light');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('no-transition');
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', initTheme);

// Wire to your toggle button:
// document.getElementById('themeBtn').addEventListener('click', toggleTheme);