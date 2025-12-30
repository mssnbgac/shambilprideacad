import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, CurrencyDollarIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline';
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

interface PaymentData {
  studentId: number;
  academicYear: string;
  term: string;
  paymentType: string;
  amount: number;
  amountPaid: number;
  paymentMethod: string;
  receiptNumber: string;
  description: string;
}

interface FinancialSummary {
  academicYear: string;
  term: string;
  totalIncome: number;
  totalConfirmedPayments: number;
  confirmedPaymentsCount: number;
  totalPayments: number;
  totalExpenditure: number;
  totalExpenses: number;
  remainingBalance: number;
  netPosition: string;
}

const AccountantDashboard: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024/2025');
  const [selectedTerm, setSelectedTerm] = useState('second');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    studentId: 0,
    academicYear: '2024/2025',
    term: 'second',
    paymentType: 'tuition',
    amount: 0,
    amountPaid: 0,
    paymentMethod: 'cash',
    receiptNumber: '',
    description: ''
  });

  // Fetch financial summary when component mounts or when term/year changes
  useEffect(() => {
    fetchFinancialSummary();
    // Update paymentData to match selected academic year and term
    setPaymentData(prev => ({
      ...prev,
      academicYear: selectedAcademicYear,
      term: selectedTerm
    }));
  }, [selectedAcademicYear, selectedTerm]);

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching financial summary:', { 
        academicYear: selectedAcademicYear, 
        term: selectedTerm 
      });
      
      const response = await api.get('/accountant/financial-summary', {
        params: {
          academicYear: selectedAcademicYear,
          term: selectedTerm
        }
      });
      
      console.log('✅ Financial summary response:', response.data);
      setFinancialSummary(response.data);
    } catch (error: any) {
      console.error('❌ Error fetching financial summary:', error);
      console.error('   Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Set empty summary if no data found
      setFinancialSummary({
        academicYear: selectedAcademicYear,
        term: selectedTerm,
        totalIncome: 0,
        totalConfirmedPayments: 0,
        confirmedPaymentsCount: 0,
        totalPayments: 0,
        totalExpenditure: 0,
        totalExpenses: 0,
        remainingBalance: 0,
        netPosition: 'neutral'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      if (!paymentData.studentId || !paymentData.amount || !paymentData.amountPaid) {
        alert('Please fill in all required fields');
        return;
      }

      // Generate receipt number if not provided
      if (!paymentData.receiptNumber) {
        paymentData.receiptNumber = `RCP/${paymentData.academicYear.replace('/', '')}/${paymentData.term.toUpperCase()}/${Date.now()}`;
      }

      const response = await api.post('/accountant/payments/confirm', paymentData);
      
      // Show the financial summary from the response
      setFinancialSummary(response.data.financialSummary);
      setShowSummary(true);
      setShowPaymentForm(false);
      
      // Refresh the main dashboard financial summary
      await fetchFinancialSummary();
      
      // Reset form
      setPaymentData({
        studentId: 0,
        academicYear: selectedAcademicYear,
        term: selectedTerm,
        paymentType: 'tuition',
        amount: 0,
        amountPaid: 0,
        paymentMethod: 'cash',
        receiptNumber: '',
        description: ''
      });

      alert('Payment confirmed successfully!');
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      alert('Error confirming payment: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Accountant Dashboard</h1>
      <p className="text-gray-600">Manage school finances, payments, and expenditures</p>
      
      {/* Term and Session Selector */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Financial Summary</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="first">First Term</option>
              <option value="second">Second Term</option>
              <option value="third">Third Term</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchFinancialSummary}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Academic Year: <span className="font-semibold">{selectedAcademicYear}</span> • 
          Term: <span className="font-semibold">{selectedTerm.charAt(0).toUpperCase() + selectedTerm.slice(1)}</span>
        </p>
      </div>
      
      {/* Dynamic Financial Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center">
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Total Income</p>
              <p className="text-2xl font-bold text-green-900">
                ₦{loading ? '...' : (financialSummary?.totalIncome || 0).toLocaleString()}
              </p>
              <p className="text-xs text-green-600">Includes payments and manual additions</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <div className="flex items-center">
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">
                ₦{loading ? '...' : (financialSummary?.totalExpenditure || 0).toLocaleString()}
              </p>
              <p className="text-xs text-red-600">{financialSummary?.totalExpenses || 0} expenses recorded</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-6 border ${
          !financialSummary || financialSummary.remainingBalance >= 0 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center">
            <div className="ml-4">
              <p className={`text-sm font-medium ${
                !financialSummary || financialSummary.remainingBalance >= 0 
                  ? 'text-blue-600' 
                  : 'text-orange-600'
              }`}>Net Balance</p>
              <p className={`text-2xl font-bold ${
                !financialSummary || financialSummary.remainingBalance >= 0 
                  ? 'text-blue-900' 
                  : 'text-orange-900'
              }`}>
                ₦{loading ? '...' : Math.abs(financialSummary?.remainingBalance || 0).toLocaleString()}
              </p>
              <p className={`text-xs ${
                !financialSummary || financialSummary.remainingBalance >= 0 
                  ? 'text-blue-600' 
                  : 'text-orange-600'
              }`}>
                {financialSummary?.netPosition?.toUpperCase() || 'NEUTRAL'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center">
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Confirmed Payments</p>
              <p className="text-2xl font-bold text-purple-900">
                {loading ? '...' : (financialSummary?.confirmedPaymentsCount || 0)}
              </p>
              <p className="text-xs text-purple-600">
                ₦{(financialSummary?.totalConfirmedPayments || 0).toLocaleString()} confirmed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Modal */}
      {showSummary && financialSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-xl">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                💼 Financial Summary
              </h3>
              <p className="text-sm opacity-90 mt-1">
                {financialSummary.academicYear} Academic Year - {financialSummary.term.charAt(0).toUpperCase() + financialSummary.term.slice(1)} Term
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-600">Total Confirmed Payments</p>
                    <p className="text-2xl font-bold text-green-900">₦{financialSummary.totalConfirmedPayments.toLocaleString()}</p>
                    <p className="text-xs text-green-600">{financialSummary.confirmedPaymentsCount} payments confirmed</p>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-600">Total Expenditure</p>
                    <p className="text-2xl font-bold text-red-900">₦{financialSummary.totalExpenditure.toLocaleString()}</p>
                    <p className="text-xs text-red-600">{financialSummary.totalExpenses} expenses recorded</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${financialSummary.remainingBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${financialSummary.remainingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Remaining Balance</p>
                    <p className={`text-2xl font-bold ${financialSummary.remainingBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>₦{Math.abs(financialSummary.remainingBalance).toLocaleString()}</p>
                    <p className={`text-xs ${financialSummary.remainingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {financialSummary.netPosition.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-center">
                    <p className="text-sm font-medium text-purple-600">Payment Rate</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {financialSummary.totalPayments > 0 ? Math.round((financialSummary.confirmedPaymentsCount / financialSummary.totalPayments) * 100) : 0}%
                    </p>
                    <p className="text-xs text-purple-600">{financialSummary.confirmedPaymentsCount} of {financialSummary.totalPayments} payments</p>
                  </div>
                </div>
              </div>

              {/* Financial Health Indicator */}
              <div className={`p-4 rounded-lg ${financialSummary.remainingBalance >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${financialSummary.remainingBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {financialSummary.remainingBalance >= 0 ? '✅' : '⚠️'}
                  </span>
                  <div>
                    <h4 className={`font-semibold ${financialSummary.remainingBalance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      Financial Status: {financialSummary.netPosition.toUpperCase()}
                    </h4>
                    <p className={`text-sm ${financialSummary.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financialSummary.remainingBalance >= 0 
                        ? 'The school has a healthy financial position with surplus funds.'
                        : 'The school is operating at a deficit. Consider reviewing expenditures.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowSummary(false)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Form */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-xl">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                💳 Confirm Payment
              </h3>
              <p className="text-sm opacity-90 mt-1">
                Record and confirm student payment
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <input
                    type="number"
                    value={paymentData.studentId || ''}
                    onChange={(e) => setPaymentData({...paymentData, studentId: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter student ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <select
                    value={paymentData.academicYear}
                    onChange={(e) => setPaymentData({...paymentData, academicYear: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2023/2024">2023/2024</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                  <select
                    value={paymentData.term}
                    onChange={(e) => setPaymentData({...paymentData, term: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="first">First Term</option>
                    <option value="second">Second Term</option>
                    <option value="third">Third Term</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select
                    value={paymentData.paymentType}
                    onChange={(e) => setPaymentData({...paymentData, paymentType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₦)</label>
                  <input
                    type="number"
                    value={paymentData.amount || ''}
                    onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₦)</label>
                  <input
                    type="number"
                    value={paymentData.amountPaid || ''}
                    onChange={(e) => setPaymentData({...paymentData, amountPaid: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                  <input
                    type="text"
                    value={paymentData.receiptNumber}
                    onChange={(e) => setPaymentData({...paymentData, receiptNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={paymentData.description}
                  onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Payment description..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
        <p className="text-gray-600">
          The accountant dashboard provides comprehensive financial management tools including:
        </p>
        <ul className="mt-4 space-y-2 text-gray-600">
          <li>• Payment confirmation for students</li>
          <li>• Expenditure tracking and management</li>
          <li>• Financial report generation</li>
          <li>• Real-time balance calculations</li>
          <li>• Student search for payment processing</li>
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => {
              setPaymentData({
                ...paymentData,
                academicYear: selectedAcademicYear,
                term: selectedTerm
              });
              setShowPaymentForm(true);
            }}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <CurrencyDollarIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <span className="text-sm font-medium">Confirm Payment</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors">
            <ChartBarIcon className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <span className="text-sm font-medium">Add Expenditure</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <span className="text-sm font-medium">Generate Report</span>
          </button>
          <Link 
            to="/homepage"
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <HomeIcon className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <span className="text-sm font-medium">School Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;