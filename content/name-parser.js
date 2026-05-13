/**
 * Parse Banner instructor reference from any text containing "Lastname, F. (Primary|Secondary)".
 * Works for both:
 *   - Search results cell:   "Cainas, J. (Primary)"
 *   - Schedule Details line: "Instructor: Williams, J. (Primary) CRN: 91348"
 * Returns null if no instructor pattern found, or if matched name is a placeholder.
 */
function parseInstructorCell(text) {
  if (!text) return null;

  // Find Lastname (possibly multi-word, hyphenated, or accented), comma,
  // first name/initial, then (Primary|Secondary). Anchored anywhere in text.
  const match = text.match(
    /([A-ZÀ-Ý][A-Za-zÀ-ÿ'\-]+(?:[ \-][A-Za-zÀ-ÿ'\-]+)*),\s*([A-Za-z])[A-Za-z]*\.?\s*\((Primary|Secondary)\)/
  );
  if (!match) return null;

  const lastName = match[1].trim();
  const firstInitial = match[2].toUpperCase();

  // Reject placeholders
  if (/^(staff|tba|tbd)$/i.test(lastName)) return null;

  return {
    lastName,
    firstInitial,
    isPrimary: match[3] === 'Primary',
    searchName: `${lastName} ${firstInitial}`,
  };
}

if (typeof module !== 'undefined') module.exports = { parseInstructorCell };
