import { describe, expect, it } from 'vitest';
import { parseSseEvents } from '../sse';

describe('parseSseEvents', () => {
  it('reads every data line of a buffered event stream', () => {
    const text = 'data: {"type":"progress","phase":"parsing"}\n\n' +
      'data: {"type":"done","imported":3,"duplicates":1}\n\n';
    expect(parseSseEvents(text)).toEqual([
      { type: 'progress', phase: 'parsing' },
      { type: 'done', imported: 3, duplicates: 1 },
    ]);
  });

  it('ignores other lines and broken JSON', () => {
    expect(parseSseEvents(': comment\nevent: x\ndata: {broken\ndata: {"ok":1}\n')).toEqual([{ ok: 1 }]);
  });
});

describe('createSseTextConsumer', () => {
  it('returns each event once, as soon as its line is complete', async () => {
    const { createSseTextConsumer } = await import('../sse');
    const c = createSseTextConsumer();
    const a = 'data: {"type":"progress","phase":"geocoding","current":0,"total":3}\n\n';
    const b = 'data: {"type":"progress","phase":"geocoding","current":2,"total":3}\n\n';
    const done = 'data: {"type":"done","imported":3}';

    expect(c.push(a.slice(0, 20))).toEqual([]); // line not complete yet
    expect(c.push(a)).toEqual([{ type: 'progress', phase: 'geocoding', current: 0, total: 3 }]);
    expect(c.push(a)).toEqual([]); // nothing new
    expect(c.push(a + b + done)).toEqual([{ type: 'progress', phase: 'geocoding', current: 2, total: 3 }]);
    expect(c.end()).toEqual([{ type: 'done', imported: 3 }]); // the last line has no newline
  });
});
