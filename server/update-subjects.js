const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the SQLite database
const dbPath = path.join(__dirname, 'database', 'shambil_academy.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔗 Connected to SQLite database');
console.log('📚 Updating subjects...');

// Clear existing subjects
db.run('DELETE FROM Subjects', (err) => {
  if (err) {
    console.error('Error clearing subjects:', err);
    return;
  }

  console.log('🗑️ Cleared existing subjects');

  // New subjects list
  const newSubjects = [
    ['English', 'ENG', 'English Language'],
    ['Mathematics', 'MATH', 'Mathematics'],
    ['Agricultural Science', 'AGR', 'Agricultural Science'],
    ['Biology', 'BIO', 'Biology'],
    ['Chemistry', 'CHE', 'Chemistry'],
    ['Basic Science', 'BSC', 'Basic Science'],
    ['Basic Technology', 'BTE', 'Basic Technology'],
    ['Accounting', 'ACC', 'Accounting'],
    ['Arabic Language', 'ARA', 'Arabic Language'],
    ['CRS', 'CRS', 'Christian Religious Studies'],
    ['Drawing', 'DRW', 'Drawing'],
    ['Economics', 'ECO', 'Economics'],
    ['Home Economics', 'HEC', 'Home Economics'],
    ['Fine Art', 'ART', 'Fine Art'],
    ['Geography', 'GEO', 'Geography'],
    ['History', 'HIS', 'History'],
    ['IRS', 'IRS', 'Islamic Religious Studies'],
    ['Marketing', 'MKT', 'Marketing'],
    ['Physics', 'PHY', 'Physics'],
    ['Rhymes', 'RHY', 'Rhymes'],
    ['Social Studies', 'SST', 'Social Studies'],
    ['Hausa Language', 'HAU', 'Hausa Language'],
    ['Literature in English', 'LIT', 'Literature in English'],
    ['Government', 'GOV', 'Government'],
    ['Civic Education', 'CIV', 'Civic Education']
  ];

  const stmt = db.prepare(`
    INSERT INTO Subjects (name, code, description)
    VALUES (?, ?, ?)
  `);

  let completed = 0;
  newSubjects.forEach(([name, code, description]) => {
    stmt.run(name, code, description, (err) => {
      if (err) {
        console.error(`Error creating subject ${name}:`, err);
      } else {
        console.log(`✅ Created subject: ${name} (${code})`);
      }
      
      completed++;
      if (completed === newSubjects.length) {
        stmt.finalize();
        console.log('🎉 All subjects updated successfully!');
        console.log(`📊 Total subjects: ${newSubjects.length}`);
        db.close();
      }
    });
  });
});