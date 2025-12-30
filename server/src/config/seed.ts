import sequelize from './sqlite-database';

export const seedDatabase = async () => {
  try {
    // Check if admin user already exists
    const adminCheck = await sequelize.query(
      'SELECT id FROM Users WHERE email = ?',
      { replacements: ['admin@shambil.edu.ng'], type: 'SELECT' }
    );
    
    if ((adminCheck as any[]).length === 0) {
      console.log('🌱 Seeding database with demo users...');
      
      // Create demo users using raw SQL
      const demoUsers = [
        ['Admin', 'User', 'admin@shambil.edu.ng', 'admin', 'Administration'],
        ['John', 'Student', 'student@shambil.edu.ng', 'student', null],
        ['Jane', 'Teacher', 'teacher@shambil.edu.ng', 'teacher', 'Academic Department'],
        ['Mary', 'Accountant', 'accountant@shambil.edu.ng', 'accountant', 'Finance Department'],
        ['David', 'ExamOfficer', 'exam@shambil.edu.ng', 'exam_officer', 'Academic Department'],
        ['Sarah', 'Parent', 'parent@shambil.edu.ng', 'parent', null]
      ];

      for (const [firstName, lastName, email, role, office] of demoUsers) {
        await sequelize.query(`
          INSERT INTO Users (firstName, lastName, email, role, office, isActive)
          VALUES (?, ?, ?, ?, ?, 1)
        `, {
          replacements: [firstName, lastName, email, role, office],
          type: 'INSERT'
        });
      }
      
      console.log('✅ Demo users created successfully!');

      // Create demo classes
      console.log('🏫 Creating demo classes...');
      
      const classCheck = await sequelize.query(
        'SELECT id FROM Classes WHERE name = ?',
        { replacements: ['JSS1A'], type: 'SELECT' }
      );
      
      if ((classCheck as any[]).length === 0) {
        const demoClasses = [
          ['KG', 'Kindergarten', 20],
          ['NURSERY 1', 'Nursery 1', 25],
          ['NURSERY 2', 'Nursery 2', 25],
          ['PRIMARY 1', 'Primary 1', 30],
          ['PRIMARY 2', 'Primary 2', 30],
          ['PRIMARY 3', 'Primary 3', 30],
          ['JSS1A', 'JSS 1', 35],
          ['JSS1B', 'JSS 1', 35],
          ['JSS2A', 'JSS 2', 35],
          ['JSS3A', 'JSS 3', 35],
          ['SS1 Science', 'SSS 1', 30],
          ['SS1 Art', 'SSS 1', 30],
          ['SS2 Science', 'SSS 2', 30],
          ['SS3 Science', 'SSS 3', 30]
        ];

        // Find a teacher to assign as class teacher
        const teacherResult = await sequelize.query(
          'SELECT id FROM Users WHERE role = ? LIMIT 1',
          { replacements: ['teacher'], type: 'SELECT' }
        );
        
        const teacherId = (teacherResult as any[]).length > 0 ? (teacherResult[0] as any).id : null;
        
        for (const [name, level, capacity] of demoClasses) {
          await sequelize.query(`
            INSERT INTO Classes (name, level, capacity, classTeacher)
            VALUES (?, ?, ?, ?)
          `, {
            replacements: [name, level, capacity, teacherId],
            type: 'INSERT'
          });
        }
        
        console.log('✅ Demo classes created successfully!');
      }

      // Create demo subjects
      console.log('📚 Creating demo subjects...');
      
      const subjectCheck = await sequelize.query(
        'SELECT id FROM Subjects WHERE code = ?',
        { replacements: ['MATH'], type: 'SELECT' }
      );
      
      if ((subjectCheck as any[]).length === 0) {
        const demoSubjects = [
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
          ['Civic Education', 'CIV', 'Civic Education'],
          ['Computer Studies', 'CMP', 'Computer Studies'],
          ['PHE', 'PHE', 'Physical and Health Education'],
          ['Business Studies', 'BUS', 'Business Studies'],
          ['Quantitative Reasoning', 'QR', 'Quantitative Reasoning'],
          ['Verbal Reasoning', 'VR', 'Verbal Reasoning'],
          ['Jolly Phonics', 'JP', 'Jolly Phonics']
        ];

        for (const [name, code, description] of demoSubjects) {
          await sequelize.query(`
            INSERT INTO Subjects (name, code, description)
            VALUES (?, ?, ?)
          `, {
            replacements: [name, code, description],
            type: 'INSERT'
          });
        }
        
        console.log('✅ Demo subjects created successfully!');
      }

      // Create demo students with admission numbers
      console.log('👥 Creating demo students...');
      
      const studentCheck = await sequelize.query(
        'SELECT id FROM Students WHERE admissionNumber = ?',
        { replacements: ['SHA/2024/001'], type: 'SELECT' }
      );
      
      if ((studentCheck as any[]).length === 0) {
        // Get the student user ID
        const studentUserResult = await sequelize.query(
          'SELECT id FROM Users WHERE email = ?',
          { replacements: ['student@shambil.edu.ng'], type: 'SELECT' }
        );
        
        // Get a class ID
        const classResult = await sequelize.query(
          'SELECT id FROM Classes WHERE name = ? LIMIT 1',
          { replacements: ['JSS1A'], type: 'SELECT' }
        );
        
        if ((studentUserResult as any[]).length > 0 && (classResult as any[]).length > 0) {
          const studentUserId = (studentUserResult[0] as any).id;
          const classId = (classResult[0] as any).id;
          
          const demoStudents = [
            ['SHA/2024/001', studentUserId, classId, 'Red House', 'active'],
            ['SHA/2024/002', studentUserId, classId, 'Blue House', 'active'],
            ['SHA/2024/003', studentUserId, classId, 'Green House', 'active'],
            ['SHA/2024/004', studentUserId, classId, 'Yellow House', 'active'],
            ['SHA/2024/005', studentUserId, classId, 'Red House', 'active']
          ];

          for (const [admissionNumber, userId, classId, house, status] of demoStudents) {
            await sequelize.query(`
              INSERT INTO Students (admissionNumber, userId, classId, house, status, studentId)
              VALUES (?, ?, ?, ?, ?, ?)
            `, {
              replacements: [admissionNumber, userId, classId, house, status, admissionNumber],
              type: 'INSERT'
            });
          }
          
          console.log('✅ Demo students created successfully!');
        }
      }

      console.log('🎉 Database seeding completed successfully!');
    } else {
      console.log('📚 Database already seeded');
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};