import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Configure axios base URL
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Add authentication interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Generate academic sessions from 2024/2025 to 2149/2150
const generateAcademicSessions = (): string[] => {
  const sessions: string[] = [];
  for (let year = 2024; year <= 2149; year++) {
    sessions.push(`${year}/${year + 1}`);
  }
  return sessions.reverse(); // Most recent first
};

const academicSessions = generateAcademicSessions();

interface StudentStats {
  attendancePercentage: number;
  totalClasses: number;
  presentDays: number;
  recentGrades: any[];
}

const StudentDashboard: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState('2024/2025');
  const [selectedTerm, setSelectedTerm] = useState('first');
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintRecipient, setComplaintRecipient] = useState<'admin' | 'exam_officer'>('admin');
  const [complaintData, setComplaintData] = useState({
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high'
  });
  
  // New state for viewing different sections
  const [activeView, setActiveView] = useState<'dashboard' | 'grades' | 'attendance' | 'payments' | 'messages'>('dashboard');

  const { isLoading } = useQuery<StudentStats>(
    'student-dashboard-stats',
    () => api.get('/dashboard/stats').then(res => res.data)
  );

  const { data: studentData, isLoading: isLoadingStudentData, error: studentDataError } = useQuery(
    'student-dashboard-data',
    () => {
      console.log('🔍 Making API call to fetch student data...');
      return api.get('/dashboard/student/current').then(res => {
        console.log('✅ Student data received:', res.data);
        return res.data;
      }).catch(err => {
        console.error('❌ Student data error:', err.response?.data || err.message);
        throw err;
      });
    }
  );

  // Debug logging
  React.useEffect(() => {
    if (studentData) {
      console.log('✅ Student data loaded:', studentData);
    }
    if (studentDataError) {
      console.error('❌ Student data error:', studentDataError);
    }
  }, [studentData, studentDataError]);

  // Fetch student grades
  const { data: grades } = useQuery(
    ['student-grades', selectedSession, selectedTerm],
    () => api.get(`/results/student/current?academicYear=${selectedSession}&term=${selectedTerm}`).then(res => res.data),
    { enabled: activeView === 'grades' }
  );

  // Fetch student attendance
  const { data: attendance } = useQuery(
    ['student-attendance', selectedSession, selectedTerm],
    () => api.get(`/attendance/student/current?academicYear=${selectedSession}&term=${selectedTerm}`).then(res => res.data),
    { enabled: activeView === 'attendance' }
  );

  // Fetch payment history
  const { data: paymentHistory } = useQuery(
    ['student-payments', selectedSession, selectedTerm],
    () => api.get(`/payments/student/current?academicYear=${selectedSession}&term=${selectedTerm}`).then(res => res.data),
    { enabled: activeView === 'payments' }
  );

  // Fetch student receipts
  const { data: receipts } = useQuery(
    ['student-receipts', selectedSession, selectedTerm],
    () => api.get(`/students/receipts/current?academicYear=${selectedSession}&term=${selectedTerm}`).then(res => res.data),
    { enabled: true }
  );

  // Fetch student messages and replies
  const { data: messages, refetch: refetchMessages } = useQuery(
    ['student-messages'],
    () => {
      const studentName = studentData?.student?.user?.firstName + ' ' + studentData?.student?.user?.lastName;
      return api.get(`/comments?role=student&studentName=${encodeURIComponent(studentName)}`).then(res => res.data);
    },
    { enabled: activeView === 'messages' && !!studentData?.student?.user }
  );

  // Download payment receipt function
  const downloadReceipt = async () => {
    try {
      // Check if there are any receipts available
      if (!receipts || !receipts.receipts || receipts.receipts.length === 0) {
        alert('❌ No payment receipts available for the selected session and term.');
        return;
      }

      // Get the most recent receipt for the selected session and term
      const availableReceipts = receipts.receipts.filter(
        (receipt: any) => receipt.academicYear === selectedSession && receipt.term === selectedTerm
      );

      if (availableReceipts.length === 0) {
        alert('❌ No payment receipts available for the selected session and term.');
        return;
      }

      // Use the most recent receipt
      const latestReceipt = availableReceipts[0];
      
      const receiptData = {
        studentName: `${studentData?.student?.user?.firstName || 'Student'} ${studentData?.student?.user?.lastName || 'Name'}`,
        admissionNumber: studentData?.student?.admissionNumber || 'SHA/2023/001',
        academicSession: latestReceipt.academicYear,
        term: latestReceipt.term,
        amount: `₦${latestReceipt.amountPaid?.toLocaleString() || '0'}`,
        paymentDate: new Date(latestReceipt.paymentDate).toLocaleDateString(),
        receiptNumber: latestReceipt.receiptNumber || `RCP/${selectedSession.replace('/', '')}/${selectedTerm.toUpperCase()}/001`,
        paymentMethod: latestReceipt.paymentMethod || 'Bank Transfer',
        transactionId: `TXN${Date.now()}`,
        bankName: 'First Bank Nigeria',
        accountNumber: '2034567890',
        paymentType: latestReceipt.paymentType || 'tuition',
        description: latestReceipt.description || 'School Fees Payment'
      };
      
      // Create modern styled HTML receipt
      const receiptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - ${receiptData.receiptNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .receipt-container {
            background: white;
            max-width: 600px;
            width: 100%;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            position: relative;
        }
        
        .receipt-header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .receipt-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
            background-size: 30px 30px;
        }
        
        .school-logo {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            position: relative;
            z-index: 1;
        }
        
        .school-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
        }
        
        .school-subtitle {
            font-size: 16px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .receipt-title {
            background: #f8f9fa;
            padding: 25px 30px;
            border-bottom: 3px solid #4CAF50;
        }
        
        .receipt-title h2 {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .receipt-body {
            padding: 40px 30px;
        }
        
        .receipt-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }
        
        .info-section h3 {
            color: #4CAF50;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 8px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #6c757d;
            font-weight: 500;
        }
        
        .info-value {
            color: #2c3e50;
            font-weight: 600;
        }
        
        .amount-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
            border: 2px solid #4CAF50;
        }
        
        .amount-label {
            color: #6c757d;
            font-size: 16px;
            margin-bottom: 10px;
        }
        
        .amount-value {
            color: #4CAF50;
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .payment-status {
            background: #4CAF50;
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            font-weight: 600;
            display: inline-block;
        }
        
        .receipt-footer {
            background: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .footer-message {
            font-size: 18px;
            margin-bottom: 15px;
        }
        
        .footer-note {
            opacity: 0.8;
            font-size: 14px;
        }
        
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(76, 175, 80, 0.05);
            font-weight: 900;
            pointer-events: none;
            z-index: 0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .receipt-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="watermark">PAID</div>
        
        <div class="receipt-header">
            <div class="school-logo">🏫</div>
            <div class="school-name">SHAMBIL PRIDE ACADEMY</div>
            <div class="school-subtitle">Birnin Gwari, Kaduna State</div>
        </div>
        
        <div class="receipt-title">
            <h2>💳 Payment Receipt</h2>
        </div>
        
        <div class="receipt-body">
            <div class="receipt-info">
                <div class="info-section">
                    <h3>📋 Receipt Details</h3>
                    <div class="info-item">
                        <span class="info-label">Receipt Number:</span>
                        <span class="info-value">${receiptData.receiptNumber}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date Issued:</span>
                        <span class="info-value">${receiptData.paymentDate}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Transaction ID:</span>
                        <span class="info-value">${receiptData.transactionId}</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>👤 Student Information</h3>
                    <div class="info-item">
                        <span class="info-label">Full Name:</span>
                        <span class="info-value">${receiptData.studentName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Admission Number:</span>
                        <span class="info-value">${receiptData.admissionNumber}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Academic Session:</span>
                        <span class="info-value">${receiptData.academicSession}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Term:</span>
                        <span class="info-value">${receiptData.term.charAt(0).toUpperCase() + receiptData.term.slice(1)} Term</span>
                    </div>
                </div>
            </div>
            
            <div class="amount-section">
                <div class="amount-label">Total Amount Paid</div>
                <div class="amount-value">${receiptData.amount}</div>
                <div class="payment-status">✅ PAYMENT CONFIRMED</div>
            </div>
            
            <div class="info-section">
                <h3>🏦 Payment Details</h3>
                <div class="info-item">
                    <span class="info-label">Payment Method:</span>
                    <span class="info-value">${receiptData.paymentMethod}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Bank Name:</span>
                    <span class="info-value">${receiptData.bankName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Account Number:</span>
                    <span class="info-value">${receiptData.accountNumber}</span>
                </div>
            </div>
        </div>
        
        <div class="receipt-footer">
            <div class="footer-message">🎉 Thank you for your payment!</div>
            <div class="footer-note">This is an official receipt from Shambil Pride Academy. Please keep this for your records.</div>
        </div>
    </div>
</body>
</html>
      `;
      
      const blob = new Blob([receiptHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payment_Receipt_${receiptData.receiptNumber.replace(/\//g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Show success message
      alert('✅ Modern payment receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('❌ Failed to download receipt. Please try again.');
    }
  };

  // Download transcript function
  const downloadTranscript = async () => {
    try {
      // Fetch actual results from API
      let actualResults = null;
      let actualSubjects = [];
      
      try {
        const response = await api.get(`/results/student/current?academicYear=${selectedSession}&term=${selectedTerm}`);
        if (response.data && response.data.hasResults) {
          actualResults = response.data.results;
          actualSubjects = response.data.subjects || [];
        }
      } catch (error) {
        console.error('Error fetching results for transcript:', error);
      }

      // Use actual data if available, otherwise use demo data as fallback
      const transcriptData = {
        studentName: `${studentData?.student?.user?.firstName || 'Student'} ${studentData?.student?.user?.lastName || 'Name'}`,
        admissionNumber: studentData?.student?.admissionNumber || 'SHA/2023/001',
        class: studentData?.student?.class?.name || 'JSS 2A',
        academicSession: selectedSession,
        term: selectedTerm,
        dateOfBirth: '15th March 2008',
        house: studentData?.student?.house || 'Blue House',
        actualResults: actualResults, // Add this line
        subjects: actualSubjects.length > 0 ? actualSubjects.map(subject => ({
          name: subject.subject?.name || 'Unknown Subject',
          ca1: subject.ca1 || 0,
          ca2: subject.ca2 || 0,
          exam: subject.exam || 0,
          total: subject.total || 0,
          grade: subject.grade || 'N/A',
          remark: subject.grade === 'A+' ? 'Outstanding' : 
                  subject.grade === 'A' ? 'Excellent' : 
                  subject.grade === 'B+' || subject.grade === 'B' ? 'Very Good' : 
                  subject.grade === 'C' ? 'Good' : 
                  subject.grade === 'D' ? 'Fair' : 'Needs Improvement'
        })) : [
          { name: 'No Results Available', ca1: 0, ca2: 0, exam: 0, total: 0, grade: 'N/A', remark: 'No data found for this term' }
        ],
        actualTotalScore: actualResults?.totalScore || 0,
        actualAverageScore: actualResults?.averageScore || 0,
        actualOverallGrade: actualResults?.overallGrade || 'N/A'
      };
      
      // Use actual totals if available, otherwise calculate from subjects
      const totalScore = transcriptData.actualTotalScore || transcriptData.subjects.reduce((sum, subject) => sum + subject.total, 0);
      const averageScore = transcriptData.actualAverageScore || (totalScore / Math.max(transcriptData.subjects.length, 1)).toFixed(1);
      const overallGrade = transcriptData.actualOverallGrade || (
        parseFloat(averageScore) >= 90 ? 'A+' : 
        parseFloat(averageScore) >= 80 ? 'A' : 
        parseFloat(averageScore) >= 70 ? 'B' : 
        parseFloat(averageScore) >= 60 ? 'C' : 'D'
      );
      
      // Create modern styled HTML transcript
      const transcriptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Transcript - ${transcriptData.studentName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .transcript-container {
            background: white;
            max-width: 900px;
            margin: 0 auto;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            position: relative;
        }
        
        .transcript-header {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .transcript-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="rgba(255,255,255,0.05)"/></svg>') repeat;
            background-size: 40px 40px;
        }
        
        .school-crest {
            width: 100px;
            height: 100px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            position: relative;
            z-index: 1;
            border: 3px solid rgba(255, 255, 255, 0.3);
        }
        
        .school-name {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .school-address {
            font-size: 16px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .transcript-title {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            border-bottom: 4px solid #2196F3;
        }
        
        .transcript-title h2 {
            color: #2c3e50;
            font-size: 28px;
            font-weight: 600;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }
        
        .student-info {
            padding: 40px 30px;
            background: #f8f9fa;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        
        .info-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            border-left: 5px solid #2196F3;
        }
        
        .info-card h3 {
            color: #2196F3;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #6c757d;
            font-weight: 500;
        }
        
        .info-value {
            color: #2c3e50;
            font-weight: 600;
        }
        
        .grades-section {
            padding: 40px 30px;
        }
        
        .grades-title {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 30px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .grades-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .grades-table th {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
            padding: 20px 15px;
            text-align: center;
            font-weight: 600;
            font-size: 14px;
        }
        
        .grades-table td {
            padding: 18px 15px;
            text-align: center;
            border-bottom: 1px solid #f1f3f4;
            font-weight: 500;
        }
        
        .grades-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .grades-table tr:hover {
            background: #e3f2fd;
            transition: background 0.3s ease;
        }
        
        .subject-name {
            text-align: left !important;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .grade-cell {
            font-weight: 700;
            font-size: 16px;
        }
        
        .grade-A { color: #4CAF50; }
        .grade-B { color: #2196F3; }
        .grade-C { color: #FF9800; }
        .grade-D { color: #F44336; }
        
        .summary-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 40px 30px;
            margin: 30px 0;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            border-top: 4px solid #2196F3;
        }
        
        .summary-label {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .summary-value {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 700;
        }
        
        .remarks-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }
        
        .remarks-title {
            color: #2196F3;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .remarks-text {
            color: #2c3e50;
            line-height: 1.6;
            font-style: italic;
        }
        
        .transcript-footer {
            background: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .footer-signature {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin-top: 40px;
        }
        
        .signature-block {
            text-align: center;
        }
        
        .signature-line {
            border-top: 2px solid #fff;
            margin: 30px 0 10px;
            padding-top: 10px;
        }
        
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 150px;
            color: rgba(33, 150, 243, 0.03);
            font-weight: 900;
            pointer-events: none;
            z-index: 0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .transcript-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="transcript-container">
        <div class="watermark">OFFICIAL</div>
        
        <div class="transcript-header">
            <div class="school-crest">🎓</div>
            <div class="school-name">SHAMBIL PRIDE ACADEMY</div>
            <div class="school-address">Birnin Gwari, Kaduna State, Nigeria</div>
        </div>
        
        <div class="transcript-title">
            <h2>📜 Official Academic Transcript</h2>
        </div>
        
        <div class="student-info">
            <div class="info-grid">
                <div class="info-card">
                    <h3>👤 Student Information</h3>
                    <div class="info-item">
                        <span class="info-label">Full Name:</span>
                        <span class="info-value">${transcriptData.studentName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Admission Number:</span>
                        <span class="info-value">${transcriptData.admissionNumber}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date of Birth:</span>
                        <span class="info-value">${transcriptData.dateOfBirth}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">House:</span>
                        <span class="info-value">${transcriptData.house}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>📚 Academic Details</h3>
                    <div class="info-item">
                        <span class="info-label">Class:</span>
                        <span class="info-value">${transcriptData.class}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Academic Session:</span>
                        <span class="info-value">${transcriptData.academicSession}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Term:</span>
                        <span class="info-value">${transcriptData.term.charAt(0).toUpperCase() + transcriptData.term.slice(1)} Term</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date Issued:</span>
                        <span class="info-value">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="grades-section">
            <div class="grades-title">📊 Academic Performance</div>
            
            <table class="grades-table">
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>CA1 (20)</th>
                        <th>CA2 (20)</th>
                        <th>Exam (60)</th>
                        <th>Total (100)</th>
                        <th>Grade</th>
                        <th>Remark</th>
                    </tr>
                </thead>
                <tbody>
                    ${transcriptData.subjects.map(subject => `
                        <tr>
                            <td class="subject-name">${subject.name}</td>
                            <td>${subject.ca1}</td>
                            <td>${subject.ca2}</td>
                            <td>${subject.exam}</td>
                            <td><strong>${subject.total}</strong></td>
                            <td class="grade-cell grade-${subject.grade.charAt(0)}">${subject.grade}</td>
                            <td>${subject.remark}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="summary-section">
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-label">Total Score</div>
                    <div class="summary-value">${totalScore}/${transcriptData.subjects.length * 100}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Average Score</div>
                    <div class="summary-value">${averageScore}%</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Overall Grade</div>
                    <div class="summary-value grade-${overallGrade.charAt(0)}">${overallGrade}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Class Position</div>
                    <div class="summary-value">${transcriptData.actualResults?.position || 'N/A'}${transcriptData.actualResults?.totalStudents ? '/' + transcriptData.actualResults.totalStudents : ''}</div>
                </div>
            </div>
            
            <div class="remarks-section">
                <div class="remarks-title">💬 Principal's Remarks</div>
                <div class="remarks-text">
                    "${transcriptData.studentName} has demonstrated exceptional academic performance throughout the ${transcriptData.term} term of the ${transcriptData.academicSession} academic session. The student shows consistent excellence across all subjects with particular strength in Computer Studies and Civic Education. This outstanding performance reflects dedication, hard work, and a genuine commitment to learning. Keep up the excellent work!"
                </div>
            </div>
        </div>
        
        <div class="transcript-footer">
            <div>This is an official transcript issued by Shambil Pride Academy</div>
            <div style="margin-top: 10px; opacity: 0.8;">For verification, contact: info@shambilacademy.edu.ng | +234-XXX-XXX-XXXX</div>
            
            <div class="footer-signature">
                <div class="signature-block">
                    <div class="signature-line">Class Teacher</div>
                </div>
                <div class="signature-block">
                    <div class="signature-line">Principal</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
      `;
      
      const blob = new Blob([transcriptHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Academic_Transcript_${transcriptData.admissionNumber}_${selectedSession.replace('/', '_')}_${selectedTerm}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Show success message
      alert('✅ Modern academic transcript downloaded successfully!');
    } catch (error) {
      console.error('Error downloading transcript:', error);
      alert('❌ Failed to download transcript. Please try again.');
    }
  };

  // Submit complaint/comment function
  const submitComplaint = async () => {
    try {
      if (!complaintData.subject.trim() || !complaintData.message.trim()) {
        alert('⚠️ Please fill in both subject and message fields.');
        return;
      }

      const complaintPayload = {
        from: studentData?.student?.user?.firstName + ' ' + studentData?.student?.user?.lastName || 'Student',
        fromRole: 'student',
        to: complaintRecipient === 'admin' ? 'Admin' : 'Exam Officer',
        toRole: complaintRecipient,
        subject: complaintData.subject,
        message: complaintData.message,
        priority: complaintData.priority,
        studentAdmission: studentData?.student?.admissionNumber || 'SHA/2023/001',
        academicSession: selectedSession,
        term: selectedTerm,
        timestamp: new Date().toISOString()
      };

      // Simulate API call to submit complaint
      await api.post('/comments', complaintPayload);

      // Reset form
      setComplaintData({ subject: '', message: '', priority: 'normal' });
      setShowComplaintForm(false);

      // Refresh messages if on messages view
      if (activeView === 'messages') {
        refetchMessages();
      }

      // Show success message
      alert(`✅ Your message has been sent successfully to the ${complaintRecipient === 'admin' ? 'Admin' : 'Exam Officer'}!`);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert('❌ Failed to send message. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">🏫 Shambil Pride Academy - Student Dashboard</h1>
        <p className="text-green-100">Track your academic progress and performance.</p>
      </div>

      {/* Student Info Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        {isLoadingStudentData ? (
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-gray-500">...</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="h-6 bg-gray-300 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ) : studentDataError ? (
          <div className="text-center py-4">
            <p className="text-red-600">❌ Error loading student data</p>
            <p className="text-sm text-gray-500">Please refresh the page or contact support</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {studentData?.student?.user?.firstName?.charAt(0) || 'S'}
                {studentData?.student?.user?.lastName?.charAt(0) || 'T'}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {studentData?.student?.user?.firstName || 'Loading...'} {studentData?.student?.user?.lastName || ''}
              </h2>
              <p className="text-gray-600">
                Admission No: {studentData?.student?.admissionNumber || 'Loading...'}
              </p>
              <p className="text-gray-600">
                Class: {studentData?.student?.class?.name || 'Loading...'}
              </p>
              {studentData?.student?.house && (
                <p className="text-gray-600">
                  House: <span className="capitalize font-medium">{studentData.student.house}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('grades')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'grades'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎓 View Grades
          </button>
          <button
            onClick={() => setActiveView('attendance')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'attendance'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Check Attendance
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'payments'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💳 Payment History
          </button>
          <button
            onClick={() => setActiveView('messages')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'messages'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💬 Messages
          </button>
        </div>

        {/* Session and Term Selector */}
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {academicSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="first">First Term</option>
              <option value="second">Second Term</option>
              <option value="third">Third Term</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conditional Content Based on Active View */}
      {activeView === 'dashboard' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{studentData?.attendance?.percentage || 0}%</p>
              <p className="text-sm text-gray-500">{studentData?.attendance?.present || 0} of {studentData?.attendance?.totalDays || 0} days</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <span className="text-white text-xl">📅</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Results Available</p>
              <p className="text-2xl font-bold text-gray-900">{studentData?.recentResults?.length || 0}</p>
              <p className="text-sm text-gray-500">Published results</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <span className="text-white text-xl">🎓</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <button
            onClick={downloadReceipt}
            className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-gray-600">Payment Receipt</p>
              {receipts && receipts.receipts && receipts.receipts.length > 0 ? (
                <>
                  <p className="text-sm text-green-600 font-medium">Download Receipt</p>
                  <p className="text-sm text-gray-500">{receipts.receipts.length} receipt(s) available</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 font-medium">No receipts available</p>
                  <p className="text-sm text-gray-400">{selectedSession} - {selectedTerm} term</p>
                </>
              )}
            </div>
            <div className={`p-3 rounded-full ${receipts && receipts.receipts && receipts.receipts.length > 0 ? 'bg-yellow-500' : 'bg-gray-400'}`}>
              <span className="text-white text-xl">💰</span>
            </div>
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <button
            onClick={downloadTranscript}
            className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-gray-600">Academic Transcript</p>
              <p className="text-sm text-blue-600 font-medium">Download Transcript</p>
              <p className="text-sm text-gray-500">{selectedSession} - {selectedTerm} term</p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <span className="text-white text-xl">📄</span>
            </div>
          </button>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Welcome to Your Student Dashboard!</h3>
        <p className="text-blue-700">
          Here you can view your academic progress, attendance records, examination results, and payment status. 
          Use the navigation menu to access different sections of the school management system.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveView('grades')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl mb-2 block">📊</span>
            <span className="font-medium">View Grades</span>
          </button>
          <button 
            onClick={() => setActiveView('attendance')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl mb-2 block">📋</span>
            <span className="font-medium">Check Attendance</span>
          </button>
          <button 
            onClick={() => setActiveView('payments')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <span className="text-2xl mb-2 block">💳</span>
            <span className="font-medium">Payment History</span>
          </button>
          <button 
            onClick={() => setActiveView('messages')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <span className="text-2xl mb-2 block">💬</span>
            <span className="font-medium">View Messages</span>
          </button>
        </div>
      </div>

      {/* Send Comments/Complaints */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">💬 Send Message</h3>
        <p className="text-gray-600 mb-4">Have a question, concern, or feedback? Send a message to the appropriate school authority.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setComplaintRecipient('admin');
              setShowComplaintForm(true);
            }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">👨‍💼</span>
            <div className="text-left">
              <div className="font-medium text-blue-800">Send Message to Admin</div>
              <div className="text-sm text-blue-600">General inquiries, complaints, or requests</div>
            </div>
          </button>
          <button
            onClick={() => {
              setComplaintRecipient('exam_officer');
              setShowComplaintForm(true);
            }}
            className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">📝</span>
            <div className="text-left">
              <div className="font-medium text-green-800">Send Message to Exam Officer</div>
              <div className="text-sm text-green-600">Academic issues, grades, or exam concerns</div>
            </div>
          </button>
        </div>
      </div>

      {/* Download Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">📄 Download Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={downloadReceipt}
            className={`p-4 border rounded-lg transition-colors flex items-center gap-3 ${
              receipts && receipts.receipts && receipts.receipts.length > 0
                ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">🧾</span>
            <div className="text-left">
              <div className={`font-medium ${
                receipts && receipts.receipts && receipts.receipts.length > 0
                  ? 'text-yellow-800'
                  : 'text-gray-600'
              }`}>
                Download Payment Receipt
              </div>
              <div className={`text-sm ${
                receipts && receipts.receipts && receipts.receipts.length > 0
                  ? 'text-yellow-600'
                  : 'text-gray-500'
              }`}>
                {receipts && receipts.receipts && receipts.receipts.length > 0
                  ? `${receipts.receipts.length} receipt(s) available`
                  : 'No receipts available'
                }
              </div>
            </div>
          </button>
          <button
            onClick={downloadTranscript}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">📜</span>
            <div className="text-left">
              <div className="font-medium text-blue-800">Download Academic Transcript</div>
              <div className="text-sm text-blue-600">{selectedSession} - {selectedTerm} term</div>
            </div>
          </button>
        </div>
      </div>
        </>
      )}

      {/* Grades View */}
      {activeView === 'grades' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            🎓 Academic Results - {selectedSession} ({selectedTerm} Term)
          </h3>
          
          {grades && grades.length > 0 ? (
            <div className="space-y-6">
              {grades.map((result: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">
                      {result.academicYear} - {result.term} Term
                    </h4>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Position: {result.position || 'N/A'}</div>
                      <div className="text-sm text-gray-600">Average: {result.averageScore?.toFixed(1) || 'N/A'}%</div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Subject</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Score</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Grade</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.subjects?.map((subject: any, subIndex: number) => (
                          <tr key={subIndex} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{subject.subject || subject.name}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center font-bold">{subject.score}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-sm font-medium ${
                                subject.grade === 'A' || subject.grade === 'A+' ? 'bg-green-100 text-green-800' :
                                subject.grade === 'B' || subject.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                                subject.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {subject.grade}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm">{subject.remark || 'Good'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Total Score</div>
                      <div className="text-lg font-bold text-blue-600">{result.totalScore || 'N/A'}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Average</div>
                      <div className="text-lg font-bold text-green-600">{result.averageScore?.toFixed(1) || 'N/A'}%</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Position</div>
                      <div className="text-lg font-bold text-purple-600">{result.position || 'N/A'}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Grade</div>
                      <div className="text-lg font-bold text-yellow-600">{result.grade || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h4>
              <p className="text-gray-600">Results for {selectedSession} - {selectedTerm} term are not yet published.</p>
            </div>
          )}
        </div>
      )}

      {/* Attendance View */}
      {activeView === 'attendance' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            📅 Attendance Record - {selectedSession} ({selectedTerm} Term)
          </h3>
          
          {attendance ? (
            <div className="space-y-6">
              {/* Attendance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{attendance.presentDays || 0}</div>
                  <div className="text-sm text-gray-600">Days Present</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{attendance.absentDays || 0}</div>
                  <div className="text-sm text-gray-600">Days Absent</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{attendance.totalDays || 0}</div>
                  <div className="text-sm text-gray-600">Total Days</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{attendance.percentage || 0}%</div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-4">Monthly Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(attendance.monthlyData || [
                    { month: 'September', present: 20, absent: 2, total: 22, percentage: 90.9 },
                    { month: 'October', present: 22, absent: 1, total: 23, percentage: 95.7 },
                    { month: 'November', present: 21, absent: 1, total: 22, percentage: 95.5 },
                    { month: 'December', present: 22, absent: 1, total: 23, percentage: 95.7 }
                  ]).map((month: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">{month.month}</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Present:</span>
                          <span className="font-medium text-green-600">{month.present}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Absent:</span>
                          <span className="font-medium text-red-600">{month.absent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-medium">{month.total}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span>Rate:</span>
                          <span className="font-bold text-blue-600">{month.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-2">Attendance Status</h4>
                <div className="flex items-center gap-2">
                  {(attendance.percentage || 0) >= 90 ? (
                    <>
                      <span className="text-green-500 text-xl">✅</span>
                      <span className="text-green-700 font-medium">Excellent Attendance</span>
                      <span className="text-gray-600">- Keep up the good work!</span>
                    </>
                  ) : (attendance.percentage || 0) >= 75 ? (
                    <>
                      <span className="text-yellow-500 text-xl">⚠️</span>
                      <span className="text-yellow-700 font-medium">Good Attendance</span>
                      <span className="text-gray-600">- Try to improve further</span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-500 text-xl">❌</span>
                      <span className="text-red-700 font-medium">Poor Attendance</span>
                      <span className="text-gray-600">- Needs immediate improvement</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h4>
              <p className="text-gray-600">Attendance records for {selectedSession} - {selectedTerm} term are not available.</p>
            </div>
          )}
        </div>
      )}

      {/* Payment History View */}
      {activeView === 'payments' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            💳 Payment History - {selectedSession} ({selectedTerm} Term)
          </h3>
          
          {paymentHistory && paymentHistory.length > 0 ? (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">₦{(paymentHistory.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Paid</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{paymentHistory.length}</div>
                  <div className="text-sm text-gray-600">Transactions</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {paymentHistory.filter((p: any) => p.status === 'paid').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>

              {/* Payment List */}
              <div className="space-y-4">
                {paymentHistory.map((payment: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{payment.description || 'School Fees'}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status?.toUpperCase() || 'PAID'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Amount:</span>
                            <div className="text-lg font-bold text-gray-900">₦{(payment.amount || 45000).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="font-medium">Due Date:</span>
                            <div>{new Date(payment.dueDate || '2024-01-15').toLocaleDateString()}</div>
                          </div>
                          <div>
                            <span className="font-medium">Paid Date:</span>
                            <div>{payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'N/A'}</div>
                          </div>
                          <div>
                            <span className="font-medium">Session:</span>
                            <div>{payment.academicYear || selectedSession}</div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={downloadReceipt}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                        >
                          📄 Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💳</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Payment Records</h4>
              <p className="text-gray-600">No payment history found for {selectedSession} - {selectedTerm} term.</p>
              <div className="mt-4">
                <button
                  onClick={downloadReceipt}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  📄 Download Sample Receipt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages View */}
      {activeView === 'messages' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            💬 My Messages & Replies
          </h3>
          
          {messages && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message: any) => (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Message Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{message.subject}</h4>
                      <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                        <span>To: {message.to} ({message.toRole})</span>
                        <span>Priority: <span className={`px-2 py-1 rounded text-xs ${
                          message.priority === 'high' ? 'bg-red-100 text-red-800' :
                          message.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>{message.priority}</span></span>
                        <span>{new Date(message.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      message.reply ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {message.reply ? '✅ Replied' : '⏳ Pending'}
                    </div>
                  </div>
                  
                  {/* Original Message */}
                  <div className="bg-gray-50 p-3 rounded mb-3">
                    <p className="text-gray-700">{message.message}</p>
                  </div>
                  
                  {/* Reply Section */}
                  {message.reply && (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-600">Reply from {message.repliedBy}:</span>
                        <span className="text-sm text-gray-500">
                          {new Date(message.repliedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-gray-700">{message.reply}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Messages Yet</h4>
              <p className="text-gray-600 mb-4">You haven't sent any messages yet. Use the form below to send a message to Admin or Exam Officer.</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setComplaintRecipient('admin');
                    setShowComplaintForm(true);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  📧 Message Admin
                </button>
                <button
                  onClick={() => {
                    setComplaintRecipient('exam_officer');
                    setShowComplaintForm(true);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  📝 Message Exam Officer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complaint/Comment Form Modal */}
      {showComplaintForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`p-6 rounded-t-xl ${complaintRecipient === 'admin' ? 'bg-blue-500' : 'bg-green-500'} text-white`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {complaintRecipient === 'admin' ? '👨‍💼' : '📝'}
                    Send Message to {complaintRecipient === 'admin' ? 'Admin' : 'Exam Officer'}
                  </h3>
                  <p className="text-sm opacity-90 mt-1">
                    {complaintRecipient === 'admin' 
                      ? 'General inquiries, complaints, or administrative requests'
                      : 'Academic issues, grades, exam concerns, or result queries'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowComplaintForm(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Student Info Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">📋 Your Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{studentData?.student?.user?.firstName || 'Student'} {studentData?.student?.user?.lastName || 'Name'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Admission No:</span>
                    <span className="ml-2 font-medium">{studentData?.student?.admissionNumber || 'SHA/2023/001'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Class:</span>
                    <span className="ml-2 font-medium">{studentData?.student?.class?.name || 'JSS 2A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Session:</span>
                    <span className="ml-2 font-medium">{selectedSession} - {selectedTerm} term</span>
                  </div>
                </div>
              </div>

              {/* Priority Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📌 Priority Level</label>
                <select
                  value={complaintData.priority}
                  onChange={(e) => setComplaintData({...complaintData, priority: e.target.value as 'low' | 'normal' | 'high'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">🟢 Low - General inquiry or suggestion</option>
                  <option value="normal">🟡 Normal - Standard request or concern</option>
                  <option value="high">🔴 High - Urgent issue requiring immediate attention</option>
                </select>
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📝 Subject</label>
                <input
                  type="text"
                  value={complaintData.subject}
                  onChange={(e) => setComplaintData({...complaintData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={complaintRecipient === 'admin' 
                    ? 'e.g., Request for fee payment extension, Complaint about facilities...'
                    : 'e.g., Query about exam results, Request for grade review...'
                  }
                  maxLength={100}
                />
                <div className="text-xs text-gray-500 mt-1">{complaintData.subject.length}/100 characters</div>
              </div>

              {/* Message Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💬 Message</label>
                <textarea
                  value={complaintData.message}
                  onChange={(e) => setComplaintData({...complaintData, message: e.target.value})}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={complaintRecipient === 'admin'
                    ? 'Please describe your inquiry, concern, or request in detail. Include any relevant dates, names, or circumstances that would help us assist you better.'
                    : 'Please describe your academic concern in detail. Include subject names, exam dates, or any specific issues with your grades or academic records.'
                  }
                  maxLength={1000}
                />
                <div className="text-xs text-gray-500 mt-1">{complaintData.message.length}/1000 characters</div>
              </div>

              {/* Guidelines */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-medium text-yellow-800 mb-2">📋 Guidelines for Messaging</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Be respectful and professional in your communication</li>
                  <li>• Provide specific details to help us understand your concern</li>
                  <li>• Include relevant dates, names, or reference numbers if applicable</li>
                  <li>• Allow 24-48 hours for a response to non-urgent matters</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowComplaintForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitComplaint}
                disabled={!complaintData.subject.trim() || !complaintData.message.trim()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  complaintData.subject.trim() && complaintData.message.trim()
                    ? `${complaintRecipient === 'admin' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'} text-white`
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                📤 Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;