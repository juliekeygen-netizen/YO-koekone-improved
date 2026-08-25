import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/i18n-nondom.js'), 'utf8');
const hubSource = fs.readFileSync(path.join(root, 'src/features-v03/study-hub.js'), 'utf8');

assert.ok(source.includes("document.addEventListener('contextmenu'"), 'Study Hub must listen for right-click on star controls');
assert.ok(source.includes(".yoi-hub-star[data-favorite-key]"), 'right-click behavior must be limited to Study Hub stars');
assert.ok(source.includes('event.composedPath()'), 'right-click hit-testing must work across userscript/page DOM realms');
assert.ok(source.includes("typeof node.matches !== 'function'"), 'right-click hit-testing must duck-type DOM matches rather than use realm identity');
assert.ok(source.includes("typeof node.closest === 'function'"), 'right-click hit-testing must duck-type DOM closest rather than use realm identity');
assert.doesNotMatch(source, /const\s+target\s*=\s*event\.target\s+instanceof\s+Element/, 'cross-realm DOM target code must never rely on instanceof Element');
assert.ok(source.includes('event.stopImmediatePropagation?.()'), 'handled right-click should suppress competing context-menu handlers');
assert.ok(source.includes('runtime?.forgetRecentExam'), 'right-click must delegate deletion to the Study Hub library writer');
assert.ok(hubSource.includes('function forgetRecentExam(key)'), 'Study Hub must own the Recent deletion mutation');
assert.ok(hubSource.includes('return mutateLibrary(library =>'), 'Recent deletion must use the serialized/locked library mutation path');
assert.ok(hubSource.includes('library.recent = library.recent.filter'), 'right-click must remove only the matching Recent entry');
assert.ok(hubSource.includes('if (isSameExam(library.lastExam, key))'), 'removing current Recent must repair lastExam');
assert.ok(hubSource.includes('if (isSameExam(library.lastActivity, key))'), 'removing current Recent must repair Continue activity');
assert.ok(hubSource.includes('library.lastActivity = newestActivity(library)'), 'Continue must fall forward to another real recent activity');
assert.ok(hubSource.includes('rt.forgetRecentExam = forgetRecentExam'), 'Study Hub must expose its locked Recent deletion action');
assert.ok(source.includes('If this favorite is not in Recent'), 'favorite-only right-click must remain a no-op');
assert.doesNotMatch(hubSource, /forgetRecentExam[\s\S]{0,1200}library\.favorites\s*=/, 'right-click Recent removal must never mutate favorites');

console.log('Study Hub cross-realm right-click Recent removal contract tests passed.');
