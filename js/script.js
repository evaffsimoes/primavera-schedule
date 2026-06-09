import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAezxySTUQLY2hCKJvqn8q_kz2anI50D-U",
  authDomain: "primavera-schedule.firebaseapp.com",
  projectId: "primavera-schedule",
  storageBucket: "primavera-schedule.firebasestorage.app",
  messagingSenderId: "1081905859375",
  appId: "1:1081905859375:web:e68600892e39174ba9efda"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── helpers ──────────────────────────────────────────────────────────────
function timeToMinutes(timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number);
  return ((hh < 6 ? hh + 24 : hh) * 60) + mm;
}
function timeToSortableNumber(timeStr) {
  return timeToMinutes(timeStr);
}
function minsToLabel(totalMins) {
  const hh = Math.floor(totalMins / 60) % 24;
  const mm = totalMins % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ── dados ────────────────────────────────────────────────────────────────
const data = {
  "11 july": [
    ["16:35", "17:25", "Primavera", "Vaiapraia"],
    ["16:45", "17:35", "Estrella", "emmy Curl"],
    ["17:40", "18:30", "Vodafone", "Inês Marques Lucas"],
    ["17:40", "18:25", "ZYN", "The New Eves"],
    ["18:35", "19:25", "Primavera", "PAUS"],
    ["18:40", "19:30", "Estrella", "Nation of Language"],
    ["19:35", "20:30", "ZYN", "rusowsky"],
    ["19:40", "20:40", "Vodafone", "Sensible Soccers"],
    ["20:45", "22:00", "Estrella", "Big Thief"],
    ["20:45", "21:45", "Primavera", "Oklou"],
    ["22:05", "23:35", "Vodafone", "Ethel Cain"],
    ["22:10", "23:05", "ZYN", "Texas Is the Reason"],
    ["23:40", "00:55", "Estrella", "The xx"],
    ["23:40", "00:40", "Primavera", "Agriculture"],
    ["01:00", "02:15", "Vodafone", "KNEECAP"],
    ["01:25", "02:25", "ZYN", "Gelli Haha"],
    ["02:40", "03:40", "Primavera", "Ninajirachi"]
  ],
  "12 july": [
    ["16:35", "17:25", "Primavera", "Bestia Bebé"],
    ["16:45", "17:35", "Estrella", "Rita Vian"],
    ["17:40", "18:30", "Vodafone", "Buscabulla"],
    ["17:40", "18:25", "ZYN", "Annahstasia"],
    ["18:35", "19:25", "Primavera", "mark william lewis"],
    ["18:40", "19:30", "Estrella", "Baxter Dury"],
    ["19:35", "20:30", "ZYN", "Gisela João"],
    ["19:40", "20:40", "Vodafone", "Panda Bear"],
    ["20:50", "21:50", "Estrella", "Slowdive"],
    ["20:50", "21:50", "Primavera", "Mari Froes"],
    ["22:00", "23:00", "Vodafone", "Viagra Boys"],
    ["22:00", "23:00", "ZYN", "Black Country, New Road"],
    ["23:10", "00:40", "Estrella", "Gorillaz"],
    ["23:20", "00:20", "Primavera", "Water From Your Eyes"],
    ["00:45", "02:00", "Vodafone", "Bad Gyal"],
    ["00:50", "01:50", "ZYN", "Melt-Banana"],
    ["02:05", "03:05", "Primavera", "Joey Valence & Brae"]
  ],
  "13 july": [
    ["16:35", "17:25", "Primavera", "Aiko el grupo"],
    ["16:45", "17:35", "Estrella", "NAPA"],
    ["17:40", "18:35", "ZYN", "The Sophs"],
    ["17:45", "18:40", "Vodafone", "Triángulo de Amor Bizarro"],
    ["18:40", "19:30", "Estrella", "Yard Act"],
    ["18:45", "19:35", "Primavera", "Duquesa"],
    ["19:35", "20:50", "Vodafone", "Mike D"],
    ["19:40", "20:40", "ZYN", "Criolo, Amaro & Dino"],
    ["20:55", "21:55", "Estrella", "JADE"],
    ["21:00", "22:00", "Primavera", "Sudan Archives"],
    ["22:05", "23:05", "Vodafone", "Amaarae"],
    ["22:05", "23:05", "ZYN", "Smerz"],
    ["23:15", "00:30", "Estrella", "Massive Attack"],
    ["00:40", "02:10", "Vodafone", "IDLES"],
    ["01:00", "02:00", "ZYN", "fakemink"],
    ["02:15", "03:15", "Primavera", "Model/Actriz"]
  ],
  "14 july": [
    ["15:00", "17:00", "ZYN", "SuM"],
    ["17:00", "19:00", "ZYN", "Xinobi"],
    ["19:00", "21:00", "ZYN", "Dixon"],
    ["21:00", "23:00", "ZYN", "Peggy Gou"]
  ]
};

const stages = ["Estrella", "Vodafone", "ZYN", "Primavera"];
const selectedArtists = {};
const container = document.getElementById("schedule");
const selectedContainer = document.getElementById("selected-artists-list");

const friendColors = ['#ff5a4f', '#ee6aa7', '#feb400', '#b0cf0d', '#089e5f', '#f4a8c7'];
let friendsData = [];
let currentGroupId = localStorage.getItem('currentGroupId') || null;
let currentUserName = localStorage.getItem('currentUserName') || null;
let groupUnsubscribe = null;

function setupGroupListener() {
  if (!currentGroupId || !currentUserName) {
    document.getElementById('active-group-info').style.display = 'none';
    document.getElementById('leave-group').style.display = 'none';
    document.getElementById('create-group').style.display = '';
    document.getElementById('join-group').style.display = '';
    return;
  }

  document.getElementById('active-group-info').style.display = 'block';
  document.getElementById('group-code-display').textContent = currentGroupId;
  document.getElementById('leave-group').style.display = '';
  document.getElementById('create-group').style.display = 'none';
  document.getElementById('join-group').style.display = 'none';

  if (groupUnsubscribe) groupUnsubscribe();

  const groupRef = doc(db, "groups", currentGroupId);
  groupUnsubscribe = onSnapshot(groupRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const members = data.members || {};
      friendsData = [];

      const memberNames = Object.keys(members).sort();
      memberNames.forEach((name, colorIdx) => {
        const info = members[name];
        friendsData.push({
          name: name,
          color: friendColors[colorIdx % friendColors.length],
          concerts: info.concerts || []
        });
      });
      updateSelectedArtists();
    }
  }, (error) => {
    showFlash("Database Error: " + error.message);
    console.error("Firebase Snapshot Error:", error);
  });
}

