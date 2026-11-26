// The person's own media: read first, matched to the page's picture slots, a menu read into prices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanMedia, assignMine, menuFrom, kindOf, nameWords } from '../../scripts/lib/media-intake.mjs';

// A 1×1 PNG header with a chosen width and height: enough for imageSize().
const png = (w, h) => { const b = Buffer.alloc(33); b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(0x0d0a1a0a, 4); b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };

test('files are told apart: photographs, a logo, a film, a menu', () => {
  assert.deepEqual(nameWords('Dining-room_evening 2.JPG'), ['dining', 'room', 'evening']);
  assert.equal(kindOf('logo.svg'), 'logo');
  assert.equal(kindOf('our-mark.png', { width: 512, height: 512 }), 'logo');
  assert.equal(kindOf('hero.mov'), 'video');
  assert.equal(kindOf('menu.txt'), 'menu');
  assert.equal(kindOf('dining-room.jpg', { width: 2000, height: 1300 }), 'photo');
});

test('scan reads sizes and media.json; photographs go to the slots: named, matched, then in page order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-media-'));
  try {
    writeFileSync(join(dir, 'pizza-oven.png'), png(2000, 1300));
    writeFileSync(join(dir, 'IMG_2231.png'), png(1600, 2000));
    writeFileSync(join(dir, 'tiny.png'), png(900, 700));
    writeFileSync(join(dir, 'media.json'), JSON.stringify([{ file: 'IMG_2231.png', shows: 'The dining room at dusk', use: 'hero' }]));
    writeFileSync(join(dir, 'menu.txt'), 'Margherita £11\n- Pizza, artichoke and ham £15\nNot a price\n');
    const items = scanMedia(dir);
    const room = items.find((i) => i.file === 'IMG_2231.png');
    assert.equal(room.shows, 'The dining room at dusk'); assert.equal(room.orientation, 'tall'); assert.ok(room.words.includes('dining'));
    assert.ok(items.find((i) => i.file === 'tiny.png').small, 'a small picture is flagged');
    const slots = [{ key: 1, shot: 'The restaurant itself, 16:10', weight: 2 }, { key: 2, shot: 'The wood-fired pizza oven, 4:5' }, { key: 3, shot: 'The bar, 4:5' }];
    const placed = assignMine(items, slots);
    assert.equal(placed.get(1).item.file, 'IMG_2231.png'); assert.equal(placed.get(1).how, 'named');
    assert.equal(placed.get(2).item.file, 'pizza-oven.png'); assert.equal(placed.get(2).how, 'match');
    assert.equal(placed.get(3).item.file, 'tiny.png'); assert.equal(placed.get(3).how, 'order', 'the rest in page order: theirs beats stock');
    assert.deepEqual(menuFrom(items), ['Margherita £11', 'Pizza £15']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
