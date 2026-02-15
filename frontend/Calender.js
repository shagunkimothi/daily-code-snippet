let currentDate = new Date();
let snippets = [];

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Load snippets from backend
document.addEventListener("DOMContentLoaded", async () => {
  await loadSnippets();
  renderCalendar();
});

async function loadSnippets() {
  const token = localStorage.getItem("token");
  const endpoint = token 
    ? "http://127.0.0.1:8000/snippets/private"
    : "http://127.0.0.1:8000/snippets/public";

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const res = await fetch(endpoint, { headers });
    snippets = await res.json();
  } catch (err) {
    console.error("Error loading snippets:", err);
  }
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById("monthTitle").innerText =
    `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();

  // Week headers
  const daysHeader = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  daysHeader.forEach(day => {
    const div = document.createElement("div");
    div.className = "calendar-day-header";
    div.innerText = day;
    grid.appendChild(div);
  });

  // Padding
  for (let i = 0; i < firstDay; i++) {
    const pad = document.createElement("div");
    pad.className = "calendar-cell empty";
    grid.appendChild(pad);
  }

  // Days
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr === todayStr) {
      cell.classList.add("today");
    }

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-date";
    dayNumber.innerText = d;
    cell.appendChild(dayNumber);

    const snippetsOnDay = snippets.filter(s => s.date === dateStr);

    snippetsOnDay.forEach(snippet => {
      const btn = document.createElement("button");
      btn.className = "calendar-snippet";
      btn.innerText = snippet.title;

      btn.onclick = () => {
        alert(`Snippet: ${snippet.title}`);
        // Later you can redirect to index.html and show it
      };

      cell.appendChild(btn);
    });

    grid.appendChild(cell);
  }
}

// Controls
document.getElementById("prevMonth").onclick = () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
};

document.getElementById("todayBtn").onclick = () => {
  currentDate = new Date();
  renderCalendar();
};
