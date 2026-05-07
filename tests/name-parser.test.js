const { parseInstructorCell } = require('../name-parser');

test('parses standard instructor format', () => {
  expect(parseInstructorCell('Cainas, J. (Primary)')).toEqual({
    lastName: 'Cainas',
    firstInitial: 'J',
    isPrimary: true,
    searchName: 'Cainas J',
  });
});

test('parses non-primary instructor', () => {
  const result = parseInstructorCell('Smith, J. (Secondary)');
  expect(result).not.toBeNull();
  expect(result.lastName).toBe('Smith');
  expect(result.firstInitial).toBe('J');
  expect(result.isPrimary).toBe(false);
});

test('handles multi-word last name', () => {
  const result = parseInstructorCell('De La Cruz, M. (Primary)');
  expect(result).not.toBeNull();
  expect(result.lastName).toBe('De La Cruz');
  expect(result.firstInitial).toBe('M');
  expect(result.searchName).toBe('De La Cruz M');
});

test('returns null for TBA', () => {
  expect(parseInstructorCell('TBA')).toBeNull();
});

test('returns null for empty string', () => {
  expect(parseInstructorCell('')).toBeNull();
});

test('returns null for Staff placeholder', () => {
  expect(parseInstructorCell('(Staff)')).toBeNull();
});

test('handles full first name instead of initial', () => {
  const result = parseInstructorCell('Johnson, Michael (Primary)');
  expect(result).not.toBeNull();
  expect(result.lastName).toBe('Johnson');
  expect(result.firstInitial).toBe('M');
  expect(result.searchName).toBe('Johnson M');
});
