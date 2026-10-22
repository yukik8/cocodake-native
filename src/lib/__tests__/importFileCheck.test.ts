import { describe, expect, it } from 'vitest';
import { IMPORT_FILE_ERRORS, IMPORT_MAX_BYTES, checkImportFileName } from '../importFileCheck';

describe('checkImportFileName', () => {
  it.each([
    ['保存済み.zip', IMPORT_FILE_ERRORS.zip],
    ['takeout-20261020.ZIP', IMPORT_FILE_ERRORS.zip],
    ['map.png', IMPORT_FILE_ERRORS.unsupported],
    ['行ってみたい.xlsx', IMPORT_FILE_ERRORS.unsupported],
    ['行ってみたい.csv', null],
    ['Saved Places.json', null],
    ['notes.txt', null],
    ['no-extension', null],
  ])('%s', (name, expected) => {
    expect(checkImportFileName(name, 1000)).toBe(expected);
  });

  it('rejects a file over 10MB before anything is uploaded', () => {
    expect(checkImportFileName('a.csv', IMPORT_MAX_BYTES + 1)).toBe(IMPORT_FILE_ERRORS.tooLarge);
  });
});
