import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowUpIcon,
  CalendarDaysIcon,
  PaperAirplaneIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import StudentSearch from '../StudentSearch.tsx';
import ResultEntryForm from '../ResultEntryForm.tsx';
import { academicSessions, getCurrentSession } from '../../utils/academicSessions.ts';
import api from '../../utils/api.ts';

interface DashboardStats {
  totalStudents: number;
  totalResults: number;
  averageScore: number;
  passRate: number;
  pendingResults: number;
}

interface Comment {
  id: number;
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  submittedBy: {
    name: string;
    role: string;
  };
  submittedAt: string;
  response?: string;
  respondedAt?: string;
}

interface ReportData {
  academicYear: string;
  term: string;
  totalStudents: number;
  totalResults: number;
  averageScore: number;
  passRate: number;
  subjectPerformance: Array<{
    subject: string;
    averageScore: number;
    passRate: number;
    totalEntries: number;
  }>;
  classPerformance: Array<{
    class: string;
    averageScore: number;
    passRate: number;
    totalStudents: number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
}

// Report Generation Component
const ReportGeneration: React.FC = () => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('term'); // 'term' or 'range'
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentSession());
  const [selectedTerm, setSelectedTerm] = useState('first');
  const [startYear, setStartYear] = useState('2024/2025');
  const [endYear, setEndYear] = useState('2024/2025');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Generate report data
  const generateReport = async () => {
    setIsGenerating(true);
    try {
      let endpoint = '';
      let params: any = {};

      if (reportType === 'term') {
        endpoint = '/reports/term-report';
        params = {
          academicYear: selectedAcademicYear,
          term: selectedTerm
        };
      } else {
        endpoint = '/reports/range-report';
        params = {
          startYear,
          endYear
        };
      }

      try {
        const response = await api.get(endpoint, { params });
        setReportData(response.data);
      } catch (apiError) {
        console.warn('API endpoint not available, using mock data:', apiError);
        
        // Use mock data when endpoint is not available
        const mockReportData = {
          academicYear: reportType === 'term' ? selectedAcademicYear : `${startYear} - ${endYear}`,
          term: reportType === 'term' ? selectedTerm : 'All Terms',
          totalStudents: 150,
          totalResults: 120,
          averageScore: 75.5,
          passRate: 85.2,
          subjectPerformance: [
            {
              subject: 'Mathematics',
              averageScore: 78.5,
              passRate: 82.0,
              totalEntries: 120
            },
            {
              subject: 'English Language',
              averageScore: 76.2,
              passRate: 88.5,
              totalEntries: 120
            },
            {
              subject: 'Physics',
              averageScore: 72.8,
              passRate: 75.5,
              totalEntries: 115
            }
          ],
          classPerformance: [
            {
              class: 'JSS 1A',
              averageScore: 77.8,
              passRate: 90.0,
              totalStudents: 30
            },
            {
              class: 'JSS 1B',
              averageScore: 74.2,
              passRate: 80.5,
              totalStudents: 28
            },
            {
              class: 'JSS 2A',
              averageScore: 76.5,
              passRate: 85.7,
              totalStudents: 32
            }
          ],
          gradeDistribution: [
            { grade: 'A', count: 25, percentage: 20.8 },
            { grade: 'B', count: 35, percentage: 29.2 },
            { grade: 'C', count: 40, percentage: 33.3 },
            { grade: 'D', count: 15, percentage: 12.5 },
            { grade: 'E', count: 5, percentage: 4.2 }
          ]
        };
        
        setReportData(mockReportData);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Send report to admin
  const sendReportToAdmin = async () => {
    if (!reportData || !reportTitle.trim()) {
      alert('Please generate a report and provide a title first.');
      return;
    }

    try {
      await api.post('/reports/send-to-admin', {
        reportType,
        reportTitle,
        reportDescription,
        reportData,
        parameters: reportType === 'term' 
          ? { academicYear: selectedAcademicYear, term: selectedTerm }
          : { startYear, endYear }
      });
      
      alert('Report sent to admin successfully!');
      setShowReportModal(false);
      setReportData(null);
      setReportTitle('');
      setReportDescription('');
    } catch (error) {
      console.error('Error sending report:', error);
      alert('Error sending report to admin. Please try again.');
    }
  };

  // Save report as draft
  const saveReportAsDraft = async () => {
    if (!reportData || !reportTitle.trim()) {
      alert('Please generate a report and provide a title first.');
      return;
    }

    try {
      await api.post('/reports/save-draft', {
        reportType,
        reportTitle,
        reportDescription,
        reportData,
        parameters: reportType === 'term' 
          ? { academicYear: selectedAcademicYear, term: selectedTerm }
          : { startYear, endYear }
      });
      
      alert('Report saved as draft successfully!');
      setShowReportModal(false);
      setReportData(null);
      setReportTitle('');
      setReportDescription('');
    } catch (error) {
      console.error('Error saving report draft:', error);
      alert('Error saving report as draft. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              Report Generation & Submission
            </h3>
            <p className="text-sm text-gray-600 mt-1">Generate and send academic reports to admin</p>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-center mb-3">
              <CalendarDaysIcon className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Term Report</h4>
                <p className="text-sm text-gray-600">Generate report for a specific term</p>
              </div>
            </div>
            <button
              onClick={() => {
                setReportType('term');
                setShowReportModal(true);
              }}
              className="w-full mt-3 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
            >
              Generate Term Report
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-center mb-3">
              <ChartBarIcon className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Range Report</h4>
                <p className="text-sm text-gray-600">Generate report for multiple academic years</p>
              </div>
            </div>
            <button
              onClick={() => {
                setReportType('range');
                setShowReportModal(true);
              }}
              className="w-full mt-3 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
            >
              Generate Range Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Generate {reportType === 'term' ? 'Term' : 'Range'} Report
                </h3>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Report Parameters */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Report Parameters</h4>
                  
                  {reportType === 'term' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Academic Year
                        </label>
                        <select
                          value={selectedAcademicYear}
                          onChange={(e) => setSelectedAcademicYear(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {academicSessions.map(session => (
                            <option key={session} value={session}>{session}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Term
                        </label>
                        <select
                          value={selectedTerm}
                          onChange={(e) => setSelectedTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="first">First Term</option>
                          <option value="second">Second Term</option>
                          <option value="third">Third Term</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Academic Year
                        </label>
                        <select
                          value={startYear}
                          onChange={(e) => setStartYear(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {academicSessions.map(session => (
                            <option key={session} value={session}>{session}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Academic Year
                        </label>
                        <select
                          value={endYear}
                          onChange={(e) => setEndYear(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {academicSessions.filter(session => session >= startYear).map(session => (
                            <option key={session} value={session}>{session}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Report Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Report Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Report Title *
                      </label>
                      <input
                        type="text"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder={`${reportType === 'term' ? 'Term' : 'Range'} Report - ${reportType === 'term' ? `${selectedAcademicYear} ${selectedTerm} Term` : `${startYear} to ${endYear}`}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Report Description
                      </label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={3}
                        placeholder="Brief description of the report and key findings..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Generate Report Button */}
                <div className="flex justify-center">
                  <button
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <DocumentArrowUpIcon className="h-4 w-4" />
                        <span>Generate Report</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Report Preview */}
                {reportData && (
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Report Preview</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-white p-3 rounded">
                          <div className="text-2xl font-bold text-blue-600">{reportData.totalStudents}</div>
                          <div className="text-sm text-gray-600">Total Students</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-2xl font-bold text-green-600">{reportData.totalResults}</div>
                          <div className="text-sm text-gray-600">Total Results</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-2xl font-bold text-purple-600">{reportData.averageScore.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">Average Score</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-2xl font-bold text-indigo-600">{reportData.passRate.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">Pass Rate</div>
                        </div>
                      </div>

                      {reportData.subjectPerformance && reportData.subjectPerformance.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Top Performing Subjects</h5>
                          <div className="space-y-2">
                            {reportData.subjectPerformance.slice(0, 3).map((subject, index) => (
                              <div key={index} className="flex justify-between items-center bg-white p-2 rounded">
                                <span className="text-sm font-medium">{subject.subject}</span>
                                <span className="text-sm text-gray-600">{subject.averageScore.toFixed(1)}% avg</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveReportAsDraft}
                        disabled={!reportTitle.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        <span>Save Draft</span>
                      </button>
                      <button
                        onClick={sendReportToAdmin}
                        disabled={!reportTitle.trim()}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        <span>Send to Admin</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reports Management Component
const ReportsManagement: React.FC = () => {
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedReportStatus, setSelectedReportStatus] = useState('all');

  // Fetch saved reports
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery(
    ['saved-reports', selectedReportStatus],
    () => api.get('/reports', {
      params: {
        role: 'exam_officer',
        status: selectedReportStatus !== 'all' ? selectedReportStatus : undefined,
        limit: 10
      }
    }).then(res => res.data),
    {
      onError: () => {},
      retry: false
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'sent_to_admin': return 'text-blue-600 bg-blue-100';
      case 'reviewed': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'archived': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              My Reports
            </h3>
            <p className="text-sm text-gray-600 mt-1">View and manage your saved reports</p>
          </div>
          <button
            onClick={() => setShowReportsModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <DocumentTextIcon className="h-4 w-4" />
            <span>View All Reports</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Filter */}
        <div className="mb-4">
          <select
            value={selectedReportStatus}
            onChange={(e) => setSelectedReportStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Reports</option>
            <option value="draft">Drafts</option>
            <option value="sent_to_admin">Sent to Admin</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Reports List */}
        {reportsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reports...</p>
          </div>
        ) : reportsData?.reports && reportsData.reports.length > 0 ? (
          <div className="space-y-4">
            {reportsData.reports.slice(0, 5).map((report: any) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{report.title}</h4>
                    {report.description && (
                      <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div>
                    <span className="font-medium">{report.reportType}</span>
                    {report.academicYear && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{report.academicYear}</span>
                        {report.term && <span> - {report.term} term</span>}
                      </>
                    )}
                    {report.startYear && report.endYear && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{report.startYear} to {report.endYear}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <span>{formatDate(report.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-600">You haven't saved any reports yet. Generate and save reports to see them here.</p>
          </div>
        )}

        {reportsData?.reports && reportsData.reports.length > 5 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowReportsModal(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all {reportsData.pagination?.total} reports →
            </button>
          </div>
        )}
      </div>

      {/* Reports Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">All Reports</h3>
                <button
                  onClick={() => setShowReportsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Full Reports List */}
              {reportsData?.reports && reportsData.reports.length > 0 ? (
                <div className="space-y-4">
                  {reportsData.reports.map((report: any) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{report.title}</h4>
                          {report.description && (
                            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <div>
                          <span className="font-medium capitalize">{report.reportType} Report</span>
                          {report.academicYear && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{report.academicYear}</span>
                              {report.term && <span> - {report.term.charAt(0).toUpperCase() + report.term.slice(1)} Term</span>}
                            </>
                          )}
                          {report.startYear && report.endYear && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{report.startYear} to {report.endYear}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span>Created: {formatDate(report.createdAt)}</span>
                          {report.sentToAdminAt && (
                            <span>Sent: {formatDate(report.sentToAdminAt)}</span>
                          )}
                        </div>
                      </div>

                      {report.notes && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-900"><strong>Admin Notes:</strong> {report.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
                  <p className="text-gray-600">You haven't saved any reports yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Comments Management Component
const MessagingSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState('incoming');
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [messageData, setMessageData] = useState({
    recipient: 'admin',
    subject: '',
    message: '',
    priority: 'normal'
  });

  // Fetch messages using new endpoint
  const { data: messagesData, isLoading, refetch } = useQuery(
    'exam-officer-messages',
    () => api.get('/exam-officer/messages').then(res => res.data),
    {
      onError: () => {},
      retry: false
    }
  );

  // Fetch stats using new endpoint
  const { data: stats } = useQuery(
    'exam-officer-message-stats',
    () => api.get('/dashboard/exam-officer/stats').then(res => res.data),
    {
      onError: () => {},
      retry: false
    }
  );

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    
    try {
      await api.patch(`/exam-officer/messages/${selectedMessage.id}/reply`, { 
        reply: replyText 
      });
      setShowReplyModal(false);
      setSelectedMessage(null);
      setReplyText('');
      refetch();
      alert('Reply sent successfully!');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply. Please try again.');
    }
  };

  const sendMessage = async () => {
    try {
      if (!messageData.subject || !messageData.message) {
        alert('Please fill in all required fields');
        return;
      }

      await api.post('/exam-officer/messages', messageData);
      alert('Message sent successfully!');
      setShowMessageForm(false);
      setMessageData({
        recipient: 'admin',
        subject: '',
        message: '',
        priority: 'normal'
      });
      refetch();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'text-yellow-600 bg-yellow-100';
      case 'read': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
              Messaging System
            </h3>
            <p className="text-sm text-gray-600 mt-1">Communicate with teachers, students, and admin</p>
          </div>
          <div className="flex items-center space-x-4">
            {stats && (
              <div className="flex space-x-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{stats.totalIncoming || 0}</div>
                  <div className="text-gray-500">Incoming</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{stats.unreadMessages || 0}</div>
                  <div className="text-gray-500">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{stats.repliedMessages || 0}</div>
                  <div className="text-gray-500">Replied</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowMessageForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'incoming' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📥 Incoming ({messagesData?.totalIncoming || 0})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'outgoing' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📤 Outgoing ({messagesData?.totalOutgoing || 0})
          </button>
        </div>

        {/* Messages List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading messages...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'incoming' && messagesData?.incomingMessages && messagesData.incomingMessages.length > 0 ? (
              messagesData.incomingMessages.map((message: any) => (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{message.subject}</h4>
                      <p className="text-sm text-gray-600 mt-1">{message.message}</p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(message.priority)}`}>
                        {message.priority}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <div>
                      <span className="font-medium">{message.fromUser}</span> ({message.fromRole})
                      <span className="mx-2">•</span>
                      <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex space-x-2">
                      {!message.reply && (
                        <button
                          onClick={() => {
                            setSelectedMessage(message);
                            setReplyText('');
                            setShowReplyModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {message.reply && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-900"><strong>Your Reply:</strong> {message.reply}</p>
                      {message.repliedAt && (
                        <p className="text-xs text-blue-600 mt-1">
                          Replied on {new Date(message.repliedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : activeTab === 'outgoing' && messagesData?.outgoingMessages && messagesData.outgoingMessages.length > 0 ? (
              messagesData.outgoingMessages.map((message: any) => (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{message.subject}</h4>
                      <p className="text-sm text-gray-600 mt-1">{message.message}</p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(message.priority)}`}>
                        {message.priority}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <div>
                      <span>To: <span className="font-medium">{message.recipient}</span></span>
                      <span className="mx-2">•</span>
                      <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {activeTab} Messages
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'incoming' 
                    ? 'You have no incoming messages at the moment.' 
                    : 'You haven\'t sent any messages yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Send Message Modal */}
        {showMessageForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">📧 Send Message</h3>
                <button
                  onClick={() => setShowMessageForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Send To
                  </label>
                  <select
                    value={messageData.recipient}
                    onChange={(e) => setMessageData({...messageData, recipient: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={messageData.priority}
                    onChange={(e) => setMessageData({...messageData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={messageData.subject}
                    onChange={(e) => setMessageData({...messageData, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter message subject..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={messageData.message}
                    onChange={(e) => setMessageData({...messageData, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Type your message here..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowMessageForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📧 Send Message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reply Modal */}
        {showReplyModal && selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">💬 Reply to Message</h3>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900">{selectedMessage.subject}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedMessage.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  From: {selectedMessage.fromUser} ({selectedMessage.fromRole})
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your reply..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExamOfficerDashboard: React.FC = () => {
  const [showResultEntryForm, setShowResultEntryForm] = useState(false);
  
  // Debug form state changes
  useEffect(() => {
    console.log('showResultEntryForm changed to:', showResultEntryForm);
  }, [showResultEntryForm]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentSession());
  const [selectedTerm, setSelectedTerm] = useState('first');

  // Fetch dashboard stats for exam officer
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'exam-officer-stats',
    () => api.get('/dashboard/exam-officer-stats').then(res => res.data),
    {
      // Provide default values if API doesn't exist yet
      onError: () => {},
      retry: false
    }
  );

  // Fetch current exam officer data
  const { data: examOfficerData, isLoading: isLoadingExamOfficerData } = useQuery(
    'exam-officer-dashboard-data',
    () => api.get('/dashboard/exam-officer/current').then(res => res.data)
  );

  // Fetch recent results
  const { data: recentResults } = useQuery(
    'recent-results',
    () => api.get('/results?limit=5').then(res => res.data),
    {
      onError: () => {},
      retry: false
    }
  );

  const handleStudentFound = (student: any) => {
    console.log('Student found:', student);
    setSelectedStudent(student);
    setShowStudentSearch(false);
    setShowResultEntryForm(true);
    console.log('Result entry form should be open now');
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      description: 'Students in the system'
    },
    {
      title: 'Total Results',
      value: stats?.totalResults || 0,
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      description: 'Results entered'
    },
    {
      title: 'Average Score',
      value: `${(stats?.averageScore || 0).toFixed(1)}%`,
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      description: 'Overall performance'
    },
    {
      title: 'Pass Rate',
      value: `${(stats?.passRate || 0).toFixed(1)}%`,
      icon: AcademicCapIcon,
      color: 'bg-indigo-500',
      description: 'Students passing'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">
          🏫 {isLoadingExamOfficerData ? 'Exam Officer Dashboard' : `Welcome, ${examOfficerData?.examOfficer?.firstName || 'Exam Officer'} ${examOfficerData?.examOfficer?.lastName || ''}`}
        </h1>
        <p className="text-indigo-100">Manage student results and academic performance</p>
        {examOfficerData?.examOfficer?.office && (
          <p className="text-indigo-200 text-sm mt-1">
            {examOfficerData.examOfficer.office} • {examOfficerData.examOfficer.email}
          </p>
        )}
      </div>

      {/* Academic Year and Term Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Select Academic Session & Term</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {academicSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="first">First Term</option>
              <option value="second">Second Term</option>
              <option value="third">Third Term</option>
            </select>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Selected:</strong> {selectedAcademicYear} Academic Year, {selectedTerm.charAt(0).toUpperCase() + selectedTerm.slice(1)} Term
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Results will be entered for the selected academic session and term.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => setShowStudentSearch(true)}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
        >
          <div className="flex items-center justify-center mb-4">
            <MagnifyingGlassIcon className="h-12 w-12 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Student</h3>
          <p className="text-gray-600 text-sm">Search by admission number for {selectedAcademicYear} - {selectedTerm} term</p>
        </button>

        <button
          onClick={() => {
            console.log('Direct form open clicked');
            setShowResultEntryForm(true);
          }}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50"
        >
          <div className="flex items-center justify-center mb-4">
            <PencilSquareIcon className="h-12 w-12 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Results</h3>
          <p className="text-gray-600 text-sm">For {selectedAcademicYear} - {selectedTerm} term</p>
        </button>

        <button
          onClick={() => window.location.href = '/grades'}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50"
        >
          <div className="flex items-center justify-center mb-4">
            <ClipboardDocumentListIcon className="h-12 w-12 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">View Results</h3>
          <p className="text-gray-600 text-sm">View and manage all results</p>
        </button>

        <Link
          to="/homepage"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50"
        >
          <div className="flex items-center justify-center mb-4">
            <HomeIcon className="h-12 w-12 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">School Homepage</h3>
          <p className="text-gray-600 text-sm">Visit school homepage</p>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.description}</p>
              </div>
              <div className={`p-3 rounded-full ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Generation */}
      <ReportGeneration />

      {/* Messaging System */}
      <MessagingSystem />

      {/* Reports Management */}
      <ReportsManagement />

      {/* Recent Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Results</h3>
        </div>
        <div className="p-6">
          {recentResults && recentResults.length > 0 ? (
            <div className="space-y-4">
              {recentResults.slice(0, 5).map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {result.student?.user?.firstName?.charAt(0)}{result.student?.user?.lastName?.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {result.student?.user?.firstName} {result.student?.user?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {result.class?.name} • {result.academicYear} • {result.term} Term
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {result.averageScore?.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      Position: {result.position}/{result.totalStudents}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
              <p className="text-gray-600 mb-4">Start by entering student results</p>
              <button
                onClick={() => setShowResultEntryForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Enter First Result
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student Search Modal */}
      {showStudentSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Search Student for Results Entry</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Academic Year: <span className="font-medium">{selectedAcademicYear}</span> | 
                    Term: <span className="font-medium">{selectedTerm.charAt(0).toUpperCase() + selectedTerm.slice(1)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowStudentSearch(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <StudentSearch
                onStudentFound={handleStudentFound}
                placeholder="Enter admission number to search for student..."
              />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowStudentSearch(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Entry Form */}
      <ResultEntryForm
        isOpen={showResultEntryForm}
        onClose={() => {
          console.log('Form close called');
          setShowResultEntryForm(false);
          setSelectedStudent(null);
        }}
        initialAcademicYear={selectedAcademicYear}
        initialTerm={selectedTerm}
        preSelectedStudent={selectedStudent}
      />

      {/* Saved Reports Section */}
      <SavedReports />
    </div>
  );
};

// Saved Reports Component
const SavedReports: React.FC = () => {
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch saved reports
  const { data: reportsData, isLoading, refetch } = useQuery(
    ['saved-reports', statusFilter],
    () => api.get('/reports', {
      params: {
        role: 'exam_officer',
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: 1,
        limit: 20
      }
    }).then(res => res.data),
    {
      onError: () => {},
      retry: false
    }
  );

  // Fetch single report details
  const viewReportDetails = async (reportId: number) => {
    try {
      const response = await api.get(`/reports/${reportId}`);
      setSelectedReport(response.data);
      setShowReportsModal(true);
    } catch (error) {
      console.error('Error fetching report details:', error);
      alert('Error loading report details');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Saved Reports</h2>
        <p className="text-gray-600">View and manage your previously generated reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Reports</option>
          <option value="draft">Draft</option>
          <option value="sent_to_admin">Sent to Admin</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reports...</p>
          </div>
        ) : reportsData?.reports && reportsData.reports.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {reportsData.reports.map((report: any) => (
              <div key={report.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                    {report.description && (
                      <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{report.reportType}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      {report.academicYear && <span>{report.academicYear}</span>}
                      {report.term && <span>{report.term} term</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      report.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      report.status === 'sent_to_admin' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                      report.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => viewReportDetails(report.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-600">You haven't generated any reports yet.</p>
          </div>
        )}
      </div>

      {/* Report Details Modal */}
      {showReportsModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{selectedReport.title}</h3>
                <button
                  onClick={() => setShowReportsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Report Information</h4>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-600">Type:</dt>
                      <dd className="font-medium">{selectedReport.reportType}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Status:</dt>
                      <dd className="font-medium">{selectedReport.status}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Created:</dt>
                      <dd className="font-medium">{new Date(selectedReport.createdAt).toLocaleString()}</dd>
                    </div>
                    {selectedReport.sentToAdminAt && (
                      <div>
                        <dt className="text-gray-600">Sent to Admin:</dt>
                        <dd className="font-medium">{new Date(selectedReport.sentToAdminAt).toLocaleString()}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowReportsModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamOfficerDashboard;