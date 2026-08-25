import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'features-v03', 'runtime.js'), 'utf8');

globalThis.__YO_KOEKONE_IMPROVED_FEATURE_TEST_HOOK__ = {};
vm.runInThisContext(source, { filename: 'src/features-v03/runtime.js' });
const api = globalThis.__YO_KOEKONE_IMPROVED_FEATURE_TEST_HOOK__;

function assert(condition, message) { if (!condition) throw new Error(message); }
function same(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  assert(a === e, `${label}\nexpected ${e}\nactual   ${a}`);
}

same(api.canonicalSubjectSlug('Terveystieto'), 'terveystieto', 'basic subject slug');
same(api.canonicalSubjectSlug('Biologia'), 'biologia', 'second subject slug');
same(api.canonicalSubjectSlug('Matematiikka, lyhyt oppimäärä'), 'matematiikka-lyhyt', 'short math slug');
same(api.canonicalSubjectSlug('Englanti, lyhyt oppimäärä'), 'englanti-lyhyt', 'short English slug');
same(api.canonicalExamSlug('Terveystieto syksy 2025', 'Terveystieto'), '2025-syksy', 'exam slug');
same(api.canonicalExamSlug('Terveystieto kevät 2026', 'Terveystieto'), '2026-kevat', 'spring exam slug is ASCII');
same(api.routeToHash({ kind: 'exam', subject: 'englanti-pitkä', exam: '2026-kevät' }), '#/englanti-pitka/2026-kevat', 'feature routes are ASCII');
same(api.parseRoute('#/terveystieto/2026-kev%C3%A4t'), { kind: 'exam', subject: 'terveystieto', exam: '2026-kevat', task: null }, 'feature legacy spring route canonicalizes to ASCII');
same(api.routeToHash({ kind: 'exam', subject: 'terveystieto', exam: '2025-syksy' }), '#/terveystieto/2025-syksy', 'exam new-tab route');
same(api.routeToHash({ kind: 'questions', subject: 'terveystieto', question: 1, material: true, noMaterial: false }), '#/terveystieto/kysymykset?aineisto=1', 'question route');
same(api.parseRoute('#/terveystieto/2025-syksy/tehtava-7'), { kind: 'task', subject: 'terveystieto', exam: '2025-syksy', task: '7' }, 'parse task');
assert(api.isNewTabGesture({ button: 1, ctrlKey: false, metaKey: false }), 'middle click');
assert(api.isNewTabGesture({ button: 0, ctrlKey: true, metaKey: false }), 'Ctrl-click');
assert(api.isNewTabGesture({ button: 0, ctrlKey: false, metaKey: true }), 'Cmd-click');
assert(!api.isNewTabGesture({ button: 0, ctrlKey: false, metaKey: false }), 'normal click');

same(api.backToSelectionRoute({ kind: 'exam', subject: 'terveystieto', exam: '2025-syksy' }), {
  kind: 'subject', subject: 'terveystieto'
}, 'exam back-to-selection route');
same(api.backToSelectionRoute({ kind: 'questions', subject: 'biologia', question: 3 }), {
  kind: 'subject', subject: 'biologia'
}, 'question-practice back-to-selection route');
same(api.backToSelectionRoute(null, 'historia'), { kind: 'subject', subject: 'historia' }, 'back route fallback subject');
same(api.backToSelectionRoute(null, ''), null, 'back route without subject fails open');

same(api.normalizeDraft({ type: 'essay', value: 'abc', updatedAt: 1 }), {
  type: 'controls', controls: { essay: { type: 'essay', value: 'abc' } }, updatedAt: 1
}, 'legacy essay migration');
same(api.normalizeDraft({ type: 'radio', optionId: 7 }), {
  type: 'controls', controls: { radio: { type: 'radio', optionId: '7' } }, updatedAt: 0
}, 'legacy radio migration');

let draft = api.mergeDraftControl(null, 'gap:31', { type: 'gap-text', optionIndex: '31', value: 'first' });
draft = api.mergeDraftControl(draft, 'gap:32', { type: 'gap-text', optionIndex: '32', value: 'second' });
draft = api.mergeDraftControl(draft, 'gap:40', {
  type: 'gap-select', optionIndex: '40', value: 'Option B', selectedIndex: 2, selectedText: 'Option B'
});
assert(Object.keys(draft.controls).length === 3, 'multi-control question keeps all gap controls');
same(draft.controls['gap:31'], { type: 'gap-text', optionIndex: '31', value: 'first' }, 'first short-answer control');
same(draft.controls['gap:40'], {
  type: 'gap-select', optionIndex: '40', value: 'Option B', selectedIndex: 2, selectedText: 'Option B'
}, 'dropdown control');

same(api.normalizeDraft({
  type: 'controls',
  controls: { 'gap:9': { type: 'gap-select', optionIndex: '9', value: '', selectedIndex: 2, selectedText: '2' } }
}), {
  type: 'controls',
  controls: { 'gap:9': { type: 'gap-select', optionIndex: '9', value: '', selectedIndex: 2, selectedText: '2' } },
  updatedAt: 0
}, 'dropdown draft can retain a legitimate non-placeholder option with an empty value');

draft = api.mergeDraftControl(draft, 'gap:31', null);
assert(!draft.controls['gap:31'] && draft.controls['gap:32'], 'clearing one gap does not erase sibling gaps');
draft = api.mergeDraftControl(draft, 'gap:32', null);
draft = api.mergeDraftControl(draft, 'gap:40', null);
assert(draft === null, 'empty question draft collapses to null');

// Restore suppression is reference-counted because overlapping Review/Clear or
// bulk actions can target the same question at the same time. One completed
// action must not accidentally release another action's hold.
const refs = api.createIdRefCounter();
refs.add(['q1']);
refs.add(['q1', 'q2']);
assert(refs.has('q1') && refs.has('q2'), 'reference counter tracks multiple ids');
refs.remove(['q1']);
assert(refs.has('q1'), 'one release keeps an overlapping q1 hold');
refs.remove(['q1']);
assert(!refs.has('q1') && refs.has('q2'), 'second release clears q1 only');
refs.remove(['q2']);
assert(refs.ids().length === 0, 'all holds can be released');
refs.add(['same', 'same']);
refs.remove(['same']);
assert(!refs.has('same'), 'duplicate ids inside one action count once');

delete globalThis.__YO_KOEKONE_IMPROVED_FEATURE_TEST_HOOK__;
console.log('Feature tests passed.');
