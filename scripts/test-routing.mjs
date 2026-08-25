import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'core.js'), 'utf8');

globalThis.__YO_KOEKONE_IMPROVED_TEST_HOOK__ = {};
vm.runInThisContext(source, { filename: 'src/core.js' });
const api = globalThis.__YO_KOEKONE_IMPROVED_TEST_HOOK__;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function same(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  assert(a === e, `${label}\nexpected ${e}\nactual   ${a}`);
}

same(api.routeToHash({ kind: 'home' }), '', 'home route stays on the clean Yle URL');
same(api.routeToHash({ kind: 'subject', subject: 'terveystieto' }), '#/terveystieto', 'subject route');
same(api.routeToHash({ kind: 'exam', subject: 'terveystieto', exam: '2025-syksy' }), '#/terveystieto/2025-syksy', 'exam route');
same(api.routeToHash({ kind: 'task', subject: 'terveystieto', exam: '2025-syksy', task: '7' }), '#/terveystieto/2025-syksy/tehtava-7', 'task route');
same(api.routeToHash({ kind: 'task', subject: 'terveystieto', exam: '2025-syksy', task: '1.2' }), '#/terveystieto/2025-syksy/tehtava-1.2', 'decimal subtask route');
same(api.routeToHash({ kind: 'questions', subject: 'terveystieto', question: 3, material: true, noMaterial: false }), '#/terveystieto/kysymykset/kysymys-3?aineisto=1', 'question route');

same(api.parseHashRoute(''), { kind: 'home' }, 'parse clean URL');
same(api.parseHashRoute('#yle__contentAnchor'), null, 'ignore Yle native hashes');
same(api.parseHashRoute('#/terveystieto/2025-syksy/tehtava-2'), { kind: 'task', subject: 'terveystieto', exam: '2025-syksy', task: '2' }, 'parse task');
same(api.parseHashRoute('#/terveystieto/2025-syksy/tehtava-1.2'), { kind: 'task', subject: 'terveystieto', exam: '2025-syksy', task: '1.2' }, 'parse decimal subtask');
same(api.parseHashRoute('#/terveystieto/kysymykset/kysymys-3?aineisto=1&ei-aineistoa=1'), { kind: 'questions', subject: 'terveystieto', question: 3, material: true, noMaterial: true }, 'parse question filters');

same(api.canonicalSubjectSlug('Terveystieto'), 'terveystieto', 'subject slug');
same(api.canonicalExamSlug('Terveystieto syksy 2025', 'Terveystieto'), '2025-syksy', 'exam slug');
same(api.canonicalExamSlug('Terveystieto kevät 2026', 'Terveystieto'), '2026-kevat', 'spring exam slug is ASCII');
same(api.routeToHash({ kind: 'exam', subject: 'terveystieto', exam: '2026-kevät' }), '#/terveystieto/2026-kevat', 'route writer strips Finnish diacritics');
same(api.routeToHash({ kind: 'subject', subject: 'englanti-pitkä' }), '#/englanti-pitka', 'subject route strips Finnish diacritics');
same(api.parseHashRoute('#/terveystieto/2026-kev%C3%A4t'), { kind: 'exam', subject: 'terveystieto', exam: '2026-kevat', task: null }, 'legacy encoded spring route canonicalizes to ASCII');

const roundTrips = [
  { kind: 'subject', subject: 'terveystieto' },
  { kind: 'exam', subject: 'terveystieto', exam: '2025-syksy' },
  { kind: 'task', subject: 'terveystieto', exam: '2025-syksy', task: '2' },
  { kind: 'task', subject: 'terveystieto', exam: '2025-syksy', task: '4.3' },
  { kind: 'questions', subject: 'terveystieto', question: 4, material: false, noMaterial: true }
];

for (const route of roundTrips) {
  const parsed = api.parseHashRoute(api.routeToHash(route));
  assert(api.routesEqual(parsed, route), `route round-trip failed: ${JSON.stringify(route)}`);
}

delete globalThis.__YO_KOEKONE_IMPROVED_TEST_HOOK__;
console.log('Routing tests passed.');
