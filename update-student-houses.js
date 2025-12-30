const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// New house names as requested by user
const NEW_HOUSES = [
  'RED', 'BLUE', 'GREEN', 'PURPLE', 'PINK', 
  'BROWN', 'YELLOW', 'WHITE', 'MAGENTA', 'ORANGE', 'BLACK'
];

// Mapping from old house names to new house names
const HOUSE_MAPPING = {
  'Red House': 'RED',
  'Blue House': 'BLUE', 
  'Green House': 'GREEN',
  'Yellow House': 'YELLOW',
  null: 'RED' // Default for students with no house assigned
};

const dbPath = path.join(__dirname, 'server/database/shambil_academy.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🏠 Updating student houses to new system...');
console.log('New houses:', NEW_HOUSES.join(', '));

// First, get all current students
db.all('SELECT id, admissionNumber, house FROM Students', (err, students) => {
  if (err) {
    console.error('❌ Error fetching students:', err);
    return;
  }

  console.log(`\n📊 Found ${students.length} students to update:`);
  
  // Update each student's house
  let completed = 0;
  students.forEach(student => {
    const oldHouse = student.house;
    const newHouse = HOUSE_MAPPING[oldHouse] || 'RED';
    
    db.run(
      'UPDATE Students SET house = ? WHERE id = ?',
      [newHouse, student.id],
      function(err) {
        if (err) {
          console.error(`❌ Error updating student ${student.admissionNumber}:`, err);
        } else {
          console.log(`✅ ${student.admissionNumber}: ${oldHouse || 'null'} → ${newHouse}`);
        }
        
        completed++;
        if (completed === students.length) {
          // Verify the updates
          console.log('\n🔍 Verifying updates...');
          db.all('SELECT admissionNumber, house FROM Students ORDER BY admissionNumber', (err, updatedStudents) => {
            if (err) {
              console.error('❌ Error verifying updates:', err);
            } else {
              console.log('\n📋 Updated student houses:');
              updatedStudents.forEach(student => {
                console.log(`   ${student.admissionNumber}: ${student.house}`);
              });
              
              // Show house distribution
              const houseCount = {};
              updatedStudents.forEach(student => {
                houseCount[student.house] = (houseCount[student.house] || 0) + 1;
              });
              
              console.log('\n📊 House distribution:');
              Object.entries(houseCount).forEach(([house, count]) => {
                console.log(`   ${house}: ${count} students`);
              });
            }
            
            db.close();
            console.log('\n✅ Student house update completed!');
          });
        }
      }
    );
  });
});