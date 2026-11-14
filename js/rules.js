'use strict';

const checklist = document.getElementById('departure-checklist');
const boxes = Array.from(checklist.querySelectorAll('input[type="checkbox"]'));
const progress = document.getElementById('departure-progress');
const reset = document.getElementById('departure-reset');
const draftKey = 'topgame-departure-draft';
const draftLifetime = 2 * 60 * 60 * 1000;

function readDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey));
    const age = draft && Date.now() - draft.savedAt;
    return draft && age >= 0 && age < draftLifetime && Array.isArray(draft.ids) ? draft.ids : [];
  } catch {
    return [];
  }
}

function updateChecklist(save = false) {
  const ids = boxes.filter(box => box.checked).map(box => box.value);
  progress.textContent = `Отмечено: ${ids.length} из ${boxes.length}`;
  reset.disabled = !ids.length;
  if (!save) return;
  try {
    if (ids.length) sessionStorage.setItem(draftKey, JSON.stringify({ ids, savedAt: Date.now() }));
    else sessionStorage.removeItem(draftKey);
  } catch {
    // The checklist still works while this page remains open.
  }
}

const savedIds = readDraft();
boxes.forEach(box => { box.checked = savedIds.includes(box.value); });
checklist.addEventListener('change', () => updateChecklist(true));
reset.addEventListener('click', () => {
  boxes.forEach(box => { box.checked = false; });
  updateChecklist(true);
  boxes[0].focus();
});
reset.hidden = false;
updateChecklist();
