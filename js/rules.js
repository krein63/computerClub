'use strict';

const checklist = document.getElementById('departure-checklist');
const checkboxes = Array.from(checklist.querySelectorAll('input[type="checkbox"]'));
const progressLabel = document.getElementById('departure-progress');
const resetButton = document.getElementById('departure-reset');
const storageKey = 'topgame-departure-draft';
const maxDraftAge = 2 * 60 * 60 * 1000;

function getCheckedIds() {
  return checkboxes.filter(box => box.checked).map(box => box.value);
}

function readDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(storageKey));
    const age = draft && Date.now() - draft.savedAt;
    return draft && age >= 0 && age < maxDraftAge && Array.isArray(draft.ids) ? draft.ids : [];
  } catch {
    return [];
  }
}

function saveDraft(ids) {
  try {
    if (ids.length) sessionStorage.setItem(storageKey, JSON.stringify({ ids, savedAt: Date.now() }));
    else sessionStorage.removeItem(storageKey);
  } catch {
    // The checklist still works while this page remains open.
  }
}

function updateChecklist(save = false) {
  const ids = getCheckedIds();
  progressLabel.textContent = `Отмечено: ${ids.length} из ${checkboxes.length}`;
  resetButton.disabled = !ids.length;
  if (save) saveDraft(ids);
}

const savedIds = readDraft();
checkboxes.forEach(box => { box.checked = savedIds.includes(box.value); });
checklist.addEventListener('change', () => updateChecklist(true));
resetButton.addEventListener('click', () => {
  checkboxes.forEach(box => { box.checked = false; });
  updateChecklist(true);
  checkboxes[0].focus();
});
resetButton.hidden = false;
updateChecklist();
