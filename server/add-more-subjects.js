const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the SQLite database
const dbPath = path.join(__dirname, 'database', 'shambil_academy.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔗 Connected to SQLite database');
console.log('📚 Adding additional subjects...');

// Additional subjects to add
const additionalSubjects = [
  ['Computer Studies', 'CMP', 'Computer Studies'],
  ['PHE', 'PHE', 'Physical and Health Education'],
  ['Business Studies', 'BUS', 'Business Studies'],
  ['Quantitative Reasoning', 'QR', 'Quantitative Reasoning'],
  ['Verbal Reasoning', 'VR', 'Verbal Reasoning'],
  ['Jolly Phonics', 'JP', 'Jolly Phonics']
];

const stmt = db.prepare(`
  INSERT INTO Subjects (name, code, description)
  VALUES (?, ?, ?)
`);

let completed = 0;
additionalSubjects.forEach(([name, code, description]) => {
  stmt.run(name, code, description, (err) => {
    if (err) {
      console.error(`Error creating subject ${name}:`, err);
    } else {
      console.log(`✅ Added subject: ${name} (${code})`);
    }
    
    completed++;
    if (completed === additionalSubjects.length) {
      stmt.finalize();
      
      // Count total subjects
      db.get('SELECT COUNT(*) as total FROM Subjects', (err, row) => {
        if (err) {
          console.error('Error counting subjects:', err);
        } else {
          console.log('🎉 Additional subjects added successfully!');
          console.log(`📊 Total subjects now: ${row.total}`);
        }
        db.close();
      });
    }
  });
});