function updateGroupData() {
  if (!currentGroupId || !currentUserName) return;
  const userConcerts = [];
  Object.keys(selectedArtists).forEach(day => {
    selectedArtists[day].forEach(entry => {
      const parsed = JSON.parse(entry);
      userConcerts.push(parsed.artist);
    });
  });

  const groupRef = doc(db, "groups", currentGroupId);
  updateDoc(groupRef, {
    [`members.${currentUserName}`]: { concerts: userConcerts }
  }).catch(err => {
    // Se o documento não existir ainda
    setDoc(groupRef, {
      members: {
        [currentUserName]: { concerts: userConcerts }
      }
    }, { merge: true }).catch(err2 => {
      showFlash("Save Error: " + err2.message);
      console.error("Firebase Set Error:", err2);
    });
  });
}

setupGroupListener();

// saved selection
try {
  const saved = localStorage.getItem('selectedArtists');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.keys(parsed).forEach(day => selectedArtists[day] = new Set(parsed[day]));
  }
} catch (e) { }

// ── build tables ─────────────────────────────────────────────────────────
Object.keys(data).forEach(day => {
  if (!selectedArtists[day]) selectedArtists[day] = new Set();

  const dayDiv = document.createElement("div");
  dayDiv.className = "day-container";
  const titleEl = document.createElement("h2");
  titleEl.style.display = "flex";
  titleEl.style.justifyContent = "space-between";
  titleEl.style.alignItems = "center";
  titleEl.innerHTML = `<span>${day}</span> <button class="btn-clear-day" title="Clear this day">Clear Day</button>`;

  const clearBtn = titleEl.querySelector('.btn-clear-day');
  clearBtn.addEventListener('click', () => {
    selectedArtists[day].clear();

    const dayTable = dayDiv.querySelector('table');
    if (dayTable) {
      dayTable.querySelectorAll('.selectable.selected').forEach(td => td.classList.remove('selected'));
    }

    updateSelectedArtists();
    saveSelectedArtists();
    updateGroupData();
    showFlash(`Schedule cleared for ${day}!`);
  });

  dayDiv.appendChild(titleEl);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>Time</th>${stages.map(s => `<th>${s}</th>`).join("")}</tr>`;
  table.appendChild(thead);

  const concertsByStage = {};
  stages.forEach(s => concertsByStage[s] = []);

  data[day].forEach(([start, end, stage, artist]) => {
    if (!concertsByStage[stage]) return;
    concertsByStage[stage].push({
      artist, stage, start, end,
      startMins: timeToMinutes(start),
      endMins: timeToMinutes(end)
    });
  });

  // 30 minutos slots
  let allMins = [];
  data[day].forEach(([start, end]) => {
    allMins.push(timeToMinutes(start), timeToMinutes(end));
  });
  const minTime = Math.floor(Math.min(...allMins) / 30) * 30;
  const maxTime = Math.ceil(Math.max(...allMins) / 30) * 30;

  const slots = [];
  for (let t = minTime; t < maxTime; t += 30) slots.push(t);

  const occupiedUntil = {};
  stages.forEach(s => occupiedUntil[s] = 0);

  const concertIdx = {};
  stages.forEach(s => concertIdx[s] = 0);

  const tbody = document.createElement("tbody");

  slots.forEach((slotMins, slotIndex) => {
    const tr = document.createElement("tr");

    // time label cell
    const tdHora = document.createElement("td");
    tdHora.textContent = minsToLabel(slotMins);
    tr.appendChild(tdHora);

    stages.forEach(stage => {
      if (occupiedUntil[stage] > slotIndex) {
        return;
      }

      const concerts = concertsByStage[stage];
      const idx = concertIdx[stage];
      const concert = (idx < concerts.length && concerts[idx].startMins >= slotMins && concerts[idx].startMins < slotMins + 30)
        ? concerts[idx]
        : null;

      if (!concert) {
        tr.appendChild(document.createElement("td"));
        return;
      }

      concertIdx[stage]++;

      const duration = concert.endMins - concert.startMins;
      const rowspan = Math.max(1, Math.round(duration / 30));

      occupiedUntil[stage] = slotIndex + rowspan;

      const td = document.createElement("td");
      td.rowSpan = rowspan;
      td.classList.add("selectable");
      td.setAttribute("data-artist", concert.artist);
      td.innerHTML = `
        <div class="concert-card">
          <div class="concert-artist">${concert.artist}</div>
          <div class="concert-time">${concert.start} → ${concert.end}</div>
          <div class="grid-friends-container"></div>
        </div>`;

      const entry = JSON.stringify({
        artist: concert.artist,
        stage: concert.stage,
        start: concert.start,
        end: concert.end
      });

      if (selectedArtists[day].has(entry)) td.classList.add("selected");

      td.addEventListener("click", () => {
        if (selectedArtists[day].has(entry)) {
          selectedArtists[day].delete(entry);
          td.classList.remove("selected");
        } else {
          selectedArtists[day].add(entry);
          td.classList.add("selected");
        }
        updateSelectedArtists();
        saveSelectedArtists();
        updateGroupData();
      });

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  dayDiv.appendChild(table);
  container.appendChild(dayDiv);
});

// ── artistas selecionados ──────────────────────────────────────
function hasConflict(currentEntry, allEntries) {
  const current = JSON.parse(currentEntry);
  const currentStart = timeToMinutes(current.start);
  const currentEnd = timeToMinutes(current.end);
  return allEntries.some(entry => {
    if (entry === currentEntry) return false;
    const other = JSON.parse(entry);
    const otherStart = timeToMinutes(other.start);
    const otherEnd = timeToMinutes(other.end);
    return currentStart < otherEnd && currentEnd > otherStart;
  });
}

function updateSelectedArtists() {
  selectedContainer.innerHTML = "";
  Object.keys(selectedArtists).forEach(day => {
    if (selectedArtists[day].size === 0) return;
    const section = document.createElement("div");
    section.className = "selected-day-section";
    const title = document.createElement("h3");
    title.textContent = day;
    section.appendChild(title);

    const divider = document.createElement("div");
    divider.className = "day-divider";
    section.appendChild(divider);

    const entriesArr = Array.from(selectedArtists[day]);
    const parsedEntries = entriesArr.map(e => JSON.parse(e));

    if (parsedEntries.length > 0) {
      let minMins = Math.min(...parsedEntries.map(e => timeToMinutes(e.start)));
      let maxMins = Math.max(...parsedEntries.map(e => timeToMinutes(e.end)));
      const totalMins = maxMins - minMins;
      const safeTotal = totalMins > 0 ? totalMins : 1;

      const summaryDiv = document.createElement("div");
      summaryDiv.className = "day-summary";

      const sortedByStart = [...parsedEntries].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      const sortedByEnd = [...parsedEntries].sort((a, b) => timeToMinutes(a.end) - timeToMinutes(b.end));
      const startLabel = sortedByStart[0].start;
      const endLabel = sortedByEnd[0].end;

      const sortedEntries = [...parsedEntries].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      let segmentsHTML = '';
      let labelsHTML = '';

      let lastTop0Center = -999;
      let lastTop13Center = -999;

      sortedEntries.forEach((c, idx) => {
        const sMins = timeToMinutes(c.start);
        const eMins = timeToMinutes(c.end);
        const left = ((sMins - minMins) / safeTotal) * 100;
        const width = ((eMins - sMins) / safeTotal) * 100;
        segmentsHTML += `<div class="ds-segment ${c.stage.toLowerCase()}" style="left:${left}%;width:${width}%;"></div>`;

        const centerPct = left + width / 2;
        let topOffset = 0;

        if (centerPct - lastTop0Center >= 10) {
          topOffset = 0;
          lastTop0Center = centerPct;
        } else {
          topOffset = 13;
          lastTop13Center = centerPct;
        }

        let labelName = c.artist;
        if (labelName.length > 8 && labelName.includes(" ")) {
          labelName = labelName.replace(" ", "<br>");
        }
        labelsHTML += `<div class="ds-label ${c.stage.toLowerCase()}" style="left:${centerPct}%; top:${topOffset}px;">${labelName}</div>`;
      });

      const numC = parsedEntries.length;
      summaryDiv.innerHTML = `
        <div class="day-summary-text">${startLabel} &rarr; ${endLabel} &bull; ${numC} gig${numC > 1 ? 's' : ''}</div>
        <div class="day-summary-bar">${segmentsHTML}</div>
        <div class="day-summary-labels">${labelsHTML}</div>
      `;
      section.appendChild(summaryDiv);
    }

    const scheduleList = document.createElement("div");
    scheduleList.className = "schedule-list";

    entriesArr
      .sort((a, b) => timeToSortableNumber(JSON.parse(a).start) - timeToSortableNumber(JSON.parse(b).start))
      .forEach(entry => {
        const parsed = JSON.parse(entry);
        const item = document.createElement("div");
        item.className = `schedule-item ${parsed.stage.toLowerCase()}`;
        const conflict = hasConflict(entry, Array.from(selectedArtists[day]));
        if (conflict) item.classList.add("conflict");

        // amigos que vão a este concerto
        const attendingFriends = friendsData.filter(f => f.concerts.includes(parsed.artist));
        let friendsHTML = '';
        if (attendingFriends.length > 0) {
          friendsHTML = '<div class="friends-avatars">';
          attendingFriends.forEach(f => {
            const initial = f.name.charAt(0).toUpperCase();
            friendsHTML += `<div class="friend-avatar" style="background-color: ${f.color}" title="${f.name}">${initial}</div>`;
          });
          friendsHTML += '</div>';
        }

        item.innerHTML = `
          <div class="schedule-time-stacked">
            <span class="time-start">${parsed.start}</span>
            <span class="time-end">${parsed.end}</span>
          </div>
          <div class="schedule-item-content">
            <div class="schedule-artist">${parsed.artist}</div>
            <div class="schedule-details">
              <span class="stage-badge">${parsed.stage}</span>
              ${friendsHTML}
            </div>
          </div>
          ${conflict ? '<div class="schedule-conflict-badge">oops</div>' : ''}
        `;
        scheduleList.appendChild(item);
      });

    section.appendChild(scheduleList);
    selectedContainer.appendChild(section);
  });

  if (Object.keys(selectedArtists).some(day => selectedArtists[day].size > 0)) {
    const footer = document.createElement("div");
    footer.className = "selected-footer";
    selectedContainer.appendChild(footer);
  }

  // update schedule grid
  document.querySelectorAll('td.selectable').forEach(td => {
    const artist = td.getAttribute('data-artist');
    const container = td.querySelector('.grid-friends-container');
    if (!container) return;

    const attendingFriends = friendsData.filter(f => f.concerts.includes(artist));
    if (attendingFriends.length > 0) {
      let friendsHTML = '<div class="friends-avatars" style="margin-top: 6px; justify-content: center;">';
      attendingFriends.forEach(f => {
        const initial = f.name.charAt(0).toUpperCase();
        friendsHTML += `<div class="friend-avatar" style="background-color: ${f.color}; width: 16px; height: 16px; font-size: 0.55rem; border: 1px solid rgba(0,0,0,0.1);" title="${f.name}">${initial}</div>`;
      });
      friendsHTML += '</div>';
      container.innerHTML = friendsHTML;
    } else {
      container.innerHTML = '';
    }
  });
}

function saveSelectedArtists() {
  try {
    localStorage.setItem('selectedArtists', JSON.stringify(
      Object.fromEntries(Object.entries(selectedArtists).map(([day, set]) => [day, Array.from(set)]))
    ));
  } catch (e) { }
}

// ── exportar imagem ──────────────────────────────────────────────────────
document.getElementById('download-image').addEventListener('click', async () => {
  const selectedArtistsDiv = document.querySelector('.selected-artists');
  const button = document.getElementById('download-image');

  const daySections = Array.from(selectedArtistsDiv.querySelectorAll('.selected-day-section'));
  if (daySections.length === 0) return;

  button.style.display = 'none';

  const parent = selectedArtistsDiv.parentNode;
  const nextSibling = selectedArtistsDiv.nextSibling;
  const originalInline = {
    width: selectedArtistsDiv.style.width || '',
    background: selectedArtistsDiv.style.background || '',
    backgroundColor: selectedArtistsDiv.style.backgroundColor || '',
    border: selectedArtistsDiv.style.border || '',
    borderRadius: selectedArtistsDiv.style.borderRadius || '',
    boxShadow: selectedArtistsDiv.style.boxShadow || '',
    backdropFilter: selectedArtistsDiv.style.backdropFilter || '',
    color: selectedArtistsDiv.style.color || '',
    margin: selectedArtistsDiv.style.margin || '',
    padding: selectedArtistsDiv.style.padding || '',
    transform: selectedArtistsDiv.style.transform || '',
    transformOrigin: selectedArtistsDiv.style.transformOrigin || ''
  };

  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = `position:absolute;left:-9999px;top:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#edf1f2;`;

  const frameInner = document.createElement('div');
  frameInner.style.cssText = `background:#fff;border-radius:1.2rem;padding:2rem 1.5rem;width:92%;box-shadow:0 10px 30px rgba(0,0,0,0.1);display:flex;flex-direction:column;`;

  document.body.appendChild(wrapper);

  selectedArtistsDiv.style.cssText += `;background:transparent;border:none;border-radius:0px;box-shadow:none;color:#111;padding:0;margin:0;width:100%;max-width:none;transform:none;`;

  frameInner.appendChild(selectedArtistsDiv);
  wrapper.appendChild(frameInner);

  const exportScaleStyle = document.createElement('style');
  exportScaleStyle.innerHTML = `html { font-size: 17.5px !important; } @media (max-width: 900px) { html { font-size: 14.5px !important; } }`;
  document.head.appendChild(exportScaleStyle);

  for (let i = 0; i < daySections.length; i++) {
    const currentDay = daySections[i];
    daySections.forEach(ds => ds.style.display = (ds === currentDay) ? 'block' : 'none');

    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    const contentHeight = frameInner.scrollHeight;

    let wrapperW = 540;
    let wrapperH = 960;

    if (contentHeight > 880) {
      wrapperH = contentHeight + 80; // margens ligeiramente mais pequenas no topo e fundo
      wrapperW = wrapperH * (9 / 16);
    }

    wrapper.style.width = wrapperW + 'px';
    wrapper.style.height = wrapperH + 'px';

    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    try {
      const scale = 1080 / wrapperW;
      const canvas = await html2canvas(wrapper, {
        scale: scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: wrapperW,
        height: wrapperH
      });
      const link = document.createElement('a');
      const dayNameText = currentDay.querySelector('h3').textContent.replace(/ /g, '_').toLowerCase();
      link.download = `primavera-sound-${dayNameText}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('Error generating image:', err);
    }
  }

  daySections.forEach(ds => ds.style.display = '');
  if (nextSibling) parent.insertBefore(selectedArtistsDiv, nextSibling);
  else parent.appendChild(selectedArtistsDiv);
  wrapper.remove();
  exportScaleStyle.remove();
  Object.entries(originalInline).forEach(([k, v]) => selectedArtistsDiv.style[k] = v);
  button.style.display = 'block';
});

// opcoes user
function showFlash(message) {
  const flash = document.getElementById('flash-message');
  flash.textContent = message;
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 3000);
}

// criar o grupo
document.getElementById('create-group').addEventListener('click', () => {
  document.getElementById('create-modal').style.display = 'flex';
  document.getElementById('create-name-input').focus();
});
document.getElementById('create-cancel').addEventListener('click', () => {
  document.getElementById('create-modal').style.display = 'none';
});
document.getElementById('create-confirm').addEventListener('click', () => {
  const name = document.getElementById('create-name-input').value.trim();
  if (name) {
    const groupId = Math.random().toString(36).substring(2, 6).toUpperCase();
    currentGroupId = groupId;
    currentUserName = name;
    localStorage.setItem('currentGroupId', currentGroupId);
    localStorage.setItem('currentUserName', currentUserName);

    document.getElementById('create-modal').style.display = 'none';
    setupGroupListener();
    updateGroupData();
    showFlash(`Group created! Code: ${groupId}`);
  }
});

// entrar num grupo
document.getElementById('join-group').addEventListener('click', () => {
  document.getElementById('join-modal').style.display = 'flex';
  document.getElementById('join-code-input').focus();
});
document.getElementById('join-cancel').addEventListener('click', () => {
  document.getElementById('join-modal').style.display = 'none';
});
document.getElementById('join-confirm').addEventListener('click', async () => {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  const name = document.getElementById('join-name-input').value.trim();
  if (code && name) {
    try {
      const groupRef = doc(db, "groups", code);
      const docSnap = await getDoc(groupRef);
      if (!docSnap.exists()) {
        showFlash("Group not found!");
        return;
      }
    } catch (err) {
      showFlash("Error: " + err.message);
      return;
    }

    currentGroupId = code;
    currentUserName = name;
    localStorage.setItem('currentGroupId', currentGroupId);
    localStorage.setItem('currentUserName', currentUserName);

    document.getElementById('join-modal').style.display = 'none';
    setupGroupListener();
    updateGroupData();
    showFlash(`Joined group: ${code}`);
  }
});

// sair de um grupo
document.getElementById('leave-group').addEventListener('click', () => {
  if (confirm("Are you sure you want to exit the group?")) {
    if (groupUnsubscribe) {
      groupUnsubscribe();
      groupUnsubscribe = null;
    }
    currentGroupId = null;
    currentUserName = null;
    localStorage.removeItem('currentGroupId');
    localStorage.removeItem('currentUserName');
    friendsData = [];
    setupGroupListener();
    updateSelectedArtists();
    showFlash("You left the group.");
  }
});

// lógica de limpar horário removida


updateSelectedArtists();
