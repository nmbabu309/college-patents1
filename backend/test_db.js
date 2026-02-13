import { db } from './db.js';

(async () => {
  try {
    const [rows] = await db.query('SELECT id, patentTitle, documentLink FROM patents LIMIT 5');
    console.log('Sample patent entries:');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
