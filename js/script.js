import { getFirestore, doc, setDoc, updateDoc, onSnapshot, getDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { festivals } from "./festival-data.js";

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

// Festival, palco e concertos estão definidos em festival-data.js.
const festivalSelector = document.getElementById("festival-selector");
const festivalPickerToggle = document.getElementById("festival-picker-toggle");
const festivalOptions = document.getElementById("festival-options");
const festivalIds = Object.keys(festivals);
const requestedFestivalId = new URLSearchParams(window.location.search).get("festival");
const activeFestivalId = festivals[requestedFestivalId] ? requestedFestivalId : festivalIds[0];
const festival = festivals[activeFestivalId];
const data = festival.days;
const stages = festival.stages;
const festivalTheme = festival.theme || {};
const rootStyles = document.documentElement.style;
if (festivalTheme.primary) rootStyles.setProperty("--festival-primary", festivalTheme.primary);
if (festivalTheme.secondary) rootStyles.setProperty("--festival-secondary", festivalTheme.secondary);
if (festivalTheme.highlight) rootStyles.setProperty("--festival-highlight", festivalTheme.highlight);
if (festivalTheme.clearDayBackground) rootStyles.setProperty("--clear-day-background", festivalTheme.clearDayBackground);
if (festivalTheme.background) rootStyles.setProperty("--festival-background", festivalTheme.background);
if (festivalTheme.surface) rootStyles.setProperty("--festival-surface", festivalTheme.surface);
if (festival.branding) rootStyles.setProperty("--festival-title-font", '"Arial Black", Arial, sans-serif');
const selectedArtists = {};
const container = document.getElementById("schedule");
const selectedContainer = document.getElementById("selected-artists-list");

festivalSelector.hidden = festivalIds.length < 2;
function closeFestivalPicker(returnFocus = false) {
  festivalOptions.hidden = true;
  festivalPickerToggle.setAttribute("aria-expanded", "false");
  festivalPickerToggle.setAttribute("aria-label", "Escolher festival");
  if (returnFocus) festivalPickerToggle.focus();
}

festivalPickerToggle.addEventListener("click", () => {
  const isExpanded = festivalPickerToggle.getAttribute("aria-expanded") === "true";
  festivalOptions.hidden = isExpanded;
  festivalPickerToggle.setAttribute("aria-expanded", String(!isExpanded));
  festivalPickerToggle.setAttribute("aria-label", isExpanded ? "Escolher festival" : "Fechar opções de festival");
});

document.addEventListener("click", event => {
  if (!festivalSelector.contains(event.target)) closeFestivalPicker();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && festivalPickerToggle.getAttribute("aria-expanded") === "true") {
    closeFestivalPicker(true);
  }
});

festivalIds.forEach(id => {
  const festivalLink = document.createElement("a");
  const festivalUrl = new URL(window.location.href);
  festivalUrl.searchParams.set("festival", id);
  festivalLink.href = festivalUrl.toString();
  festivalLink.className = "festival-option";
  festivalLink.textContent = `${festivals[id].name} — ${festivals[id].location}`;
  if (id === activeFestivalId) {
    festivalLink.classList.add("active");
    festivalLink.setAttribute("aria-current", "page");
  }
  festivalOptions.appendChild(festivalLink);
});
const hero = document.querySelector(".hero");
const heroLogo = document.querySelector(".hero-logo");
const heroWordmark = document.getElementById("festival-wordmark");
const heroTitle = document.querySelector(".hero-text span:first-child");
const heroSubtitle = document.querySelector(".hero-text span:last-child");
if (festival.branding) {
  heroLogo.hidden = true;
  heroWordmark.hidden = false;
  heroWordmark.setAttribute("aria-label", festival.name);
  heroWordmark.querySelectorAll("span").forEach((line, index) => {
    line.textContent = festival.branding.wordmark[index] || "";
  });
  heroTitle.textContent = festival.branding.title;
  heroSubtitle.textContent = festival.branding.subtitle;
  hero.classList.add("hero-wordmark-layout");
} else {
  heroTitle.textContent = festival.name;
  heroSubtitle.textContent = festival.location;
  if (festival.logo) {
    heroLogo.src = festival.logo;
  } else {
    heroLogo.hidden = true;
  }
}
document.querySelector(".selected-title-group h2").textContent = `${festival.name} ${festival.location}`;
document.title = `${festival.name} ${festival.location} — Festival Schedule`;

function concertId(day, artist) {
  return `${activeFestivalId}::${day}::${artist}`;
}

