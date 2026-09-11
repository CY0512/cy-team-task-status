const SUPABASE_URL = "https://qplhnawqfdpgeparwcjm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kfl9j78-4gCzZPS20XQSiw_6ToDlwha";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const state = { child: new URLSearchParams(location.search).get("child") || "Hong Yi", subjects: ["Pengajian Am (PA)", "Economics", "Math", "Perniagaan"], selected: "", active: null, timer: null };
const $ = (selector) => document.querySelector(selector);
const icons = { "Pengajian Am (PA)": "🇲🇾", Economics: "💰", Math: "🔢", Perniagaan: "💼" };
function showMessage(text = "") { $("#message").textContent = text; }
function formatMinutes(value) { return `${value || 0} min`; }
function showScreen(id) { document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("visible")); $(`#${id}`).classList.add("visible"); }
function renderSubjects() { $("#subjects").innerHTML = state.subjects.map((subject) => `<button type="button" data-subject="${subject}">${icons[subject] || "📚"} ${subject}</button>`).join(""); document.querySelectorAll("[data-subject]").forEach((button) => button.addEventListener("click", () => { state.selected = button.dataset.subject; document.querySelectorAll("[data-subject]").forEach((item) => item.classList.toggle("selected", item === button)); })); }
function renderSessions(sessions) { $("#recent-list").innerHTML = sessions.length ? sessions.slice(0, 5).map((session) => `<div class="session"><div class="session-top"><span>${icons[session.subject] || "📚"} ${session.subject}</span><span>${formatMinutes(session.duration_minutes)}</span></div><div class="session-date">${session.study_date} · ${new Date(session.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div></div>`).join("") : '<div class="empty">No study sessions yet 🌱</div>'; }
function renderWeekly(rows) { const totals = { Delson: Array(7).fill(0), "Hong Yi": Array(7).fill(0) }; const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); rows.forEach((row) => { const day = new Date(`${row.study_date}T00:00:00`); const index = Math.round((day - monday) / 86400000); if (index >= 0 && index < 7 && totals[row.child]) totals[row.child][index] += row.duration_minutes || 0; }); const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]; const average = (values) => values.reduce((sum, value) => sum + value, 0) / 7; const rowsHtml = days.map((day, index) => `<tr><td>${day}</td><td>${formatMinutes(totals.Delson[index])}</td><td>${formatMinutes(totals["Hong Yi"][index])}</td></tr>`).join(""); const averageHtml = `<tr><td>Average hour</td><td>${formatMinutes(Math.round(average(totals.Delson)))}</td><td>${formatMinutes(Math.round(average(totals["Hong Yi"])))}</td></tr>`; $("#weekly").innerHTML = rowsHtml; $("#timer-weekly").innerHTML = rowsHtml; $("#timer-weekly-average").innerHTML = averageHtml; $("#week-label").textContent = "This week"; }
function updateClock() { if (!state.active) return; const seconds = Math.floor((Date.now() - state.active.startTimestamp) / 1000); $("#clock").textContent = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, "0")).join(":"); }
async function loadHome() { try { const { data: sessions, error: sessionError } = await db.from("study_sessions").select("*").eq("child", state.child).order("created_at", { ascending: false }).limit(10); if (sessionError) throw sessionError; const { data: allSessions, error: allError } = await db.from("study_sessions").select("child,study_date,duration_minutes"); if (allError) throw allError; renderSessions(sessions || []); renderWeekly(allSessions || []); const { data: active, error: activeError } = await db.from("active_sessions").select("*").eq("child", state.child).maybeSingle(); if (activeError) throw activeError; if (active) beginTimer({ ...active, startTimestamp: new Date(active.started_at).getTime(), subject: active.subject }); } catch (error) { showMessage(error.message); } }
function beginTimer(active) { state.active = active; $("#timer-subject").textContent = active.subject; showScreen("timer"); clearInterval(state.timer); updateClock(); state.timer = setInterval(updateClock, 1000); }
async function startStudy() { if (!state.selected) return showMessage("Choose a subject first."); try { const { data: existing } = await db.from("active_sessions").select("id").eq("child", state.child).maybeSingle(); if (existing) throw new Error("A study session is already running."); const { data, error } = await db.from("active_sessions").insert({ child: state.child, subject: state.selected }).select().single(); if (error) throw error; beginTimer({ ...data, startTimestamp: new Date(data.started_at).getTime() }); } catch (error) { showMessage(error.message); } }
function finishStudy() { clearInterval(state.timer); $("#learned").value = ""; $("#photo").value = ""; $("#preview").style.display = "none"; showScreen("complete"); }
function compressImage(file) {
  const maxDimension = 1280;
  const quality = 0.7;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("The selected photo could not be compressed."));
          return;
        }
        resolve(blob);
      }, "image/jpeg", quality);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected photo could not be read."));
    };
    image.src = objectUrl;
  });
}

