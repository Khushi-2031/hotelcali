export const FLOOR = [
  { room: '41', people: ['Kunal Kumar', 'Rik Sengupta'] },
  { room: '42', people: ['Mrigank Dutta', 'Shreyas Naik'] },
  { room: '43', people: ['Vismay Bhatt', 'Dev Chowdhary'] },
  { room: '44', people: ['Khushi Vaswani', 'Vatsala Rastogi'] },
  { room: '45', people: ['Protim Chowdhury', 'Ashraf Khan'] },
  { room: '46', people: ['Revant Veer Singh', 'Ashwin Bhatt'] },
  { room: '47', people: ['Simran Gupta', 'Supriya Arora'] },
  { room: '48', people: ['Akshat Jha', 'Shravan Hariharan'] },
  { room: '49', people: ['Shreyanshu Tiwary', 'Shubham Bijarnia'] },
  { room: '50', people: ['Himnish Singh'] },
]

export const ALL_PEOPLE = FLOOR.flatMap(r => r.people)

export const DUTY_TYPES = [
  'Blinkit runner (collects & places floor orders)',
  'Water can / cooler in-charge',
  'Washing machine schedule keeper',
  'Common area & corridor tidy-up',
  'Wake-up call captain',
  'Maintenance liaison (chases up complaints)',
]

export const MEAL_WINDOWS = [
  { name: 'Breakfast', start: [7, 30], end: [9, 30] },
  { name: 'Lunch', start: [12, 30], end: [14, 30] },
  { name: 'Snacks', start: [17, 0], end: [18, 0] },
  { name: 'Dinner', start: [20, 0], end: [22, 0] },
]
