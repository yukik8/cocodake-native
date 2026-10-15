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