async function saveSession() { const learned = $("#learned").value.trim(); if (!learned) return showMessage("Please tell us what you learned."); try { showMessage("Compressing photo and saving..."); let photoUrl = ""; const file = $("#photo").files[0]; if (file) { const compressedPhoto = await compressImage(file); const filePath = `${state.child}/${crypto.randomUUID()}.jpg`; const upload = await db.storage.from("study-photos").upload(filePath, compressedPhoto, { contentType: "image/jpeg", cacheControl: "31536000" }); if (upload.error) throw upload.error; photoUrl = db.storage.from("study-photos").getPublicUrl(filePath).data.publicUrl; } const end = new Date(); const duration = Math.max(1, Math.round((end.getTime() - state.active.startTimestamp) / 60000)); const { error: insertError } = await db.from("study_sessions").insert({ child: state.child, subject: state.active.subject, started_at: new Date(state.active.startTimestamp).toISOString(), ended_at: end.toISOString(), duration_minutes: duration, learned, photo_url: photoUrl }); if (insertError) throw insertError; const { error: deleteError } = await db.from("active_sessions").delete().eq("child", state.child); if (deleteError) throw deleteError; state.active = null; showMessage("Study session saved!"); showScreen("home"); await loadHome(); } catch (error) { showMessage(error.message); } }
async function init() { if (SUPABASE_URL.includes("PASTE_") || SUPABASE_ANON_KEY.includes("PASTE_")) return showMessage("Add your Supabase URL and anon key in public/app.js."); $("#child").innerHTML = ["Hong Yi", "Delson"].map((child) => `<option>${child}</option>`).join(""); $("#child").value = state.child; $("#child-name").textContent = state.child; renderSubjects(); if (new URLSearchParams(location.search).get("child")) chooseChild(state.child); else { $("#choose-child").style.display = "grid"; $(".app").hidden = true; } }
function chooseChild(child) { state.child = child; history.replaceState(null, "", `?child=${encodeURIComponent(child)}`); $("#child-name").textContent = child; $("#child").value = child; $("#choose-child").style.display = "none"; $(".app").hidden = false; loadHome(); }
$("#child").addEventListener("change", (event) => { state.child = event.target.value; $("#child-name").textContent = state.child; history.replaceState(null, "", `?child=${encodeURIComponent(state.child)}`); state.active = null; showScreen("home"); loadHome(); });
$("#start").addEventListener("click", startStudy); $("#finish").addEventListener("click", finishStudy); $("#save").addEventListener("click", saveSession); $("#cancel").addEventListener("click", () => { state.active ? beginTimer(state.active) : showScreen("home"); }); $("#photo").addEventListener("change", (event) => { const file = event.target.files[0]; if (!file) return; $("#preview").src = URL.createObjectURL(file); $("#preview").style.display = "block"; });
init();
document.querySelectorAll("[data-child]").forEach((button) => button.addEventListener("click", () => chooseChild(button.dataset.child)));
