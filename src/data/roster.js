export const FLOOR = [
  { room: '41', people: ['Kunal Kumar', 'Rik Sengupta'] },
  { room: '42', people: ['Mrigank Dutta', 'Shreyas Naik'] },
  { room: '43', people: ['Dev Choudhary', 'Vismay Bhatt'] },
  { room: '44', people: ['Khushi Vaswani', 'Vatsala Rastogi'] },
  { room: '45', people: ['Protim Chowdhury', 'Ashraf Khan'] },
  { room: '46', people: ['Ashwin Bhatt', 'Revant Veer Singh'] },
  { room: '47', people: ['Simran Gupta', 'Supriya Arora'] },
  { room: '48', people: ['Shravan Hariharan', 'Akshat Jha'] },
  { room: '49', people: ['Shubham Bijarnia', 'Shreyanshu Tiwary'] },
  { room: '50', people: ['Himnish Singh'] },
]

export const ALL_PEOPLE = FLOOR.flatMap(r => r.people)

export const MEAL_WINDOWS = [
  { name: 'Breakfast', start: [7, 30], end: [9, 30] },
  { name: 'Lunch', start: [12, 30], end: [14, 30] },
  { name: 'Snacks', start: [17, 0], end: [18, 0] },
  { name: 'Dinner', start: [20, 0], end: [22, 0] },
]
