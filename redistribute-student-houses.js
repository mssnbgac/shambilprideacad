const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// New house names as requested by user
const NEW_HOUSES = [
  'RED', 'BLUE', 'GREEN', 'PURPLE', 'PINK', 
  'BROWN', 'YELLOW', 'WHITE', 'MAGENTA', 'ORANGE', 'BLACK'
];

const dbPath = path.join(__dirname, 'server/database/shambil_academy.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🏠 Redistributing students across new house system...');
console.log('Available houses:', NEW_HOUSES.join(', '));

// Get all current students
db.all('SELECT id, admissionNumber, house FROM Students ORDER BY admissionNumber', (err, students) => {
  if (err) {
    console.error('❌ Error fetching students:', err);
    return;
  }

  console.log(`\n📊 Found ${students.length} students to redistribute:`);
  
  // Distribute students evenly across houses
  let completed = 0;
  students.forEach((student, index) => {
    // Distribute evenly across all houses
    const houseIndex = index % NEW_HOUSES.length;
    const newHouse = NEW_HOUSES[houseIndex];
    
    db.run(
      'UPDATE Students SET house = ? WHERE id = ?',
      [newHouse, student.id],
      function(err) {
        if (err) {
          console.error(`❌ Error updating student ${student.admissionNumber}:`, err);
        } else {
          console.log(`✅ ${student.admissionNumber}: ${student.house} → ${newHouse}`);
        }
        
        completed++;
        if (completed === students.length) {
          // Verify the updates
          console.log('\n🔍 Verifying redistribution...');
          db.all('SELECT admissionNumber, house FROM Students ORDER BY house, admissionNumber', (err, updatedStudents) => {
            if (err) {
              console.error('❌ Error verifying updates:', err);
            } else {
              console.log('\n📋 Updated student houses (sorted by house):');
              updatedStudents.forEach(student => {
                console.log(`   ${student.admissionNumber}: ${student.house}`);
              });
              
              // Show house distribution
              const houseCount = {};
              updatedStudents.forEach(student => {
                houseCount[student.house] = (houseCount[student.house] || 0) + 1;
              });
              
              console.log('\n📊 House distribution:');
              NEW_HOUSES.forEach(house => {
                const count = houseCount[house] || 0;
                console.log(`   ${house}: ${count} students`);
              });
            }
            
            db.close();
            console.log('\n✅ Student house redistribution completed!');
          });
        }
      }
    );
  });
});