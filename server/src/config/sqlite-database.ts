import { Sequelize } from 'sequelize';
import path from 'path';

// Create SQLite database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database/shambil_academy.sqlite'),
  logging: console.log, // Enable SQL query logging
});

export const connectSQLiteDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('📊 SQLite Database Connected Successfully!');
    
    // Create Users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        office TEXT,
        phone TEXT,
        avatar TEXT,
        isActive BOOLEAN DEFAULT 1,
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Classes table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        level TEXT NOT NULL,
        capacity INTEGER DEFAULT 30,
        classTeacher INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classTeacher) REFERENCES Users(id)
      )
    `);

    // Create Students table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        admissionNumber TEXT UNIQUE NOT NULL,
        classId INTEGER NOT NULL,
        house TEXT,
        dateOfBirth DATE,
        parentId INTEGER,
        guardianName TEXT,
        guardianPhone TEXT,
        address TEXT,
        bloodGroup TEXT,
        medicalConditions TEXT,
        emergencyContact TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES Users(id),
        FOREIGN KEY (classId) REFERENCES Classes(id),
        FOREIGN KEY (parentId) REFERENCES Users(id)
      )
    `);

    // Create Subjects table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Results table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId INTEGER NOT NULL,
        classId INTEGER NOT NULL,
        academicYear TEXT NOT NULL,
        term TEXT NOT NULL CHECK (term IN ('first', 'second', 'third')),
        totalScore REAL DEFAULT 0,
        averageScore REAL DEFAULT 0,
        overallGrade TEXT,
        position INTEGER,
        totalStudents INTEGER,
        remarks TEXT,
        enteredBy INTEGER NOT NULL,
        enteredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        published BOOLEAN DEFAULT 0,
        publishedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES Students(id),
        FOREIGN KEY (classId) REFERENCES Classes(id),
        FOREIGN KEY (enteredBy) REFERENCES Users(id)
      )
    `);

    // Create Subject Results table (for individual subject scores)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS SubjectResults (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resultId INTEGER NOT NULL,
        subjectId INTEGER NOT NULL,
        ca1 REAL DEFAULT 0 CHECK (ca1 >= 0 AND ca1 <= 20),
        ca2 REAL DEFAULT 0 CHECK (ca2 >= 0 AND ca2 <= 20),
        exam REAL DEFAULT 0 CHECK (exam >= 0 AND exam <= 60),
        total REAL DEFAULT 0,
        grade TEXT,
        remark TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resultId) REFERENCES Results(id) ON DELETE CASCADE,
        FOREIGN KEY (subjectId) REFERENCES Subjects(id)
      )
    `);

    // Create Payments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId INTEGER,
        academicYear TEXT NOT NULL,
        term TEXT NOT NULL CHECK (term IN ('first', 'second', 'third')),
        paymentType TEXT NOT NULL CHECK (paymentType IN ('tuition', 'transport', 'meal', 'uniform', 'books', 'exam', 'other')),
        amount REAL NOT NULL CHECK (amount >= 0),
        amountPaid REAL DEFAULT 0 CHECK (amountPaid >= 0),
        balance REAL DEFAULT 0,
        paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        dueDate DATETIME NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
        paymentMethod TEXT CHECK (paymentMethod IN ('cash', 'bank_transfer', 'cheque', 'online')),
        receiptNumber TEXT UNIQUE,
        confirmedBy INTEGER,
        confirmedAt DATETIME,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES Students(id),
        FOREIGN KEY (confirmedBy) REFERENCES Users(id)
      )
    `);

    // Create Attendance table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId INTEGER NOT NULL,
        classId INTEGER NOT NULL,
        academicYear TEXT NOT NULL,
        term TEXT NOT NULL CHECK (term IN ('first', 'second', 'third')),
        attendanceDate DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
        remarks TEXT,
        markedBy INTEGER NOT NULL,
        markedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES Students(id),
        FOREIGN KEY (classId) REFERENCES Classes(id),
        FOREIGN KEY (markedBy) REFERENCES Users(id),
        UNIQUE(studentId, attendanceDate)
      )
    `);

    // Create Staff table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        employeeId TEXT UNIQUE NOT NULL,
        dateOfBirth DATE,
        address TEXT,
        qualification TEXT,
        experience INTEGER DEFAULT 0,
        subjects TEXT, -- Comma-separated list of subjects
        salary REAL DEFAULT 0,
        assignedOffice TEXT, -- Office assigned by admin (e.g., 'head_teacher', 'discipline_master', 'sports_coordinator')
        officeAssignedBy INTEGER, -- Admin who assigned the office
        officeAssignedAt DATETIME, -- When office was assigned
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES Users(id),
        FOREIGN KEY (officeAssignedBy) REFERENCES Users(id)
      )
    `);

    // Create UserSessions table for login tracking
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS UserSessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        loginTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        logoutTime DATETIME,
        ipAddress TEXT,
        userAgent TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES Users(id)
      )
    `);

    // Create Comments table (for complaints/reports)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fromUser TEXT NOT NULL,
        fromRole TEXT NOT NULL,
        toUser TEXT NOT NULL,
        toRole TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'general' CHECK (category IN ('academic', 'administrative', 'disciplinary', 'facilities', 'transport', 'general')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
        studentAdmission TEXT,
        academicSession TEXT,
        term TEXT,
        status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
        reply TEXT,
        repliedAt DATETIME,
        repliedBy TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add category column to existing Comments table if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE Comments ADD COLUMN category TEXT DEFAULT 'general' CHECK (category IN ('academic', 'administrative', 'disciplinary', 'facilities', 'transport', 'general'))
      `);
      console.log('✅ Added category column to Comments table');
    } catch (error) {
      // Column might already exist, ignore error
      console.log('📝 Category column already exists in Comments table');
    }

    // Create Reports table for storing academic and administrative reports
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        reportType TEXT NOT NULL CHECK (reportType IN ('term', 'range', 'financial', 'academic', 'administrative')),
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_admin', 'reviewed', 'approved', 'archived')),
        generatedBy INTEGER NOT NULL,
        generatedByRole TEXT NOT NULL,
        sentToAdmin BOOLEAN DEFAULT 0,
        sentToAdminAt DATETIME,
        reviewedBy INTEGER,
        reviewedAt DATETIME,
        approvedBy INTEGER,
        approvedAt DATETIME,
        parameters TEXT, -- JSON string of report parameters
        reportData TEXT NOT NULL, -- JSON string of report data
        academicYear TEXT,
        term TEXT,
        startYear TEXT,
        endYear TEXT,
        fileUrl TEXT, -- For future file attachments
        notes TEXT, -- Admin notes or comments
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (generatedBy) REFERENCES Users(id),
        FOREIGN KEY (reviewedBy) REFERENCES Users(id),
        FOREIGN KEY (approvedBy) REFERENCES Users(id)
      )
    `);

    // Create Expenditures table for tracking school expenses
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Expenditures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('utilities', 'salaries', 'maintenance', 'supplies', 'transport', 'equipment', 'income', 'other')),
        amount REAL NOT NULL CHECK (amount > 0),
        expenditureDate DATE NOT NULL,
        academicYear TEXT NOT NULL,
        term TEXT NOT NULL CHECK (term IN ('first', 'second', 'third')),
        approvedBy INTEGER NOT NULL,
        recordedBy INTEGER NOT NULL,
        receiptNumber TEXT,
        vendor TEXT,
        paymentMethod TEXT CHECK (paymentMethod IN ('cash', 'bank_transfer', 'cheque', 'online')),
        status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (approvedBy) REFERENCES Users(id),
        FOREIGN KEY (recordedBy) REFERENCES Users(id)
      )
    `);
    
    console.log('✅ Database tables created');
    
    // Migrate existing Payments table to allow NULL studentId for manual money additions
    try {
      // Check if we need to migrate the Payments table
      const [tableInfo] = await sequelize.query(`PRAGMA table_info(Payments)`, { type: 'SELECT' }) as any[];
      const studentIdColumn = tableInfo.find((col: any) => col.name === 'studentId');
      
      if (studentIdColumn && studentIdColumn.notnull === 1) {
        console.log('🔄 Migrating Payments table to allow NULL studentId...');
        
        // Create a new table with the correct schema
        await sequelize.query(`
          CREATE TABLE Payments_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studentId INTEGER,
            academicYear TEXT NOT NULL,
            term TEXT NOT NULL CHECK (term IN ('first', 'second', 'third')),
            paymentType TEXT NOT NULL CHECK (paymentType IN ('tuition', 'transport', 'meal', 'uniform', 'books', 'exam', 'other')),
            amount REAL NOT NULL CHECK (amount >= 0),
            amountPaid REAL DEFAULT 0 CHECK (amountPaid >= 0),
            balance REAL DEFAULT 0,
            paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            dueDate DATETIME NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
            paymentMethod TEXT CHECK (paymentMethod IN ('cash', 'bank_transfer', 'cheque', 'online')),
            receiptNumber TEXT UNIQUE,
            confirmedBy INTEGER,
            confirmedAt DATETIME,
            description TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (studentId) REFERENCES Students(id),
            FOREIGN KEY (confirmedBy) REFERENCES Users(id)
          )
        `);
        
        // Copy data from old table to new table
        await sequelize.query(`
          INSERT INTO Payments_new SELECT * FROM Payments
        `);
        
        // Drop old table and rename new table
        await sequelize.query(`DROP TABLE Payments`);
        await sequelize.query(`ALTER TABLE Payments_new RENAME TO Payments`);
        
        console.log('✅ Payments table migration completed');
      }
    } catch (error) {
      console.log('📝 Payments table migration not needed or already completed');
    }

    // Migrate Expenditures table to allow 'income' category
    try {
      // Test if we can insert an 'income' category record
      await sequelize.query(`
        INSERT INTO Expenditures 
        (description, category, amount, expenditureDate, academicYear, term, approvedBy, recordedBy, status)
        VALUES ('Test Income', 'income', 1, date('now'), '2024/2025', 'first', 1, 1, 'approved')
      `);
      
      // If successful, delete the test record
      await sequelize.query(`DELETE FROM Expenditures WHERE description = 'Test Income'`);
      console.log('📝 Expenditures table already supports income category');
    } catch (error) {
      console.log('🔄 Migrating Expenditures table to support income category...');
      
      try {
        // Create a new table with the updated schema
        await sequelize.query(`
          CREATE TABLE Expenditures_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN ('utilities', 'salaries', 'maintenance', 'supplies', 'transport', 'equipment', 'income', 'other')),
            amount REAL NOT NULL CHECK (amount > 0),
            expenditureDate DATE NOT NULL,
            academicYear TEXT NOT NULL,
            term TEXT NOT NULL CHECK (term IN ('first', 'second', 'third')),
            approvedBy INTEGER NOT NULL,
            recordedBy INTEGER NOT NULL,
            receiptNumber TEXT,
            vendor TEXT,
            paymentMethod TEXT CHECK (paymentMethod IN ('cash', 'bank_transfer', 'cheque', 'online')),
            status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
            notes TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (approvedBy) REFERENCES Users(id),
            FOREIGN KEY (recordedBy) REFERENCES Users(id)
          )
        `);
        
        // Copy data from old table to new table
        await sequelize.query(`
          INSERT INTO Expenditures_new SELECT * FROM Expenditures
        `);
        
        // Drop old table and rename new table
        await sequelize.query(`DROP TABLE Expenditures`);
        await sequelize.query(`ALTER TABLE Expenditures_new RENAME TO Expenditures`);
        
        console.log('✅ Expenditures table migration completed');
      } catch (migrationError) {
        console.log('❌ Expenditures table migration failed:', migrationError);
      }
    }
    
    // Seed demo data
    await seedDemoData();
    
  } catch (error) {
    console.error('❌ SQLite connection error:', error);
  }
};

// Demo data seeding
const seedDemoData = async () => {
  try {
    // Check if demo data already exists
    const result = await sequelize.query('SELECT COUNT(*) as count FROM Users', {
      type: 'SELECT'
    });
    
    if ((result[0] as any).count > 0) {
      console.log('📚 Demo data already exists');
      return;
    }

    console.log('🌱 Seeding demo data...');
    
    // Insert demo users with plain text passwords (for demo purposes)
    await sequelize.query(`
      INSERT INTO Users (firstName, lastName, email, password, role, office, phone, isActive) VALUES
      ('Admin', 'User', 'admin@shambil.edu.ng', 'admin123', 'admin', 'Administration', '+234-801-234-5678', 1),
      ('John', 'Student', 'student@shambil.edu.ng', 'student123', 'student', NULL, '+234-802-345-6789', 1),
      ('Jane', 'Teacher', 'teacher@shambil.edu.ng', 'teacher123', 'teacher', 'Academic Department', '+234-803-456-7890', 1),
      ('Mary', 'Accountant', 'accountant@shambil.edu.ng', 'accountant123', 'accountant', 'Finance Department', '+234-804-567-8901', 1),
      ('David', 'ExamOfficer', 'exam@shambil.edu.ng', 'exam123', 'exam_officer', 'Examination Department', '+234-805-678-9012', 1),
      ('Sarah', 'Parent', 'parent@shambil.edu.ng', 'parent123', 'parent', NULL, '+234-806-789-0123', 1),
      ('Alice', 'Johnson', 'alice@shambil.edu.ng', 'student123', 'student', NULL, '+234-807-890-1234', 1),
      ('Bob', 'Williams', 'bob@shambil.edu.ng', 'student123', 'student', NULL, '+234-808-901-2345', 1),
      ('Carol', 'Brown', 'carol@shambil.edu.ng', 'student123', 'student', NULL, '+234-809-012-3456', 1)
    `);
    
    // Insert Classes
    await sequelize.query(`
      INSERT INTO Classes (name, level, capacity, classTeacher) VALUES
      ('JSS 1A', 'Junior Secondary', 30, 3),
      ('JSS 1B', 'Junior Secondary', 30, 3),
      ('JSS 2A', 'Junior Secondary', 30, 3),
      ('JSS 2B', 'Junior Secondary', 30, 3),
      ('JSS 3A', 'Junior Secondary', 30, 3),
      ('SS 1A', 'Senior Secondary', 25, 3),
      ('SS 2A', 'Senior Secondary', 25, 3),
      ('SS 3A', 'Senior Secondary', 25, 3)
    `);

    // Insert Subjects
    await sequelize.query(`
      INSERT INTO Subjects (name, code, description) VALUES
      ('Mathematics', 'MTH', 'General Mathematics'),
      ('English Language', 'ENG', 'English Language and Literature'),
      ('Physics', 'PHY', 'General Physics'),
      ('Chemistry', 'CHE', 'General Chemistry'),
      ('Biology', 'BIO', 'General Biology'),
      ('Geography', 'GEO', 'Physical and Human Geography'),
      ('History', 'HIS', 'Nigerian and World History'),
      ('Civic Education', 'CIV', 'Civic Education and Social Studies'),
      ('Computer Studies', 'CMP', 'Computer Science and ICT'),
      ('Agricultural Science', 'AGR', 'Agricultural Science')
    `);

    // Insert Students
    await sequelize.query(`
      INSERT INTO Students (userId, admissionNumber, classId, house, dateOfBirth, parentId, guardianName, guardianPhone, address) VALUES
      (2, 'SHA/2024/001', 3, 'Blue House', '2008-03-15', 6, 'Sarah Parent', '+234-806-789-0123', '123 Main Street, Birnin Gwari'),
      (7, 'SHA/2024/002', 3, 'Red House', '2008-07-22', 6, 'Sarah Parent', '+234-806-789-0123', '456 Oak Avenue, Birnin Gwari'),
      (8, 'SHA/2024/003', 2, 'Green House', '2009-01-10', 6, 'Bob Williams Sr.', '+234-807-123-4567', '789 Pine Road, Birnin Gwari'),
      (9, 'SHA/2024/004', 1, 'Yellow House', '2009-11-05', 6, 'Carol Brown Sr.', '+234-808-234-5678', '321 Elm Street, Birnin Gwari')
    `);

    // Insert Sample Results for 2024/2025 Second Term
    await sequelize.query(`
      INSERT INTO Results (studentId, classId, academicYear, term, totalScore, averageScore, overallGrade, position, totalStudents, remarks, enteredBy, published) VALUES
      (1, 3, '2024/2025', 'second', 680, 85.0, 'A', 3, 25, 'Excellent performance. Keep it up!', 5, 1),
      (2, 3, '2024/2025', 'second', 720, 90.0, 'A+', 1, 25, 'Outstanding performance!', 5, 1),
      (3, 2, '2024/2025', 'second', 640, 80.0, 'B+', 5, 28, 'Good performance. Can do better.', 5, 1),
      (4, 1, '2024/2025', 'second', 600, 75.0, 'B', 8, 30, 'Satisfactory performance.', 5, 1)
    `);

    // Insert Subject Results for Student 1 (John Student)
    await sequelize.query(`
      INSERT INTO SubjectResults (resultId, subjectId, ca1, ca2, exam, total, grade, remark) VALUES
      (1, 1, 18, 17, 50, 85, 'A', 'Excellent'),
      (1, 2, 16, 15, 47, 78, 'B+', 'Very Good'),
      (1, 3, 17, 16, 49, 82, 'A-', 'Excellent'),
      (1, 4, 16, 16, 48, 80, 'B+', 'Very Good'),
      (1, 5, 18, 18, 52, 88, 'A', 'Excellent'),
      (1, 6, 15, 14, 46, 75, 'B', 'Good'),
      (1, 7, 19, 18, 53, 90, 'A+', 'Outstanding'),
      (1, 8, 19, 19, 54, 92, 'A+', 'Outstanding')
    `);

    // Insert Subject Results for Student 2 (Alice Johnson)
    await sequelize.query(`
      INSERT INTO SubjectResults (resultId, subjectId, ca1, ca2, exam, total, grade, remark) VALUES
      (2, 1, 19, 19, 55, 93, 'A+', 'Outstanding'),
      (2, 2, 18, 18, 52, 88, 'A', 'Excellent'),
      (2, 3, 19, 18, 54, 91, 'A+', 'Outstanding'),
      (2, 4, 18, 17, 53, 88, 'A', 'Excellent'),
      (2, 5, 19, 19, 56, 94, 'A+', 'Outstanding'),
      (2, 6, 17, 16, 50, 83, 'A-', 'Excellent'),
      (2, 7, 20, 19, 57, 96, 'A+', 'Outstanding'),
      (2, 8, 19, 20, 58, 97, 'A+', 'Outstanding')
    `);

    // Insert Payments
    await sequelize.query(`
      INSERT INTO Payments (studentId, academicYear, term, paymentType, amount, amountPaid, balance, dueDate, status, paymentMethod, receiptNumber, confirmedBy, confirmedAt, description) VALUES
      (1, '2024/2025', 'second', 'tuition', 45000, 45000, 0, '2024-01-15', 'paid', 'bank_transfer', 'RCP/2024/SEC/001', 4, '2024-01-10 10:30:00', 'School Fees - Second Term'),
      (1, '2024/2025', 'second', 'exam', 15000, 15000, 0, '2024-02-15', 'paid', 'cash', 'RCP/2024/SEC/002', 4, '2024-02-12 14:20:00', 'Examination Fees'),
      (1, '2024/2025', 'second', 'other', 8000, 8000, 0, '2024-03-01', 'paid', 'online', 'RCP/2024/SEC/003', 4, '2024-02-28 16:45:00', 'Sports & Activities Fee'),
      (2, '2024/2025', 'second', 'tuition', 45000, 30000, 15000, '2024-01-15', 'partial', 'bank_transfer', 'RCP/2024/SEC/004', 4, '2024-01-20 09:15:00', 'School Fees - Second Term (Partial)'),
      (3, '2024/2025', 'second', 'tuition', 45000, 45000, 0, '2024-01-15', 'paid', 'cheque', 'RCP/2024/SEC/005', 4, '2024-01-08 11:00:00', 'School Fees - Second Term'),
      (4, '2024/2025', 'second', 'tuition', 45000, 0, 45000, '2024-01-15', 'overdue', NULL, NULL, NULL, NULL, 'School Fees - Second Term (Unpaid)')
    `);

    // Insert Attendance Records (Sample for current term)
    const startDate = new Date('2024-09-01');
    const endDate = new Date('2024-12-15');
    const students = [1, 2, 3, 4];
    
    for (let studentId of students) {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const attendanceRate = studentId === 1 ? 0.95 : studentId === 2 ? 0.98 : studentId === 3 ? 0.92 : 0.88;
          const status = Math.random() < attendanceRate ? 'present' : 'absent';
          
          await sequelize.query(`
            INSERT INTO Attendance (studentId, classId, academicYear, term, attendanceDate, status, markedBy) VALUES
            (${studentId}, ${studentId <= 2 ? 3 : studentId === 3 ? 2 : 1}, '2024/2025', 'second', '${currentDate.toISOString().split('T')[0]}', '${status}', 3)
          `);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Insert Staff Records
    await sequelize.query(`
      INSERT INTO Staff (userId, employeeId, dateOfBirth, address, qualification, experience, subjects, salary) VALUES
      (3, 'EMP/2024/001', '1985-06-15', '456 Teacher Lane, Birnin Gwari', 'B.Ed Mathematics', 8, 'Mathematics, Further Mathematics', 120000),
      (5, 'EMP/2024/002', '1982-03-20', '789 Exam Street, Birnin Gwari', 'M.Ed Educational Assessment', 12, 'Mathematics, Physics, Chemistry', 150000)
    `);

    // Insert Sample Comments/Reports
    await sequelize.query(`
      INSERT INTO Comments (fromUser, fromRole, toUser, toRole, subject, message, category, priority, studentAdmission, academicSession, term, status) VALUES
      ('John Student', 'student', 'Admin', 'admin', 'Library Access Request', 'I need extended library access for my research project. The current hours are not sufficient for my studies.', 'facilities', 'normal', 'SHA/2024/001', '2024/2025', 'second', 'unread'),
      ('Alice Johnson', 'student', 'Exam Officer', 'exam_officer', 'Grade Inquiry', 'I would like to review my Mathematics exam paper. I believe there might be an error in the grading.', 'academic', 'high', 'SHA/2024/002', '2024/2025', 'second', 'unread'),
      ('Sarah Parent', 'parent', 'Admin', 'admin', 'Parent-Teacher Meeting Request', 'I would like to schedule a meeting to discuss my child''s academic progress and behavior.', 'administrative', 'normal', 'SHA/2024/001', '2024/2025', 'second', 'read'),
      ('Bob Williams', 'student', 'Admin', 'admin', 'Transport Issue', 'The school bus has been consistently late for the past week. This is affecting my punctuality.', 'transport', 'high', 'SHA/2024/003', '2024/2025', 'second', 'unread'),
      ('Carol Brown', 'student', 'Exam Officer', 'exam_officer', 'Exam Schedule Clarification', 'Could you please clarify the examination timetable for next week? There seems to be a conflict.', 'academic', 'normal', 'SHA/2024/004', '2024/2025', 'second', 'read')
    `);
    
    console.log('✅ Demo users created with simple passwords!');
    console.log('✅ Demo classes, subjects, students, results, payments, and attendance created!');
    console.log('✅ Demo comments and reports created!');
    console.log('🔑 Login credentials:');
    console.log('   Admin: admin@shambil.edu.ng / admin123');
    console.log('   Student (John): student@shambil.edu.ng / student123');
    console.log('   Student (Alice): alice@shambil.edu.ng / student123');
    console.log('   Teacher: teacher@shambil.edu.ng / teacher123');
    console.log('   Accountant: accountant@shambil.edu.ng / accountant123');
    console.log('   Exam Officer: exam@shambil.edu.ng / exam123');
    console.log('   Parent: parent@shambil.edu.ng / parent123');
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
  }
};

export default sequelize;