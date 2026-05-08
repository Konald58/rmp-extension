const preset = document.getElementById("preset");
const customField = document.getElementById("customField");
const customUrl = document.getElementById("customUrl");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

const DEFAULT_SCHOOL = { id: "1262", name: "USF — Tampa" };

// Encode numeric school ID as RMP's GraphQL schoolID format ("School-1262" → base64)
function encodeSchoolId(numericId) {
  return btoa(`School-${numericId}`);
}

function extractIdFromUrl(input) {
  const m = String(input).match(/\/school\/(\d+)/);
  return m ? m[1] : null;
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.className = "status show" + (isError ? " error" : "");
}

// Load current selection
chrome.storage.sync.get(["schoolId", "schoolName"]).then((data) => {
  const id = data.schoolId || DEFAULT_SCHOOL.id;
  const matchingOption = preset.querySelector(`option[value="${id}"]`);
  if (matchingOption) {
    preset.value = id;
  } else {
    preset.value = "custom";
    customField.style.display = "block";
    customUrl.value = `https://www.ratemyprofessors.com/school/${id}`;
  }
});

preset.addEventListener("change", () => {
  customField.style.display = preset.value === "custom" ? "block" : "none";
});

saveBtn.addEventListener("click", async () => {
  let id, name;

  if (preset.value === "custom") {
    id = extractIdFromUrl(customUrl.value);
    if (!id) {
      showStatus("Couldn't read school ID from that URL.", true);
      return;
    }
    name = `School ${id}`;
  } else if (preset.value) {
    id = preset.value;
    name = preset.options[preset.selectedIndex].text;
  } else {
    showStatus("Pick a school first.", true);
    return;
  }

  await chrome.storage.sync.set({
    schoolId: id,
    schoolName: name,
    schoolGraphqlId: encodeSchoolId(id),
  });
  showStatus(`Saved — ${name}. Refresh Banner to see ratings.`);
});
