/**
 * Parse USF Banner instructor cell text.
 * Input:  "Cainas, J. (Primary)"
 * Output: { lastName: "Cainas", firstInitial: "J", isPrimary: true, searchName: "Cainas J" }
 * Returns null for TBA / empty / Staff placeholders.
 */
function parseInstructorCell(text) {
  if (!text) return null;

  // Check for TBA or Staff placeholders
  if (text === 'TBA' || text.includes('(Staff)')) return null;

  // Match pattern: LastName, FirstNameOrInitial (Primary/Secondary)
  // This will capture multi-word last names like "De La Cruz"
  const match = text.match(/^([^,]+),\s*(.+?)\s*\(/);
  if (!match) return null;

  const lastName = match[1].trim();
  const firstPart = match[2].trim();

  // Extract first initial from firstPart
  // If it's already a single letter, use it; otherwise take first letter of first name
  const firstInitial = firstPart.length === 1 ? firstPart : firstPart[0];

  return {
    lastName,
    firstInitial,
    isPrimary: text.includes('(Primary)'),
    searchName: `${lastName} ${firstInitial}`,
  };
}

if (typeof module !== 'undefined') module.exports = { parseInstructorCell };