function friendAttends(friend, day, artist) {
  return friend.concerts.includes(concertId(day, artist)) || friend.concerts.includes(artist);
}

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
          concerts: info.concertsByFestival?.[activeFestivalId] || info.concerts || []
        });
      });
      updateSelectedArtists();
      updateGroupMembersUI();
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
      userConcerts.push(concertId(day, parsed.artist));
    });
  });

  const groupRef = doc(db, "groups", currentGroupId);
  updateDoc(groupRef, {
    [`members.${currentUserName}.concertsByFestival.${activeFestivalId}`]: userConcerts
  }).catch(err => {
    // Se o documento não existir ainda
    setDoc(groupRef, {
      members: {
        [currentUserName]: { concertsByFestival: { [activeFestivalId]: userConcerts } }
      }
    }, { merge: true }).catch(err2 => {
      showFlash("Save Error: " + err2.message);
      console.error("Firebase Set Error:", err2);
    });
  });
}

setupGroupListener();

// Seleções guardadas separadamente por festival.
const selectionStorageKey = `selectedArtists:${activeFestivalId}`;
try {
  const saved = localStorage.getItem(selectionStorageKey) ||
    (activeFestivalId === festivalIds[0] ? localStorage.getItem("selectedArtists") : null);
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.keys(parsed).forEach(day => selectedArtists[day] = new Set(parsed[day]));
  }
} catch (error) {
  showFlash("Could not load saved selections.");
  console.error("Saved selection error:", error);
}

