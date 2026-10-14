// Sample math content. Safe to run many times: it only seeds when there are no books yet.
// Add your own books/lessons/questions by following the same pattern below.
const db = require('./db');

const Q = (text, options, correct, explanation) => ({ text, options, correct, explanation });

const content = [
  {
    title: 'Arithmetic & Fractions', grade: 'Grade 6',
    description: 'Fractions, decimals, percentages and the order of operations.',
    lessons: [
      {
        title: 'Fractions',
        content: `<p>A fraction shows part of a whole. To <b>add</b> fractions, give them a common denominator. To <b>multiply</b>, multiply tops and bottoms. To <b>divide</b>, flip the second fraction and multiply.</p>
          <p><b>Example:</b> 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2</p>`,
        questions: [
          Q('1/2 + 1/4 = ?', ['1/6', '3/4', '2/6', '1/8'], 1, '1/2 = 2/4, so 2/4 + 1/4 = 3/4.'),
          Q('2/3 × 3/5 = ?', ['2/5', '5/8', '1/5', '3/4'], 0, '(2×3)/(3×5) = 6/15 = 2/5.'),
          Q('Which is 12/18 in simplest form?', ['1/2', '2/3', '3/4', '6/9'], 1, 'Divide top and bottom by 6 to get 2/3.'),
          Q('3/4 ÷ 1/2 = ?', ['3/8', '3/2', '1/2', '2/3'], 1, 'Flip the second fraction: 3/4 × 2/1 = 6/4 = 3/2.'),
        ],
      },
      {
        title: 'Decimals & Percentages',
        content: `<p>A percentage means "out of 100". To find a percentage of a number, divide by 100 and multiply. 25% = 0.25 = 1/4.</p>
          <p><b>Example:</b> 10% of 50 = 0.10 × 50 = 5</p>`,
        questions: [
          Q('What is 25% of 80?', ['10', '20', '25', '40'], 1, '25% = 1/4, and 80 ÷ 4 = 20.'),
          Q('0.75 written as a fraction is:', ['3/4', '7/5', '1/75', '3/5'], 0, '0.75 = 75/100 = 3/4.'),
          Q('3.2 + 1.85 = ?', ['4.05', '5.05', '5.15', '4.95'], 1, 'Line up the decimal points: 3.20 + 1.85 = 5.05.'),
          Q('15 is what percent of 60?', ['15%', '20%', '25%', '30%'], 2, '15/60 = 1/4 = 25%.'),
        ],
      },
      {
        title: 'Order of Operations',
        content: `<p>Remember <b>BODMAS</b>: Brackets, Orders (powers), Division and Multiplication (left to right), Addition and Subtraction (left to right).</p>
          <p><b>Example:</b> 5 + 2 × 3 = 5 + 6 = 11 (multiply first).</p>`,
        questions: [
          Q('2 + 3 × 4 = ?', ['20', '14', '24', '12'], 1, 'Multiply first: 3×4 = 12, then 2 + 12 = 14.'),
          Q('(8 − 2) × 3 = ?', ['18', '22', '14', '6'], 0, 'Brackets first: 6 × 3 = 18.'),
          Q('20 ÷ 5 + 3 = ?', ['1', '7', '4', '5'], 1, '20 ÷ 5 = 4, then 4 + 3 = 7.'),
          Q('2^3 + 1 = ?', ['7', '9', '10', '6'], 1, '2^3 = 8, then 8 + 1 = 9.'),
        ],
      },
    ],
  },
  {
    title: 'Algebra Basics', grade: 'Grade 7',
    description: 'Equations, expressions and exponents: the building blocks of algebra.',
    lessons: [
      {
        title: 'Solving Linear Equations',
        content: `<p>To solve an equation, do the <b>same thing to both sides</b> until x is alone. Undo addition with subtraction, and multiplication with division.</p>
          <p><b>Example:</b> 2x + 3 = 11 → 2x = 8 → x = 4</p>`,
        questions: [
          Q('Solve: x + 7 = 15', ['6', '8', '22', '9'], 1, 'Subtract 7 from both sides: x = 8.'),
          Q('Solve: 3x = 21', ['7', '18', '63', '24'], 0, 'Divide both sides by 3: x = 7.'),
          Q('Solve: 2x − 5 = 9', ['2', '7', '4', '14'], 1, 'Add 5: 2x = 14, then divide by 2: x = 7.'),
          Q('Solve: x/4 = 6', ['10', '1.5', '24', '2'], 2, 'Multiply both sides by 4: x = 24.'),
        ],
      },
      {
        title: 'Expressions & Simplifying',
        content: `<p>Combine <b>like terms</b> (same letter, same power). Use the distributive law to expand brackets: a(b + c) = ab + ac.</p>
          <p><b>Example:</b> 3(x + 2) = 3x + 6</p>`,
        questions: [
          Q('Simplify: 3a + 2a', ['5a', '6a', '5a²', 'a'], 0, 'Like terms: 3 + 2 = 5, so 5a.'),
          Q('Expand: 2(x + 3)', ['2x + 3', '2x + 6', 'x + 6', '2x + 5'], 1, 'Multiply both terms by 2: 2x + 6.'),
          Q('What is 4n − 1 when n = 3?', ['11', '12', '13', '9'], 0, '4×3 − 1 = 12 − 1 = 11.'),
          Q('Simplify: 5x + 2 − 2x + 4', ['3x + 6', '7x + 6', '3x − 2', '7x + 2'], 0, 'x terms: 5x − 2x = 3x. Numbers: 2 + 4 = 6.'),
        ],
      },
      {
        title: 'Exponents',
        content: `<p>An exponent says how many times to multiply a number by itself. Rules: a^m × a^n = a^(m+n), (a^m)^n = a^(m×n), and a^0 = 1.</p>
          <p><b>Example:</b> 2^3 × 2^2 = 2^5 = 32</p>`,
        questions: [
          Q('3^2 × 3^3 = ?', ['3^5', '3^6', '9^5', '9^6'], 0, 'Add the exponents: 2 + 3 = 5.'),
          Q('5^0 = ?', ['0', '5', '1', 'undefined'], 2, 'Any non-zero number to the power 0 equals 1.'),
          Q('(2^3)^2 = ?', ['2^5', '2^6', '2^9', '4^5'], 1, 'Multiply the exponents: 3 × 2 = 6.'),
          Q('10^3 = ?', ['30', '100', '1000', '10000'], 2, '10 × 10 × 10 = 1000.'),
        ],
      },
    ],
  },
  {
    title: 'Geometry Basics', grade: 'Grade 7',
    description: 'Angles, perimeter, area and circles.',
    lessons: [
      {
        title: 'Angles',
        content: `<p>Angles on a straight line add to <b>180°</b>. Angles in a triangle add to <b>180°</b>. Angles around a point add to <b>360°</b>. Acute &lt; 90°, right = 90°, obtuse between 90° and 180°.</p>`,
        questions: [
          Q('Angles on a straight line add up to:', ['90°', '180°', '270°', '360°'], 1, 'A straight line is a half turn: 180°.'),
          Q('What is the complement of 35°?', ['55°', '145°', '65°', '35°'], 0, 'Complementary angles add to 90°: 90 − 35 = 55.'),
          Q('A triangle has angles 50° and 60°. The third angle is:', ['70°', '80°', '60°', '90°'], 0, '180 − 50 − 60 = 70.'),
          Q('An angle of 120° is called:', ['acute', 'right', 'obtuse', 'reflex'], 2, 'Between 90° and 180° is obtuse.'),
        ],
      },
      {
        title: 'Perimeter & Area',
        content: `<p>Perimeter is the distance around a shape. Area is the space inside. Rectangle area = length × width. Triangle area = ½ × base × height.</p>`,
        questions: [
          Q('Area of a rectangle 8 by 5:', ['13', '26', '40', '80'], 2, '8 × 5 = 40.'),
          Q('Perimeter of a square with side 6:', ['12', '24', '36', '18'], 1, '4 × 6 = 24.'),
          Q('Area of a triangle with base 10 and height 4:', ['40', '20', '14', '28'], 1, '½ × 10 × 4 = 20.'),
          Q('A rectangle has perimeter 30 and length 9. Its width is:', ['6', '21', '12', '7'], 0, '2(9 + w) = 30, so 9 + w = 15 and w = 6.'),
        ],
      },
      {
        title: 'Circles',
        content: `<p>Radius r is half the diameter d. Circumference = 2πr (or πd). Area = πr².</p>`,
        questions: [
          Q('The circumference of a circle is:', ['πr²', '2πr', 'πd²', '2r'], 1, 'Circumference = 2πr = πd.'),
          Q('Area of a circle with radius 3 (π = 3.14):', ['18.84', '28.26', '9.42', '37.68'], 1, '3.14 × 3² = 3.14 × 9 = 28.26.'),
          Q('A circle has diameter 10. Its radius is:', ['5', '20', '10', '2.5'], 0, 'Radius = diameter ÷ 2 = 5.'),
          Q('Circumference of a circle with d = 7 (π = 22/7):', ['22', '44', '14', '154'], 0, 'πd = 22/7 × 7 = 22.'),
        ],
      },
    ],
  },
];

function run() {
  if (db.prepare('SELECT COUNT(*) AS n FROM books').get().n > 0) return false;
  const insBook = db.prepare('INSERT INTO books (title, grade, description) VALUES (?,?,?)');
  const insLesson = db.prepare('INSERT INTO lessons (book_id, title, content, position) VALUES (?,?,?,?)');
  const insQ = db.prepare('INSERT INTO questions (lesson_id, text, options, correct, explanation) VALUES (?,?,?,?,?)');
  db.transaction(() => {
    for (const b of content) {
      const bid = insBook.run(b.title, b.grade, b.description).lastInsertRowid;
      b.lessons.forEach((l, i) => {
        const lid = insLesson.run(bid, l.title, l.content, i).lastInsertRowid;
        for (const q of l.questions) insQ.run(lid, q.text, JSON.stringify(q.options), q.correct, q.explanation);
      });
    }
  })();
  console.log('Seeded sample math content.');
  return true;
}

module.exports = { run };
if (require.main === module) run();
