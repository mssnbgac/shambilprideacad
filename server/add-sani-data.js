// Add sample data for Muhammad Sani
const { Sequelize } = require('sequelize');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database/shambil_academy.sqlite',
  logging: false
});

async function addSaniData() {
    console.log('📊 Adding sample data for Muhammad Sani...\n');
    
    try {
        // Get Muhammad Sani's student ID
        const [students] = await sequelize.query(`
            SELECT s.*, u.firstName, u.lastName 
            FROM Students s 
            JOIN Users u ON s.userId = u.id 
            WHERE s.admissionNumber = 'SHA/1996/002'
        `);
        
        if (students.length === 0) {
            console.log('❌ Muhammad Sani not found');
            return;
        }
        
        const student = students[0];
        console.log(`✅ Found student: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
        
        // 1. Add attendance records
        console.log('\n1. 📅 Adding attendance records...');
        const attendanceRecords = [
            { date: '2024-09-01', status: 'present' },
            { date: '2024-09-02', status: 'present' },
            { date: '2024-09-03', status: 'absent' },
            { date: '2024-09-04', status: 'present' },
            { date: '2024-09-05', status: 'present' },
            { date: '2024-09-06', status: 'present' },
            { date: '2024-09-09', status: 'present' },
            { date: '2024-09-10', status: 'present' },
            { date: '2024-09-11', status: 'present' },
            { date: '2024-09-12', status: 'absent' },
            { date: '2024-09-13', status: 'present' },
            { date: '2024-09-16', status: 'present' },
            { date: '2024-09-17', status: 'present' },
            { date: '2024-09-18', status: 'present' },
            { date: '2024-09-19', status: 'present' },
            { date: '2024-09-20', status: 'present' }
        ];
        
        for (const record of attendanceRecords) {
            await sequelize.query(`
                INSERT OR REPLACE INTO Attendance (
                    studentId, classId, attendanceDate, status, academicYear, term, 
                    markedBy, markedAt, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, '2024/2025', 'first', 1, datetime('now'), datetime('now'), datetime('now'))
            `, {
                replacements: [student.id, student.classId, record.date, record.status]
            });
        }
        console.log(`✅ Added ${attendanceRecords.length} attendance records`);
        
        // 2. Add payment records
        console.log('\n2. 💰 Adding payment records...');
        const paymentRecords = [
            {
                description: 'School Fees - First Term',
                amount: 45000,
                status: 'paid',
                paymentDate: '2024-09-01',
                dueDate: '2024-09-15',
                paymentMethod: 'bank_transfer',
                receiptNumber: 'RCP/2024/FIRST/001'
            },
            {
                description: 'Examination Fees',
                amount: 5000,
                status: 'paid',
                paymentDate: '2024-10-15',
                dueDate: '2024-10-20',
                paymentMethod: 'cash',
                receiptNumber: 'RCP/2024/FIRST/002'
            },
            {
                description: 'Sports Levy',
                amount: 2000,
                status: 'paid',
                paymentDate: '2024-09-10',
                dueDate: '2024-09-20',
                paymentMethod: 'bank_transfer',
                receiptNumber: 'RCP/2024/FIRST/003'
            }
        ];
        
        for (const payment of paymentRecords) {
            await sequelize.query(`
                INSERT OR REPLACE INTO Payments (
                    studentId, description, amount, amountPaid, balance, status, paymentDate, dueDate,
                    paymentMethod, receiptNumber, academicYear, term, paymentType,
                    createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, '2024/2025', 'first', 'tuition', datetime('now'), datetime('now'))
            `, {
                replacements: [
                    student.id, payment.description, payment.amount, payment.amount,
                    payment.status, payment.paymentDate, payment.dueDate, payment.paymentMethod, payment.receiptNumber
                ]
            });
        }
        console.log(`✅ Added ${paymentRecords.length} payment records`);
        
        // 3. Add academic results
        console.log('\n3. 📚 Adding academic results...');
        
        // First, get or create subjects
        const subjects = [
            { name: 'Mathematics', code: 'MTH' },
            { name: 'English Language', code: 'ENG' },
            { name: 'Basic Science', code: 'BSC' },
            { name: 'Social Studies', code: 'SST' },
            { name: 'Computer Studies', code: 'CMP' },
            { name: 'French', code: 'FRE' },
            { name: 'Civic Education', code: 'CIV' },
            { name: 'Physical Education', code: 'PHE' }
        ];
        
        for (const subject of subjects) {
            await sequelize.query(`
                INSERT OR IGNORE INTO Subjects (name, code, createdAt, updatedAt)
                VALUES (?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [subject.name, subject.code]
            });
        }
        
        // Get subject IDs
        const [subjectRecords] = await sequelize.query(`
            SELECT id, name FROM Subjects WHERE code IN ('MTH', 'ENG', 'BSC', 'SST', 'CMP', 'FRE', 'CIV', 'PHE')
        `);
        
        // Add results for each subject
        const results = [
            { subject: 'Mathematics', ca1: 18, ca2: 16, exam: 65, total: 99, grade: 'A' },
            { subject: 'English Language', ca1: 17, ca2: 18, exam: 58, total: 93, grade: 'A' },
            { subject: 'Basic Science', ca1: 16, ca2: 15, exam: 52, total: 83, grade: 'B' },
            { subject: 'Social Studies', ca1: 19, ca2: 17, exam: 48, total: 84, grade: 'B' },
            { subject: 'Computer Studies', ca1: 20, ca2: 19, exam: 62, total: 101, grade: 'A' },
            { subject: 'French', ca1: 14, ca2: 13, exam: 45, total: 72, grade: 'C' },
            { subject: 'Civic Education', ca1: 18, ca2: 16, exam: 55, total: 89, grade: 'B' },
            { subject: 'Physical Education', ca1: 19, ca2: 18, exam: 58, total: 95, grade: 'A' }
        ];
        
        // Add results for each subject
        const totalScore = results.reduce((sum, r) => sum + r.total, 0);
        const averageScore = Math.round(totalScore / results.length);
        const overallGrade = averageScore >= 90 ? 'A' : averageScore >= 80 ? 'B' : averageScore >= 70 ? 'C' : averageScore >= 60 ? 'D' : 'F';
        
        // Insert overall result record
        await sequelize.query(`
            INSERT OR REPLACE INTO Results (
                studentId, classId, academicYear, term, totalScore, averageScore, 
                overallGrade, position, totalStudents, remarks, enteredBy, enteredAt,
                published, publishedAt, createdAt, updatedAt
            ) VALUES (?, ?, '2024/2025', 'first', ?, ?, ?, 5, 25, 'Good performance', 1, 
                     datetime('now'), 1, datetime('now'), datetime('now'), datetime('now'))
        `, {
            replacements: [student.id, student.classId, totalScore, averageScore, overallGrade]
        });
        
        // Also add individual subject results to SubjectResults table if it exists
        try {
            for (const result of results) {
                const subjectRecord = subjectRecords.find(s => s.name === result.subject);
                if (subjectRecord) {
                    await sequelize.query(`
                        INSERT OR REPLACE INTO SubjectResults (
                            studentId, subjectId, academicYear, term, ca1, ca2, exam, total, grade,
                            createdAt, updatedAt
                        ) VALUES (?, ?, '2024/2025', 'first', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `, {
                        replacements: [
                            student.id, subjectRecord.id, result.ca1, result.ca2, 
                            result.exam, result.total, result.grade
                        ]
                    });
                }
            }
        } catch (subjectResultsError) {
            console.log('   ⚠️  SubjectResults table not available, using main Results table only');
        }
        console.log(`✅ Added results for ${results.length} subjects`);
        
        // 4. Test the data
        console.log('\n4. 🧪 Testing the added data...');
        
        // Test attendance
        const [attendanceTest] = await sequelize.query(`
            SELECT 
                COUNT(*) as totalDays,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays
            FROM Attendance 
            WHERE studentId = ? AND academicYear = '2024/2025'
        `, {
            replacements: [student.id]
        });
        
        const attendance = attendanceTest[0];
        const attendancePercentage = Math.round((attendance.presentDays / attendance.totalDays) * 100);
        console.log(`   📅 Attendance: ${attendancePercentage}% (${attendance.presentDays}/${attendance.totalDays} days)`);
        
        // Test payments
        const [paymentsTest] = await sequelize.query(`
            SELECT COUNT(*) as count, SUM(amountPaid) as totalPaid
            FROM Payments 
            WHERE studentId = ? AND academicYear = '2024/2025'
        `, {
            replacements: [student.id]
        });
        
        console.log(`   💰 Payments: ${paymentsTest[0].count} payments, ₦${paymentsTest[0].totalPaid} total`);
        
        // Test results
        const [resultsTest] = await sequelize.query(`
            SELECT COUNT(*) as count, AVG(averageScore) as average
            FROM Results 
            WHERE studentId = ? AND academicYear = '2024/2025'
        `, {
            replacements: [student.id]
        });
        
        console.log(`   📚 Results: ${resultsTest[0].count} result records, ${Math.round(resultsTest[0].average || 0)}% average`);
        
        console.log('\n🎉 Sample data added successfully!');
        console.log('\n📋 Muhammad Sani now has:');
        console.log(`   ✅ ${attendanceRecords.length} attendance records`);
        console.log(`   ✅ ${paymentRecords.length} payment records with receipts`);
        console.log(`   ✅ ${results.length} subject results`);
        console.log('   ✅ Ready for receipt and transcript downloads');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

addSaniData();