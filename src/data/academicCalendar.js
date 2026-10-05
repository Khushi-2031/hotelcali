// MICA Academic & Event Calendar AY 2026-27 (signed, "as on 26-08-2026").
// Only entries for PGDM-C / PGDM 2nd year (Ashoka 4th, PGP-31) and campus-wide
// events and holidays. `end` is inclusive. type: term | exam | holiday | event | placement
export const ACADEMIC_CALENDAR = [
  { start: '2026-07-05', title: 'Hostel registration', type: 'term' },
  { start: '2026-07-06', title: 'Orientation (mandatory)', type: 'term' },
  { start: '2026-07-07', title: 'Term 3 (Phase 1) classes begin', type: 'term' },
  { start: '2026-08-02', title: 'Shamiyana', type: 'event' },
  { start: '2026-08-04', title: 'Blood Donation', type: 'event' },
  { start: '2026-08-15', title: 'Independence Day, Jagriti event and MIQUEST', type: 'event' },
  { start: '2026-08-28', title: 'Raksha Bandhan and Jagriti Vaani', type: 'event' },
  { start: '2026-09-04', title: 'Janmashtami and CulComm event', type: 'event' },
  { start: '2026-09-14', title: 'Ganesh Chaturthi and student-led event', type: 'event' },
  { start: '2026-09-17', end: '2026-09-25', title: 'Term 3 (Phase 1) end-term exams', type: 'exam' },
  { start: '2026-09-25', title: 'Term 3 (Phase 1) ends', type: 'term' },
  { start: '2026-09-28', title: 'Term 3 (Phase 2) classes begin', type: 'term' },
  { start: '2026-10-01', title: 'Unplugged', type: 'event' },
  { start: '2026-10-02', title: "Mahatma Gandhi's Birthday", type: 'holiday' },
  { start: '2026-10-03', end: '2026-10-04', title: 'Start Your Own Restaurant', type: 'event' },
  { start: '2026-10-16', title: 'Khula Aasmaan', type: 'event' },
  { start: '2026-10-19', title: 'Oorja', type: 'event' },
  { start: '2026-10-20', title: 'Dussehra', type: 'holiday' },
  { start: '2026-10-24', end: '2026-10-25', title: 'LitFest', type: 'event' },
  { start: '2026-10-31', title: 'Guftagu', type: 'event' },
  { start: '2026-11-01', title: 'Verve, Studio 7', type: 'event' },
  { start: '2026-11-07', end: '2026-11-15', title: 'Diwali vacation', type: 'holiday' },
  { start: '2026-11-16', end: '2026-11-24', title: 'Term 3 (Phase 2) end-term exams', type: 'exam' },
  { start: '2026-11-21', title: 'Marketing Summit', type: 'event' },
  { start: '2026-11-24', title: 'Term 3 (Phase 2) ends', type: 'term' },
  { start: '2026-11-25', end: '2026-12-17', title: 'Final Placements', type: 'placement' },
  { start: '2026-12-19', end: '2026-12-21', title: 'Global Alumni Meet (MICA for MICAnS)', type: 'event' },
  { start: '2026-12-21', end: '2026-12-22', title: 'Homecoming for PGP 31', type: 'event' },
  { start: '2026-12-24', end: '2027-01-01', title: 'Winter break', type: 'holiday' },
  { start: '2026-12-25', title: 'Christmas', type: 'holiday' },
  { start: '2027-01-06', title: 'Term 4 classes begin', type: 'term' },
  { start: '2027-01-14', end: '2027-01-15', title: 'Makar Sankranti', type: 'holiday' },
  { start: '2027-01-16', end: '2027-01-18', title: 'SAMAR', type: 'event' },
  { start: '2027-01-19', title: 'SAMAR rest day', type: 'holiday' },
  { start: '2027-01-23', end: '2027-01-24', title: 'E-Summit and Grand Alumni Meet', type: 'event' },
  { start: '2027-01-26', title: 'Republic Day and Anand Mela', type: 'holiday' },
  { start: '2027-01-31', title: 'Sankalp Annual Production', type: 'event' },
  { start: '2027-02-05', title: 'MICA Day', type: 'event' },
  { start: '2027-02-07', title: 'TEDx', type: 'event' },
  { start: '2027-02-13', end: '2027-02-14', title: 'Kultura', type: 'event' },
  { start: '2027-02-19', end: '2027-02-21', title: 'MICANVAS', type: 'event' },
  { start: '2027-02-22', title: 'MICANVAS rest day', type: 'holiday' },
  { start: '2027-02-23', end: '2027-02-24', title: 'Term 4 end-term exams (Phase I)', type: 'exam' },
  { start: '2027-02-26', end: '2027-03-06', title: 'Rural and Entrepreneurial Immersion', type: 'term' },
  { start: '2027-03-06', title: 'Farewell / Culnite', type: 'event' },
  { start: '2027-03-06', title: 'Maha Shivaratri', type: 'holiday' },
  { start: '2027-03-08', end: '2027-03-09', title: 'Term 4 end-term exams (Phase II)', type: 'exam' },
  { start: '2027-03-12', title: "Director's Showcase (Sankalp)", type: 'event' },
  { start: '2027-03-15', title: 'Term 4 ends', type: 'term' },
  { start: '2027-03-22', title: 'Holi / Dhuleti', type: 'holiday' },
  { start: '2027-04-01', end: '2027-04-07', title: 'Award Ceremony and Convocation (first week of April, date TBC)', type: 'event' },
]

export const TYPE_LABEL = { term: 'Academic', exam: 'Exams', holiday: 'Holiday', event: 'Campus event', placement: 'Placements' }

export function ymd(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function onDay(day) {
  return ACADEMIC_CALENDAR.filter(e => e.start <= day && (e.end || e.start) >= day)
}

export function upcoming(fromDay, n = 5) {
  return ACADEMIC_CALENDAR.filter(e => (e.end || e.start) >= fromDay).slice(0, n)
}

export function fmtRange(e) {
  const f = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const w = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })
  return e.end && e.end !== e.start ? `${f(e.start)} to ${f(e.end)}` : `${w(e.start)}, ${f(e.start)}`
}