// ── build tables ─────────────────────────────────────────────────────────
const days = [...new Set([...Object.keys(data), ...Object.keys(festival.artistsWithoutSchedule || {})])];
days.forEach(day => {
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

    dayDiv.querySelectorAll('.selectable.selected').forEach(item => item.classList.remove('selected'));

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

  (data[day] || []).forEach(([start, end, stage, artist]) => {
    if (!concertsByStage[stage]) return;
    concertsByStage[stage].push({
      artist, stage, start, end,
      startMins: timeToMinutes(start),
      endMins: timeToMinutes(end)
    });
  });

  // 30 minutos slots
  let allMins = [];
  (data[day] || []).forEach(([start, end]) => {
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
      td.setAttribute("data-day", day);
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
  if ((data[day] || []).length > 0) {
    dayDiv.appendChild(table);
  }

  const unscheduledArtists = festival.artistsWithoutSchedule?.[day] || [];
  if (unscheduledArtists.length > 0) {
    const unscheduledHeading = document.createElement("h3");
    unscheduledHeading.className = "unscheduled-heading";
    unscheduledHeading.textContent = "Artists — schedule to be announced";
    dayDiv.appendChild(unscheduledHeading);

    const unscheduledList = document.createElement("div");
    unscheduledList.className = "unscheduled-list";
    unscheduledArtists.forEach(artist => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "unscheduled-artist selectable";
      card.dataset.artist = artist;
      card.dataset.day = day;
      const entry = JSON.stringify({ artist, stage: "TBA", start: null, end: null, unscheduled: true });
      card.classList.toggle("selected", selectedArtists[day].has(entry));
      card.innerHTML = `<span class="concert-artist"></span><span class="concert-time">Horário por anunciar</span><span class="grid-friends-container"></span>`;
      card.querySelector(".concert-artist").textContent = artist;
      card.addEventListener("click", () => {
        if (selectedArtists[day].has(entry)) {
          selectedArtists[day].delete(entry);
          card.classList.remove("selected");
        } else {
          selectedArtists[day].add(entry);
          card.classList.add("selected");
        }
        updateSelectedArtists();
        saveSelectedArtists();
        updateGroupData();
      });
      unscheduledList.appendChild(card);
    });
    dayDiv.appendChild(unscheduledList);
  }

  container.appendChild(dayDiv);
});

// ── artistas selecionados ──────────────────────────────────────
function hasConflict(currentEntry, allEntries) {
  const current = JSON.parse(currentEntry);
  if (!current.start || !current.end) return false;
  const currentStart = timeToMinutes(current.start);
  const currentEnd = timeToMinutes(current.end);
  return allEntries.some(entry => {
    if (entry === currentEntry) return false;
    const other = JSON.parse(entry);
    if (!other.start || !other.end) return false;
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
    const scheduledEntries = parsedEntries.filter(entry => entry.start && entry.end);

    if (scheduledEntries.length > 0) {
      let minMins = Math.min(...scheduledEntries.map(e => timeToMinutes(e.start)));
      let maxMins = Math.max(...scheduledEntries.map(e => timeToMinutes(e.end)));
      const totalMins = maxMins - minMins;
      const safeTotal = totalMins > 0 ? totalMins : 1;

      const summaryDiv = document.createElement("div");
      summaryDiv.className = "day-summary";

      const sortedByStart = [...scheduledEntries].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      const sortedByEnd = [...scheduledEntries].sort((a, b) => timeToMinutes(a.end) - timeToMinutes(b.end));
      const startLabel = sortedByStart[0].start;
      const endLabel = sortedByEnd[sortedByEnd.length - 1].end;

      const sortedEntries = [...scheduledEntries].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
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

      const numC = scheduledEntries.length;
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
      .sort((a, b) => {
        const first = JSON.parse(a);
        const second = JSON.parse(b);
        if (!first.start) return second.start ? 1 : 0;
        if (!second.start) return -1;
        return timeToSortableNumber(first.start) - timeToSortableNumber(second.start);
      })
      .forEach(entry => {
        const parsed = JSON.parse(entry);
        const item = document.createElement("div");
        item.className = `schedule-item ${parsed.stage.toLowerCase()}`;
        const conflict = !parsed.unscheduled && hasConflict(entry, Array.from(selectedArtists[day]));
        if (conflict) item.classList.add("conflict");

        // amigos que vão a este concerto
        const attendingFriends = friendsData.filter(f => friendAttends(f, day, parsed.artist));
        let friendsHTML = '';
        if (attendingFriends.length > 0) {
          friendsHTML = '<div class="friends-avatars">';
          attendingFriends.forEach(f => {
            const initial = f.name.charAt(0).toUpperCase();
            friendsHTML += `<div class="friend-avatar" style="background-color: ${f.color}" title="${f.name}">${initial}</div>`;
          });
          friendsHTML += '</div>';
        }

        item.innerHTML = parsed.unscheduled ? `
          <div class="schedule-item-content">
            <div class="schedule-artist">${parsed.artist}</div>
            <div class="schedule-details">
              <span class="stage-badge">Horário por anunciar</span>
              ${friendsHTML}
            </div>
          </div>
        ` : `
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
  document.querySelectorAll('td.selectable, .unscheduled-artist').forEach(td => {
    const artist = td.getAttribute('data-artist');
    const day = td.getAttribute('data-day');
    const container = td.querySelector('.grid-friends-container');
    if (!container) return;

    const attendingFriends = friendsData.filter(f => friendAttends(f, day, artist));
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
    localStorage.setItem(selectionStorageKey, JSON.stringify(
      Object.fromEntries(Object.entries(selectedArtists).map(([day, set]) => [day, Array.from(set)]))
    ));
  } catch (error) {
    showFlash("Could not save your selections.");
    console.error("Save selection error:", error);
  }
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

// Funções de Interface
function showFlash(message) {
  const flash = document.getElementById('flash-message');
  flash.textContent = message;
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 3000);
}

function updateGroupMembersUI() {
  const membersListEl = document.getElementById('group-members-list');
  if (!currentGroupId || friendsData.length === 0) {
    membersListEl.style.display = 'none';
    return;
  }

  let html = `<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 0.5rem;">`;
  friendsData.forEach(f => {
    html += `<span style="display: flex; align-items: center; gap: 0.3rem; background: #f8f9fa; padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid rgba(0,0,0,0.05); font-weight: 600; color: rgb(85, 85, 85);">
      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${f.color};"></span>
      ${f.name}
    </span>`;
  });
  html += `</div>`;

  membersListEl.innerHTML = html;
  membersListEl.style.display = 'block';
}

document.getElementById('group-code-display').addEventListener('click', async () => {
  if (currentGroupId) {
    try {
      await navigator.clipboard.writeText(currentGroupId);
      showFlash("Code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
});

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
  document.getElementById('leave-modal').style.display = 'flex';
});

document.getElementById('leave-cancel').addEventListener('click', () => {
  document.getElementById('leave-modal').style.display = 'none';
});

document.getElementById('leave-confirm').addEventListener('click', async () => {
  document.getElementById('leave-modal').style.display = 'none';
  if (currentGroupId && currentUserName) {
    const groupRef = doc(db, "groups", currentGroupId);
    try {
      await updateDoc(groupRef, {
        [`members.${currentUserName}`]: deleteField()
      });
    } catch (err) {
      console.error("Error removing member:", err);
    }
  }

  if (groupUnsubscribe) {
    groupUnsubscribe();
    groupUnsubscribe = null;
  }

  currentGroupId = null;
  currentUserName = null;
  localStorage.removeItem('currentGroupId');
  localStorage.removeItem('currentUserName');

  friendsData = [];
  updateSelectedArtists(); // trigger redraw to remove avatars
  updateGroupMembersUI();

  document.getElementById('active-group-info').style.display = 'none';
  document.getElementById('leave-group').style.display = 'none';
  document.getElementById('create-group').style.display = '';
  document.getElementById('join-group').style.display = '';
  showFlash("You left the group.");
});

// lógica de limpar horário removida


updateSelectedArtists();
