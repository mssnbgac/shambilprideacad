import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import AdminDashboard from '../components/dashboards/AdminDashboard.tsx';
import StudentDashboard from '../components/dashboards/StudentDashboard.tsx';
import ExamOfficerDashboard from '../components/dashboards/ExamOfficerDashboard.tsx';
import ParentDashboard from '../components/dashboards/ParentDashboard.tsx';
import TeacherDashboard from '../components/dashboards/TeacherDashboard.tsx';

// Type definitions
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionNumber: string;
  class: {
    name: string;
  };
  house: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  payment?: {
    status: string;
    amount: number;
    balance: number;
  };
}

interface AccountantData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  office?: string;
  role: string;
}

interface Stats {
  totalIncome: number;
  totalExpenditure: number;
  netBalance: number;
  totalPayments: number;
  confirmedPayments: number;
  pendingPayments: number;
  totalExpenditures: number;
}

interface ParentData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  children?: Array<{
    firstName: string;
    lastName: string;
    admissionNumber: string;
    className: string;
  }>;
}

// Full-featured AccountantDashboard component
const AccountantDashboard = () => {
  const [activeView, setActiveView] = React.useState<string>('dashboard');
  const [selectedSession, setSelectedSession] = React.useState<string>('2024/2025');
  const [selectedTerm, setSelectedTerm] = React.useState<string>('second');
  const [studentSearch, setStudentSearch] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<Student[]>([]);
  const [showPaymentForm, setShowPaymentForm] = React.useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [showExpenditureForm, setShowExpenditureForm] = React.useState<boolean>(false);
  const [showReportForm, setShowReportForm] = React.useState<boolean>(false);
  const [showManualMoneyForm, setShowManualMoneyForm] = React.useState<boolean>(false);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [expenditures, setExpenditures] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [accountantData, setAccountantData] = React.useState<AccountantData | null>(null);

  const [paymentData, setPaymentData] = React.useState({
    paymentType: 'tuition',
    amount: '',
    amountPaid: '',
    paymentMethod: 'cash',
    receiptNumber: '',
    description: ''
  });

  const [expenditureData, setExpenditureData] = React.useState({
    description: '',
    category: 'utilities',
    amount: '',
    expenditureDate: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    vendor: '',
    paymentMethod: 'cash',
    notes: ''
  });

  const [reportData, setReportData] = React.useState({
    title: '',
    description: '',
    academicYear: selectedSession,
    term: selectedTerm
  });

  const [manualMoneyData, setManualMoneyData] = React.useState({
    amount: '',
    description: '',
    source: 'donation',
    paymentMethod: 'cash',
    referenceNumber: ''
  });

  // Fetch financial stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/dashboard/accountant/stats?academicYear=${selectedSession}&term=${selectedTerm}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch accountant data
  const fetchAccountantData = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/dashboard/accountant/current', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setAccountantData(data);
    } catch (error) {
      console.error('Error fetching accountant data:', error);
    }
  };

  // Search students
  const searchStudents = async () => {
    if (studentSearch.length < 2) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/accountant/students/search?search=${studentSearch}&academicYear=${selectedSession}&term=${selectedTerm}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching students:', error);
    }
    setLoading(false);
  };

  // Confirm payment
  const confirmPayment = async () => {
    if (!selectedStudent || !paymentData.amount || !paymentData.amountPaid) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/accountant/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          academicYear: selectedSession,
          term: selectedTerm,
          ...paymentData,
          amount: parseFloat(paymentData.amount),
          amountPaid: parseFloat(paymentData.amountPaid)
        })
      });

      if (response.ok) {
        const paymentResult = await response.json();
        
        // Automatically generate receipt after payment confirmation
        try {
          const receiptResponse = await fetch('http://localhost:4000/api/accountant/payments/generate-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              paymentId: paymentResult.payment?.id,
              studentId: selectedStudent.id,
              academicYear: selectedSession,
              term: selectedTerm
            })
          });

          if (receiptResponse.ok) {
            alert('✅ Payment confirmed successfully! Receipt has been generated and is now available on the student dashboard.');
          } else {
            alert('✅ Payment confirmed successfully! (Receipt generation failed, but payment is recorded)');
          }
        } catch (receiptError) {
          console.error('Error generating receipt:', receiptError);
          alert('✅ Payment confirmed successfully! (Receipt will be generated shortly)');
        }

        setShowPaymentForm(false);
        setSelectedStudent(null);
        setPaymentData({
          paymentType: 'tuition',
          amount: '',
          amountPaid: '',
          paymentMethod: 'cash',
          receiptNumber: '',
          description: ''
        });
        fetchStats(); // Refresh stats
      } else {
        alert('Error confirming payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Error confirming payment');
    }
  };

  // Add expenditure
  const addExpenditure = async () => {
    if (!expenditureData.description || !expenditureData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/accountant/expenditures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...expenditureData,
          amount: parseFloat(expenditureData.amount),
          academicYear: selectedSession,
          term: selectedTerm
        })
      });

      if (response.ok) {
        alert('Expenditure recorded successfully!');
        setShowExpenditureForm(false);
        setExpenditureData({
          description: '',
          category: 'utilities',
          amount: '',
          expenditureDate: new Date().toISOString().split('T')[0],
          receiptNumber: '',
          vendor: '',
          paymentMethod: 'cash',
          notes: ''
        });
        fetchStats(); // Refresh stats
      } else {
        alert('Error recording expenditure');
      }
    } catch (error) {
      console.error('Error recording expenditure:', error);
      alert('Error recording expenditure');
    }
  };

  // Send financial report
  const sendReport = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/accountant/reports/financial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...reportData,
          academicYear: selectedSession,
          term: selectedTerm
        })
      });

      if (response.ok) {
        alert('Financial report sent to admin successfully!');
        setShowReportForm(false);
        setReportData({
          title: '',
          description: '',
          academicYear: selectedSession,
          term: selectedTerm
        });
      } else {
        alert('Error sending report');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      alert('Error sending report');
    }
  };

  // Add money manually
  const addMoneyManually = async () => {
    if (!manualMoneyData.amount || !manualMoneyData.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/accountant/add-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...manualMoneyData,
          amount: parseFloat(manualMoneyData.amount),
          academicYear: selectedSession,
          term: selectedTerm
        })
      });

      if (response.ok) {
        alert('💰 Money added to school account successfully!');
        setShowManualMoneyForm(false);
        setManualMoneyData({
          amount: '',
          description: '',
          source: 'donation',
          paymentMethod: 'cash',
          referenceNumber: ''
        });
        fetchStats(); // Refresh stats
      } else {
        alert('Error adding money');
      }
    } catch (error) {
      console.error('Error adding money:', error);
      alert('Error adding money');
    }
  };

  // Load stats and accountant data on component mount and when session/term changes
  React.useEffect(() => {
    fetchStats();
    fetchAccountantData();
  }, [selectedSession, selectedTerm]);

  // Search students when search term changes
  React.useEffect(() => {
    if (studentSearch.length > 2) {
      searchStudents();
    } else {
      setSearchResults([]);
    }
  }, [studentSearch, selectedSession, selectedTerm]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          💰 {accountantData && accountantData.firstName ? `Welcome, ${accountantData.firstName} ${accountantData.lastName}` : 'Accountant Dashboard'}
        </h1>
        <p className="text-gray-600">Manage school finances, payments, and expenditures</p>
        {accountantData?.office && (
          <p className="text-gray-500 text-sm mt-1">
            {accountantData.office} • {accountantData.email}
          </p>
        )}
        
        {/* Session and Term Selector */}
        <div className="mt-4 flex space-x-4">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {(() => {
              const sessions: string[] = [];
              for (let year = 2024; year <= 2149; year++) {
                sessions.push(`${year}/${year + 1}`);
              }
              return sessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ));
            })()}
          </select>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="first">First Term</option>
            <option value="second">Second Term</option>
            <option value="third">Third Term</option>
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'dashboard' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'payments' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💳 Payments
          </button>
          <button
            onClick={() => setActiveView('expenditures')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'expenditures' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💸 Expenditures
          </button>
          <button
            onClick={() => setActiveView('reports')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'reports' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📄 Reports
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {stats ? (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600">Total Income</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(stats.totalIncome || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <p className="text-sm font-medium text-red-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-900">
                        {formatCurrency(stats.totalExpenditure || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600">Net Balance</p>
                      <p className={`text-2xl font-bold ${
                        (stats.netBalance || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {formatCurrency(stats.netBalance || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-600">Confirmed Payments</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {stats.confirmedPayments || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Period Info */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">📊 Financial Summary</h3>
                <p className="text-blue-700">
                  <strong>Academic Year:</strong> {selectedSession} • 
                  <strong> Term:</strong> {selectedTerm}
                </p>
              </div>

              {/* Income Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Total Income</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border-2 border-green-200">
                    <span className="font-bold">Total Income</span>
                    <div className="text-right">
                      <span className="font-bold text-green-700 text-lg">
                        {formatCurrency(stats.totalIncome || 0)}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">Includes payments and manual additions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Payment Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Payments</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-600">{stats.totalPayments || 0}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Confirmed Payments</span>
                    <div className="text-right">
                      <span className="font-bold text-green-600">{stats.confirmedPayments || 0}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Pending Payments</span>
                    <div className="text-right">
                      <span className="font-bold text-orange-600">{stats.pendingPayments || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenditure Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💸 Expenditure Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">Total Expenditures</span>
                    <div className="text-right">
                      <span className="font-bold text-red-600">{formatCurrency(stats.totalExpenditure || 0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Number of Expenditures</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-600">{stats.totalExpenditures || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">Loading financial statistics...</div>
          )}
        </div>
      )}

      {/* Payments View */}
      {activeView === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Confirmation</h3>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Confirm Payment
              </button>
            </div>

            {/* Student Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search student by name or admission number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search Results */}
            {loading && <div className="text-center py-4">Searching...</div>}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((student) => (
                  <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">
                          {student.firstName || student.user?.firstName || 'Unknown'} {student.lastName || student.user?.lastName || 'Student'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {student.admissionNumber} • {student.class.name} • {student.house}
                        </p>
                        {student.payment && (
                          <p className="text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              student.payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                              student.payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {student.payment.status.toUpperCase()}
                            </span>
                            <span className="ml-2">
                              Amount: {formatCurrency(student.payment.amount)} | Balance: {formatCurrency(student.payment.balance)}
                            </span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowPaymentForm(true);
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Confirm Payment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expenditures View */}
      {activeView === 'expenditures' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expenditures</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowManualMoneyForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  💰 Add Money Manually
                </button>
                <button
                  onClick={() => setShowExpenditureForm(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  + Add Expenditure
                </button>
              </div>
            </div>
            <p className="text-gray-600">Track and manage school expenditures, and add money to school account manually</p>
          </div>
        </div>
      )}

      {/* Reports View */}
      {activeView === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
              <button
                onClick={() => setShowReportForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                📄 Send Report to Admin
              </button>
            </div>
            <p className="text-gray-600">Generate and send comprehensive financial reports to the admin.</p>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Confirm Payment</h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {selectedStudent && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">
                  {selectedStudent.firstName || selectedStudent.user?.firstName || 'Unknown'} {selectedStudent.lastName || selectedStudent.user?.lastName || 'Student'}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedStudent.admissionNumber} • {selectedStudent.class.name}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type
                </label>
                <select
                  value={paymentData.paymentType}
                  onChange={(e) => setPaymentData({...paymentData, paymentType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tuition">Tuition</option>
                  <option value="transport">Transport</option>
                  <option value="meal">Meal</option>
                  <option value="uniform">Uniform</option>
                  <option value="books">Books</option>
                  <option value="exam">Exam</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    value={paymentData.amountPaid}
                    onChange={(e) => setPaymentData({...paymentData, amountPaid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={paymentData.receiptNumber}
                  onChange={(e) => setPaymentData({...paymentData, receiptNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="RCP/2024/001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={paymentData.description}
                  onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Payment description..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expenditure Form Modal */}
      {showExpenditureForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Expenditure</h3>
              <button
                onClick={() => setShowExpenditureForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={expenditureData.description}
                  onChange={(e) => setExpenditureData({...expenditureData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Electricity bill, office supplies, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={expenditureData.category}
                    onChange={(e) => setExpenditureData({...expenditureData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="utilities">Utilities</option>
                    <option value="salaries">Salaries</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="supplies">Supplies</option>
                    <option value="transport">Transport</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={expenditureData.amount}
                    onChange={(e) => setExpenditureData({...expenditureData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={expenditureData.expenditureDate}
                  onChange={(e) => setExpenditureData({...expenditureData, expenditureDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  value={expenditureData.vendor}
                  onChange={(e) => setExpenditureData({...expenditureData, vendor: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={expenditureData.paymentMethod}
                  onChange={(e) => setExpenditureData({...expenditureData, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={expenditureData.notes}
                  onChange={(e) => setExpenditureData({...expenditureData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExpenditureForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addExpenditure}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Add Expenditure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Form Modal */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Send Financial Report</h3>
              <button
                onClick={() => setShowReportForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportData.title}
                  onChange={(e) => setReportData({...reportData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={`Financial Report - ${selectedSession} ${selectedTerm} Term`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData({...reportData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of the report..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Academic Year:</strong> {selectedSession}<br />
                  <strong>Term:</strong> {selectedTerm}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReportForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={sendReport}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Send Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Money Addition Form Modal */}
      {showManualMoneyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">💰 Add Money to School Account</h3>
              <button
                onClick={() => setShowManualMoneyForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  value={manualMoneyData.amount}
                  onChange={(e) => setManualMoneyData({...manualMoneyData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={manualMoneyData.description}
                  onChange={(e) => setManualMoneyData({...manualMoneyData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Donation from alumni, Grant received, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={manualMoneyData.source}
                  onChange={(e) => setManualMoneyData({...manualMoneyData, source: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="donation">Donation</option>
                  <option value="grant">Grant</option>
                  <option value="fundraising">Fundraising</option>
                  <option value="investment">Investment Return</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={manualMoneyData.paymentMethod}
                  onChange={(e) => setManualMoneyData({...manualMoneyData, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={manualMoneyData.referenceNumber}
                  onChange={(e) => setManualMoneyData({...manualMoneyData, referenceNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Transaction/Receipt reference number"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-600">
                  <strong>Academic Year:</strong> {selectedSession}<br />
                  <strong>Term:</strong> {selectedTerm}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowManualMoneyForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addMoneyManually}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                💰 Add Money
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'admin':
    case 'director':
    case 'principal':
      return <AdminDashboard />;
    
    case 'student':
      return <StudentDashboard />;
    
    case 'accountant':
      return <AccountantDashboard />;
    
    case 'exam_officer':
      return <ExamOfficerDashboard />;
    
    case 'parent':
      return <ParentDashboard />;
    
    case 'teacher':
      return <TeacherDashboard user={user} />;
    
    default:
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard Not Available
          </h2>
          <p className="text-gray-600">
            Your role ({user.role}) does not have a dashboard configured yet.
          </p>
        </div>
      );
  }
};

export default Dashboard;