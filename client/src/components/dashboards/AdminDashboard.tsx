import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  BuildingLibraryIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  XMarkIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
// import ResultEntryForm from '../ResultEntryForm';

// Configure axios instances
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Add token interceptor to api instance
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const dashboardApi = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Reports Management View Component
const ReportsManagementView: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Fetch reports
  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    ['admin-reports', selectedStatus, selectedType],
    () => api.get('/reports', {
      params: {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        reportType: selectedType !== 'all' ? selectedType : undefined,
        limit: 20
      }
    }).then(res => res.data),
    {
      onError: () => {},
      retry: false
    }
  );

  // Update report status
  const updateReportStatus = async (reportId: number, status: string, notes?: string) => {
    try {
      await api.patch(`/reports/${reportId}/status`, { status, notes });
      alert('Report status updated successfully!');
      // Refetch reports to update the list
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Error updating report status. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Reports Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reports Management</h2>
        <p className="text-gray-600">View and manage academic reports submitted by exam officers</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="sent_to_admin">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="term">Term Reports</option>
            <option value="range">Range Reports</option>
            <option value="academic">Academic Reports</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        {reportsLoading ? (
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
                      <span className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        {report.reportType}
                      </span>
                      <span>{report.generatedByName}</span>
                      <span>{new Date(report.sentToAdminAt || report.createdAt).toLocaleDateString()}</span>
                      {report.academicYear && <span>{report.academicYear}</span>}
                      {report.term && <span>{report.term} term</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      report.status === 'sent_to_admin' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                      report.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowReportModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      View Details
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
            <p className="text-gray-600">No reports match the selected filters.</p>
          </div>
        )}
      </div>

      {/* Report Details Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{selectedReport.title}</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
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
                      <dt className="text-gray-600">Generated By:</dt>
                      <dd className="font-medium">{selectedReport.generatedByName}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Date:</dt>
                      <dd className="font-medium">{new Date(selectedReport.sentToAdminAt || selectedReport.createdAt).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {selectedReport.status === 'sent_to_admin' && (
                    <button
                      onClick={() => updateReportStatus(selectedReport.id, 'reviewed', 'Report reviewed by admin')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Mark as Reviewed
                    </button>
                  )}
                  {(selectedReport.status === 'sent_to_admin' || selectedReport.status === 'reviewed') && (
                    <button
                      onClick={() => updateReportStatus(selectedReport.id, 'approved', 'Report approved for implementation')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalRevenue: number;
  pendingFees: number;
  pendingReports: number;
  openComplaints: number;
  recentPayments: any[];
}

interface ClassDistribution {
  _id: string;
  count: number;
  className: string;
}

interface FinancialSummary {
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  confirmedPayments: number;
  pendingPayments: number;
  totalExpenditure: number;
  netBalance: number;
}

interface AcademicSummary {
  totalResults: number;
  averageScore: number;
  passRate: number;
  excellenceRate: number;
}

interface Comment {
  id: number;
  from: string;
  fromRole: string;
  to: string;
  toRole: string;
  subject: string;
  message: string;
  priority?: string;
  studentAdmission?: string;
  academicSession?: string;
  term?: string;
  timestamp: string;
  status: 'read' | 'unread';
  reply?: string;
  repliedAt?: string;
  repliedBy?: string;
}

const AdminDashboard: React.FC = () => {
  const [showComments, setShowComments] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'students' | 'teachers' | 'classes' | 'results' | 'reports' | 'users'>('dashboard');
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  // const [showResultEntryForm, setShowResultEntryForm] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    classId: '',
    house: '',
    admissionNumber: '',
    dateOfBirth: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    bloodGroup: '',
    medicalConditions: ''
  });
  
  // Staff management state
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffFormData, setStaffFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'teacher',
    office: '',
    employeeId: '',
    dateOfBirth: '',
    address: '',
    qualification: '',
    experience: 0,
    subjects: '',
    salary: 0
  });

  // Class management state
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [classFormData, setClassFormData] = useState({
    name: '',
    level: '',
    capacity: 30,
    classTeacher: ''
  });

  // User management state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    office: '',
    // Student specific
    admissionNumber: '',
    classId: '',
    house: '',
    dateOfBirth: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    // Staff specific
    employeeId: '',
    qualification: '',
    experience: 0,
    subjects: '',
    salary: 0,
    assignedOffice: ''
  });
  const [userFilters, setUserFilters] = useState({
    role: 'all',
    status: 'all',
    search: ''
  });
  
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'admin-dashboard-stats',
    () => dashboardApi.get('/dashboard/stats').then(res => res.data)
  );

  const { data: classDistribution } = useQuery<ClassDistribution[]>(
    'students-by-class',
    () => dashboardApi.get('/dashboard/students-by-class').then(res => res.data)
  );

  const { data: financialSummary } = useQuery<FinancialSummary>(
    'financial-summary',
    () => dashboardApi.get('/dashboard/financial-summary').then(res => res.data)
  );

  const { data: academicSummary } = useQuery<AcademicSummary>(
    'academic-summary',
    () => dashboardApi.get('/dashboard/academic-summary').then(res => res.data)
  );

  const { data: reportsSummary } = useQuery(
    'reports-summary',
    () => dashboardApi.get('/dashboard/reports-summary').then(res => res.data)
  );

  // Fetch current admin data
  const { data: adminData, isLoading: isLoadingAdminData } = useQuery(
    'admin-dashboard-data',
    () => api.get('/dashboard/admin/current').then(res => res.data)
  );

  // Fetch comments for admin
  const [commentFilter, setCommentFilter] = useState<'all' | 'parent' | 'student' | 'teacher'>('all');
  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>(
    ['admin-comments', commentFilter],
    () => {
      const filterParam = commentFilter === 'all' ? '' : `&fromRole=${commentFilter}`;
      return api.get(`/comments?role=admin${filterParam}`).then(res => res.data);
    },
    { enabled: showComments }
  );

  // Fetch students
  const { data: studentsData, isLoading: studentsLoading } = useQuery(
    'students',
    () => api.get('/students').then(res => res.data),
    { enabled: activeView === 'students' }
  );

  // Fetch classes for dropdown
  const { data: classes } = useQuery(
    'classes-for-students',
    () => api.get('/classes').then(res => res.data),
    { enabled: showStudentForm || activeView === 'students' || showUserForm }
  );

  // Fetch staff
  const { data: staffData, isLoading: staffLoading } = useQuery(
    'staff',
    () => api.get('/teachers').then(res => res.data),
    { enabled: activeView === 'teachers' }
  );

  // Fetch classes for management
  const { data: classesData, isLoading: classesLoading } = useQuery(
    'classes-management',
    () => api.get('/classes').then(res => res.data),
    { enabled: activeView === 'classes' || showClassForm }
  );

  // Fetch teachers for class teacher dropdown
  const { data: teachersForClass } = useQuery(
    'teachers-for-class',
    () => api.get('/teachers?role=teacher').then(res => res.data),
    { enabled: showClassForm }
  );

  // Fetch users for management
  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['users-management', userFilters],
    () => api.get('/admin/users', {
      params: {
        role: userFilters.role !== 'all' ? userFilters.role : undefined,
        status: userFilters.status !== 'all' ? userFilters.status : undefined,
        search: userFilters.search || undefined,
        limit: 50
      }
    }).then(res => res.data),
    { enabled: activeView === 'users' }
  );

  // Office assignment temporarily disabled
  // const { data: officesData } = useQuery(
  //   'available-offices',
  //   () => api.get('/admin/offices').then(res => res.data),
  //   { enabled: showUserForm }
  // );



  // Mark comment as read mutation
  const markAsReadMutation = useMutation(
    (commentId: number) => api.put(`/comments/${commentId}/read`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-comments');
      }
    }
  );

  // Reply to comment mutation
  const replyMutation = useMutation(
    ({ commentId, reply }: { commentId: number; reply: string }) =>
      api.post(`/comments/${commentId}/reply`, { reply }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-comments');
        setShowReplyModal(false);
        setReplyText('');
        setSelectedComment(null);
      }
    }
  );

  // Add student mutation
  const addStudentMutation = useMutation(
    (studentData: any) => api.post('/students', studentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('students');
        queryClient.invalidateQueries('admin-dashboard-stats');
        queryClient.invalidateQueries('students-by-class');
        setShowStudentForm(false);
        resetStudentForm();
        alert('✅ Student added successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to add student: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Update student mutation
  const updateStudentMutation = useMutation(
    ({ id, ...studentData }: any) => api.put(`/students/${id}`, studentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('students');
        queryClient.invalidateQueries('admin-dashboard-stats');
        queryClient.invalidateQueries('students-by-class');
        setShowStudentForm(false);
        setEditingStudent(null);
        resetStudentForm();
        alert('✅ Student updated successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to update student: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Delete student mutation
  const deleteStudentMutation = useMutation(
    (studentId: number) => api.delete(`/students/${studentId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('students');
        queryClient.invalidateQueries('admin-dashboard-stats');
        queryClient.invalidateQueries('students-by-class');
        alert('✅ Student deleted successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to delete student: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Add staff mutation
  const addStaffMutation = useMutation(
    (staffData: any) => api.post('/teachers', staffData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('staff');
        queryClient.invalidateQueries('admin-dashboard-stats');
        setShowStaffForm(false);
        resetStaffForm();
        alert('✅ Staff member added successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to add staff member: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Update staff mutation
  const updateStaffMutation = useMutation(
    ({ id, ...staffData }: any) => api.put(`/teachers/${id}`, staffData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('staff');
        queryClient.invalidateQueries('admin-dashboard-stats');
        setShowStaffForm(false);
        setEditingStaff(null);
        resetStaffForm();
        alert('✅ Staff member updated successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to update staff member: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Delete staff mutation
  const deleteStaffMutation = useMutation(
    (staffId: number) => api.delete(`/teachers/${staffId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('staff');
        queryClient.invalidateQueries('admin-dashboard-stats');
        alert('✅ Staff member deleted successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to delete staff member: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Add class mutation
  const addClassMutation = useMutation(
    (classData: any) => api.post('/classes', classData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        queryClient.invalidateQueries('admin-dashboard-stats');
        setShowClassForm(false);
        resetClassForm();
        alert('✅ Class added successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to add class: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Update class mutation
  const updateClassMutation = useMutation(
    ({ id, ...classData }: any) => api.put(`/classes/${id}`, classData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        queryClient.invalidateQueries('admin-dashboard-stats');
        setShowClassForm(false);
        setEditingClass(null);
        resetClassForm();
        alert('✅ Class updated successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to update class: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Delete class mutation
  const deleteClassMutation = useMutation(
    (classId: number) => api.delete(`/classes/${classId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        queryClient.invalidateQueries('admin-dashboard-stats');
        alert('✅ Class deleted successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to delete class: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Add user mutation
  const addUserMutation = useMutation(
    (userData: any) => api.post('/admin/users', userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users-management');
        queryClient.invalidateQueries('admin-dashboard-stats');
        setShowUserForm(false);
        resetUserForm();
        alert('✅ User created successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to create user: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, ...userData }: any) => api.put(`/admin/users/${id}`, userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users-management');
        queryClient.invalidateQueries('admin-dashboard-stats');
        setShowUserForm(false);
        setEditingUser(null);
        resetUserForm();
        alert('✅ User updated successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to update user: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (userId: number) => api.delete(`/admin/users/${userId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users-management');
        queryClient.invalidateQueries('admin-dashboard-stats');
        alert('✅ User deactivated successfully!');
      },
      onError: (error: any) => {
        alert(`❌ Failed to deactivate user: ${error.response?.data?.message || error.message}`);
      }
    }
  );

  const handleReply = (comment: Comment) => {
    setSelectedComment(comment);
    setShowReplyModal(true);
  };

  const submitReply = () => {
    if (selectedComment && replyText.trim()) {
      replyMutation.mutate({
        commentId: selectedComment.id,
        reply: replyText.trim()
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'normal': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const resetStudentForm = () => {
    setStudentFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      classId: '',
      house: '',
      admissionNumber: '',
      dateOfBirth: '',
      guardianName: '',
      guardianPhone: '',
      address: '',
      bloodGroup: '',
      medicalConditions: ''
    });
  };

  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setStudentFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone || '',
      classId: student.class.id.toString(),
      house: student.house || '',
      admissionNumber: student.admissionNumber,
      dateOfBirth: student.dateOfBirth || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      address: student.address || '',
      bloodGroup: student.bloodGroup || '',
      medicalConditions: student.medicalConditions || ''
    });
    setShowStudentForm(true);
  };

  const handleDeleteStudent = (student: any) => {
    if (window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}? This action cannot be undone.`)) {
      deleteStudentMutation.mutate(student.id);
    }
  };

  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentFormData.firstName || !studentFormData.lastName || !studentFormData.email || !studentFormData.admissionNumber || !studentFormData.classId) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, ...studentFormData });
    } else {
      addStudentMutation.mutate(studentFormData);
    }
  };

  // Staff helper functions
  const resetStaffForm = () => {
    setStaffFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'teacher',
      office: '',
      employeeId: '',
      dateOfBirth: '',
      address: '',
      qualification: '',
      experience: 0,
      subjects: '',
      salary: 0
    });
  };

  const handleEditStaff = (staff: any) => {
    setEditingStaff(staff);
    setStaffFormData({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      office: staff.office || '',
      employeeId: staff.employeeId,
      dateOfBirth: staff.dateOfBirth || '',
      address: staff.address || '',
      qualification: staff.qualification || '',
      experience: staff.experience || 0,
      subjects: Array.isArray(staff.subjects) ? staff.subjects.join(', ') : (staff.subjects || ''),
      salary: staff.salary || 0
    });
    setShowStaffForm(true);
  };

  const handleDeleteStaff = (staff: any) => {
    if (window.confirm(`Are you sure you want to delete ${staff.firstName} ${staff.lastName}? This action cannot be undone.`)) {
      deleteStaffMutation.mutate(staff.id);
    }
  };

  const handleSubmitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffFormData.firstName || !staffFormData.lastName || !staffFormData.email || !staffFormData.role) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, ...staffFormData });
    } else {
      addStaffMutation.mutate(staffFormData);
    }
  };

  // Class helper functions
  const resetClassForm = () => {
    setClassFormData({
      name: '',
      level: '',
      capacity: 30,
      classTeacher: ''
    });
  };

  const handleEditClass = (classItem: any) => {
    setEditingClass(classItem);
    setClassFormData({
      name: classItem.name,
      level: classItem.level,
      capacity: classItem.capacity,
      classTeacher: classItem.classTeacher?.id || ''
    });
    setShowClassForm(true);
  };

  const handleDeleteClass = (classItem: any) => {
    if (window.confirm(`Are you sure you want to delete ${classItem.name}? This action cannot be undone.`)) {
      deleteClassMutation.mutate(classItem.id);
    }
  };

  const handleSubmitClass = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classFormData.name || !classFormData.level) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, ...classFormData });
    } else {
      addClassMutation.mutate(classFormData);
    }
  };

  // User helper functions
  const resetUserForm = () => {
    setUserFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: '',
      phone: '',
      office: '',
      // Student specific
      admissionNumber: '',
      classId: '',
      house: '',
      dateOfBirth: '',
      guardianName: '',
      guardianPhone: '',
      address: '',
      // Staff specific
      employeeId: '',
      qualification: '',
      experience: 0,
      subjects: '',
      salary: 0,
      assignedOffice: ''
    });
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '', // Don't pre-fill password for security
      role: user.role,
      phone: user.phone || '',
      office: user.office || '',
      // Student specific
      admissionNumber: user.admissionNumber || '',
      classId: user.classId || '',
      house: user.house || '',
      dateOfBirth: user.dateOfBirth || '',
      guardianName: user.guardianName || '',
      guardianPhone: user.guardianPhone || '',
      address: user.address || '',
      // Staff specific
      employeeId: user.employeeId || '',
      qualification: user.qualification || '',
      experience: user.experience || 0,
      subjects: user.subjects || '',
      salary: user.salary || 0,
      assignedOffice: user.assignedOffice || ''
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = (user: any) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName}? This will disable their access to the system.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userFormData.firstName || !userFormData.lastName || !userFormData.email || !userFormData.role) {
      alert('Please fill in all required fields');
      return;
    }

    if (!editingUser && !userFormData.password) {
      alert('Password is required for new users');
      return;
    }

    // Role-specific validation
    if (userFormData.role === 'student' && (!userFormData.admissionNumber || !userFormData.classId)) {
      alert('Admission number and class are required for students');
      return;
    }

    if (['teacher', 'exam_officer', 'accountant'].includes(userFormData.role) && !userFormData.employeeId) {
      alert('Employee ID is required for staff members');
      return;
    }

    if (editingUser) {
      // For updates, only include password if it's provided
      const updateData: any = { ...userFormData };
      if (!updateData.password) {
        const { password, ...dataWithoutPassword } = updateData;
        updateUserMutation.mutate({ id: editingUser.id, ...dataWithoutPassword });
      } else {
        updateUserMutation.mutate({ id: editingUser.id, ...updateData });
      }
    } else {
      // For new users, password is required
      addUserMutation.mutate(userFormData);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'teacher': return 'bg-blue-100 text-blue-800';
      case 'exam_officer': return 'bg-purple-100 text-purple-800';
      case 'accountant': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-yellow-100 text-yellow-800';
      case 'parent': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  const statCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      description: 'Active students enrolled',
      change: '+5% from last month'
    },
    {
      title: 'Total Teachers',
      value: stats?.totalTeachers || 0,
      icon: AcademicCapIcon,
      color: 'bg-green-500',
      description: 'Active teaching staff',
      change: '+2% from last month'
    },
    {
      title: 'Total Classes',
      value: stats?.totalClasses || 0,
      icon: BuildingLibraryIcon,
      color: 'bg-purple-500',
      description: 'Active class sections',
      change: 'No change'
    },
    {
      title: 'Net Balance',
      value: `₦${(financialSummary?.netBalance || 0).toLocaleString()}`,
      icon: BanknotesIcon,
      color: 'bg-yellow-500',
      description: 'Income minus expenditure',
      change: '+12% from last month'
    },
    {
      title: 'Academic Performance',
      value: `${(academicSummary?.passRate || 0).toFixed(1)}%`,
      icon: ChartBarIcon,
      color: 'bg-indigo-500',
      description: 'Overall pass rate',
      change: '+3% from last term'
    },
    {
      title: 'Pending Reports',
      value: reportsSummary?.total?.pendingReports || 0,
      icon: DocumentTextIcon,
      color: 'bg-orange-500',
      description: 'Reports awaiting review',
      change: '-8% from last week'
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
      <div className="bg-gradient-to-r from-primary-600 to-academy-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">
          {isLoadingAdminData ? 'Admin Dashboard' : `Welcome, ${adminData?.admin?.firstName || 'Admin'} ${adminData?.admin?.lastName || 'User'}`}
        </h1>
        <p className="text-primary-100">
          {isLoadingAdminData ? 'Loading...' : `Welcome back! Here's what's happening at Shambil Pride Academy.`}
        </p>
        {adminData?.admin?.office && (
          <p className="text-primary-200 text-sm mt-1">
            {adminData.admin.office} • {adminData.admin.email}
          </p>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-2">
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
            onClick={() => setActiveView('students')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'students'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥 Manage Students
          </button>
          <button
            onClick={() => setActiveView('teachers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'teachers'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👨‍🏫 Manage Teachers
          </button>
          <button
            onClick={() => setActiveView('classes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'classes'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🏫 Manage Classes
          </button>
          <button
            onClick={() => setActiveView('reports')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'reports'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Reports Management
          </button>
          <button
            onClick={() => setActiveView('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'users'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveView('results')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'results'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Results Entry
          </button>
        </div>
      </div>

      {/* Conditional Content Based on Active View */}
      {activeView === 'dashboard' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-green-600">{card.change} from last month</p>
              </div>
              <div className={`p-3 rounded-full ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <HomeIcon className="h-5 w-5 mr-2" />
            Students per Class
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {classDistribution?.map((classData) => (
              <div key={classData._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-sm">{classData._id}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  {classData.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Financial Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Expected</span>
              <span className="font-semibold">₦{(financialSummary?.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Received</span>
              <span className="font-semibold text-green-600">₦{(financialSummary?.totalPaid || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outstanding</span>
              <span className="font-semibold text-red-600">₦{(financialSummary?.totalBalance || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Expenditure</span>
              <span className="font-semibold text-orange-600">₦{(financialSummary?.totalExpenditure || 0).toLocaleString()}</span>
            </div>
            <hr />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Net Balance</span>
              <span className="font-bold text-lg text-blue-600">₦{(financialSummary?.netBalance || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Academic Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Academic Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Results</span>
              <span className="font-semibold">{academicSummary?.totalResults || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Score</span>
              <span className="font-semibold">{(academicSummary?.averageScore || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pass Rate</span>
              <span className="font-semibold text-green-600">{(academicSummary?.passRate || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Excellence Rate</span>
              <span className="font-semibold text-blue-600">{(academicSummary?.excellenceRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
          Reports Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {reportsSummary?.byType?.map((report: any) => (
            <div key={report._id} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{report.count}</p>
              <p className="text-sm text-gray-600 capitalize">{report._id}</p>
              <p className="text-xs text-orange-600">{report.pending} pending</p>
            </div>
          ))}
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Management */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Staff Management</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <div className="flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-3 text-blue-600" />
                <span>Manage Teachers</span>
              </div>
              <span className="text-sm text-gray-500">Add, Edit, Delete</span>
            </button>
            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-3 text-green-600" />
                <span>Manage Staff</span>
              </div>
              <span className="text-sm text-gray-500">All Staff Members</span>
            </button>
          </div>
        </div>

        {/* User Management */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">User Management</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-3 text-purple-600" />
                <span>Manage Students</span>
              </div>
              <span className="text-sm text-gray-500">Add, Edit, Delete</span>
            </button>
            <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <div className="flex items-center">
                <HomeIcon className="h-5 w-5 mr-3 text-orange-600" />
                <span>Manage Parents</span>
              </div>
              <span className="text-sm text-gray-500">Parent Accounts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveView('students')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <UserGroupIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <span className="text-sm font-medium">Manage Students</span>
          </button>
          <button 
            onClick={() => setActiveView('teachers')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <AcademicCapIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <span className="text-sm font-medium">Manage Staff</span>
          </button>
          <button 
            onClick={() => setActiveView('classes')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <BuildingLibraryIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <span className="text-sm font-medium">Manage Classes</span>
          </button>
          <button 
            onClick={() => alert('Result entry feature available in Exam Officer dashboard')}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <PencilSquareIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <span className="text-sm font-medium">Enter Results</span>
          </button>
          <button 
            onClick={() => setShowComments(true)}
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <span className="text-sm font-medium">View Comments</span>
          </button>
          <Link 
            to="/homepage"
            className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <HomeIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <span className="text-sm font-medium">School Homepage</span>
          </Link>
        </div>
      </div>
        </>
      )}

      {/* Student Management View */}
      {activeView === 'students' && (
        <div className="space-y-6">
          {/* Student Management Header */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">👥 Student Management</h2>
                <p className="text-gray-600">Add, edit, and manage student records</p>
              </div>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  resetStudentForm();
                  setShowStudentForm(true);
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                ➕ Add New Student
              </button>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">All Students</h3>
            </div>
            
            {studentsLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading students...</p>
              </div>
            ) : studentsData?.students?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">House</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentsData.students.map((student: any) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.admissionNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.class.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.house || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{student.phone || 'No phone'}</div>
                          <div className="text-gray-500">{student.guardianPhone || 'No guardian phone'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditStudent(student)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student)}
                              className="text-red-600 hover:text-red-900"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first student.</p>
                <button
                  onClick={() => {
                    setEditingStudent(null);
                    resetStudentForm();
                    setShowStudentForm(true);
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  ➕ Add First Student
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Management View */}
      {activeView === 'teachers' && (
        <div className="space-y-6">
          {/* Staff Management Header */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">👨‍🏫 Staff Management</h2>
                <p className="text-gray-600">Add, edit, and manage staff members</p>
              </div>
              <button
                onClick={() => {
                  setEditingStaff(null);
                  resetStaffForm();
                  setShowStaffForm(true);
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                ➕ Add New Staff Member
              </button>
            </div>
          </div>

          {/* Staff List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">All Staff Members</h3>
            </div>
            
            {staffLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading staff...</p>
              </div>
            ) : staffData?.staff?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffData.staff.map((staff: any) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">
                                {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {staff.firstName} {staff.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{staff.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.employeeId || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {staff.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.office || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-xs">
                            {staff.subjects && (typeof staff.subjects === 'string' ? staff.subjects.trim() : (Array.isArray(staff.subjects) && staff.subjects.length > 0)) ? (
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const subjectList = typeof staff.subjects === 'string' 
                                    ? staff.subjects.split(',').map(s => s.trim()).filter(s => s.length > 0)
                                    : staff.subjects;
                                  
                                  return subjectList.slice(0, 2).map((subject: string, index: number) => (
                                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      {subject}
                                    </span>
                                  ));
                                })()}
                                {(() => {
                                  const subjectList = typeof staff.subjects === 'string' 
                                    ? staff.subjects.split(',').map(s => s.trim()).filter(s => s.length > 0)
                                    : staff.subjects;
                                  
                                  return subjectList.length > 2 && (
                                    <span className="text-xs text-gray-500">+{subjectList.length - 2} more</span>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-gray-500">No subjects assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditStaff(staff)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff)}
                              className="text-red-600 hover:text-red-900"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center">
                <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Members Found</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first staff member.</p>
                <button
                  onClick={() => {
                    setEditingStaff(null);
                    resetStaffForm();
                    setShowStaffForm(true);
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  ➕ Add First Staff Member
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Class Management View */}
      {activeView === 'classes' && (
        <div className="space-y-6">
          {/* Class Management Header */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🏫 Class Management</h2>
                <p className="text-gray-600">Add, edit, and manage school classes</p>
              </div>
              <button
                onClick={() => {
                  setEditingClass(null);
                  resetClassForm();
                  setShowClassForm(true);
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                ➕ Add New Class
              </button>
            </div>
          </div>

          {/* Classes List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">All Classes</h3>
            </div>
            
            {classesLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading classes...</p>
              </div>
            ) : classesData?.classes?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classesData.classes.map((classItem: any) => (
                      <tr key={classItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                                {classItem.name.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {classItem.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {classItem.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {classItem.capacity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{classItem.studentCount}</span>
                            <span className="text-xs text-gray-500 ml-1">/ {classItem.capacity}</span>
                            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min((classItem.studentCount / classItem.capacity) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {classItem.classTeacher ? (
                            <span className="text-gray-900">{classItem.classTeacher.name}</span>
                          ) : (
                            <span className="text-gray-500">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditClass(classItem)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClass(classItem)}
                              className="text-red-600 hover:text-red-900"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center">
                <BuildingLibraryIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first class.</p>
                <button
                  onClick={() => {
                    setEditingClass(null);
                    resetClassForm();
                    setShowClassForm(true);
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  ➕ Add First Class
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Student Form Modal */}
      {showStudentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingStudent ? '✏️ Edit Student' : '➕ Add New Student'}
                </h3>
                <button
                  onClick={() => {
                    setShowStudentForm(false);
                    setEditingStudent(null);
                    resetStudentForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitStudent} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={studentFormData.firstName}
                      onChange={(e) => setStudentFormData({...studentFormData, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={studentFormData.lastName}
                      onChange={(e) => setStudentFormData({...studentFormData, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={studentFormData.email}
                      onChange={(e) => setStudentFormData({...studentFormData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={studentFormData.phone}
                      onChange={(e) => setStudentFormData({...studentFormData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={studentFormData.dateOfBirth}
                      onChange={(e) => setStudentFormData({...studentFormData, dateOfBirth: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                    <select
                      value={studentFormData.bloodGroup}
                      onChange={(e) => setStudentFormData({...studentFormData, bloodGroup: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Academic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label>
                    <input
                      type="text"
                      value={studentFormData.admissionNumber}
                      onChange={(e) => setStudentFormData({...studentFormData, admissionNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., SHA/2024/001"
                      required
                      disabled={!!editingStudent}
                    />
                    {editingStudent && (
                      <p className="text-xs text-gray-500 mt-1">Admission number cannot be changed</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                    <select
                      value={studentFormData.classId}
                      onChange={(e) => setStudentFormData({...studentFormData, classId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes?.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">House</label>
                    <select
                      value={studentFormData.house}
                      onChange={(e) => setStudentFormData({...studentFormData, house: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select House</option>
                      <option value="RED">RED</option>
                      <option value="BLUE">BLUE</option>
                      <option value="GREEN">GREEN</option>
                      <option value="PURPLE">PURPLE</option>
                      <option value="PINK">PINK</option>
                      <option value="BROWN">BROWN</option>
                      <option value="YELLOW">YELLOW</option>
                      <option value="WHITE">WHITE</option>
                      <option value="MAGENTA">MAGENTA</option>
                      <option value="ORANGE">ORANGE</option>
                      <option value="BLACK">BLACK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
                    <input
                      type="text"
                      value={studentFormData.guardianName}
                      onChange={(e) => setStudentFormData({...studentFormData, guardianName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone</label>
                    <input
                      type="tel"
                      value={studentFormData.guardianPhone}
                      onChange={(e) => setStudentFormData({...studentFormData, guardianPhone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={studentFormData.address}
                      onChange={(e) => setStudentFormData({...studentFormData, address: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Medical Information</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
                  <textarea
                    value={studentFormData.medicalConditions}
                    onChange={(e) => setStudentFormData({...studentFormData, medicalConditions: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any allergies, medical conditions, or special requirements..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentForm(false);
                    setEditingStudent(null);
                    resetStudentForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addStudentMutation.isLoading || updateStudentMutation.isLoading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {addStudentMutation.isLoading || updateStudentMutation.isLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingStudent ? 'Updating...' : 'Adding...'}
                    </span>
                  ) : (
                    editingStudent ? '✅ Update Student' : '➕ Add Student'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Form Modal */}
      {showStaffForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingStaff ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'}
                </h3>
                <button
                  onClick={() => {
                    setShowStaffForm(false);
                    setEditingStaff(null);
                    resetStaffForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitStaff} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={staffFormData.firstName}
                      onChange={(e) => setStaffFormData({...staffFormData, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={staffFormData.lastName}
                      onChange={(e) => setStaffFormData({...staffFormData, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={staffFormData.email}
                      onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={staffFormData.phone}
                      onChange={(e) => setStaffFormData({...staffFormData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={staffFormData.dateOfBirth}
                      onChange={(e) => setStaffFormData({...staffFormData, dateOfBirth: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={staffFormData.address}
                      onChange={(e) => setStaffFormData({...staffFormData, address: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Professional Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={staffFormData.employeeId}
                      onChange={(e) => setStaffFormData({...staffFormData, employeeId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., EMP/2024/001"
                      disabled={!!editingStaff}
                    />
                    {editingStaff && (
                      <p className="text-xs text-gray-500 mt-1">Employee ID cannot be changed</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      value={staffFormData.role}
                      onChange={(e) => setStaffFormData({...staffFormData, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="teacher">Teacher</option>
                      <option value="exam_officer">Exam Officer</option>
                      <option value="accountant">Accountant</option>
                      <option value="principal">Principal</option>
                      <option value="director">Director</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office/Department</label>
                    <input
                      type="text"
                      value={staffFormData.office}
                      onChange={(e) => setStaffFormData({...staffFormData, office: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Academic Department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                    <input
                      type="text"
                      value={staffFormData.qualification}
                      onChange={(e) => setStaffFormData({...staffFormData, qualification: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., B.Ed Mathematics, M.Sc Physics"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={staffFormData.experience}
                      onChange={(e) => setStaffFormData({...staffFormData, experience: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₦)</label>
                    <input
                      type="number"
                      min="0"
                      value={staffFormData.salary}
                      onChange={(e) => setStaffFormData({...staffFormData, salary: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Section */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Teaching Subjects (For Teachers)</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subjects Taught
                  </label>
                  <textarea
                    value={staffFormData.subjects}
                    onChange={(e) => setStaffFormData({...staffFormData, subjects: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter subjects separated by commas (e.g., Mathematics, Physics, Chemistry)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the subjects this staff member teaches, separated by commas. Leave empty for non-teaching staff.
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowStaffForm(false);
                    setEditingStaff(null);
                    resetStaffForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addStaffMutation.isLoading || updateStaffMutation.isLoading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {addStaffMutation.isLoading || updateStaffMutation.isLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingStaff ? 'Updating...' : 'Adding...'}
                    </span>
                  ) : (
                    editingStaff ? '✅ Update Staff Member' : '➕ Add Staff Member'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Form Modal */}
      {showClassForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingClass ? '✏️ Edit Class' : '➕ Add New Class'}
                </h3>
                <button
                  onClick={() => {
                    setShowClassForm(false);
                    setEditingClass(null);
                    resetClassForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitClass} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Class Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Class Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                    <input
                      type="text"
                      value={classFormData.name}
                      onChange={(e) => setClassFormData({...classFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., JSS 1A, SS 2 Science"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level *</label>
                    <select
                      value={classFormData.level}
                      onChange={(e) => setClassFormData({...classFormData, level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Level</option>
                      <option value="Kindergarten">Kindergarten</option>
                      <option value="Nursery">Nursery</option>
                      <option value="Primary">Primary</option>
                      <option value="Junior Secondary">Junior Secondary</option>
                      <option value="Senior Secondary">Senior Secondary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={classFormData.capacity}
                      onChange={(e) => setClassFormData({...classFormData, capacity: parseInt(e.target.value) || 30})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum number of students in this class</p>
                  </div>
                </div>

                {/* Assignment Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Assignment</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher</label>
                    <select
                      value={classFormData.classTeacher}
                      onChange={(e) => setClassFormData({...classFormData, classTeacher: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Class Teacher (Optional)</option>
                      {teachersForClass?.staff?.map((teacher: any) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName} - {teacher.role}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Assign a teacher to be responsible for this class</p>
                  </div>

                  {/* Class Statistics (for editing) */}
                  {editingClass && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Current Statistics</h5>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Current Students:</span>
                          <span className="font-medium">{editingClass.studentCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Capacity Utilization:</span>
                          <span className="font-medium">
                            {((editingClass.studentCount / editingClass.capacity) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowClassForm(false);
                    setEditingClass(null);
                    resetClassForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addClassMutation.isLoading || updateClassMutation.isLoading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {addClassMutation.isLoading || updateClassMutation.isLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingClass ? 'Updating...' : 'Adding...'}
                    </span>
                  ) : (
                    editingClass ? '✅ Update Class' : '➕ Add Class'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management View */}
      {activeView === 'users' && (
        <div className="space-y-6">
          {/* User Management Header */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">👥 User Management</h2>
                <p className="text-gray-600">Create and manage user accounts for all system users</p>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  resetUserForm();
                  setShowUserForm(true);
                }}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                ➕ Create New User
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={userFilters.role}
                  onChange={(e) => setUserFilters({...userFilters, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="exam_officer">Exam Officer</option>
                  <option value="accountant">Accountant</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={userFilters.status}
                  onChange={(e) => setUserFilters({...userFilters, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={userFilters.search}
                  onChange={(e) => setUserFilters({...userFilters, search: e.target.value})}
                  placeholder="Search by name, email, admission number, or employee ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">All Users</h3>
              {usersData?.pagination && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing {usersData.users.length} of {usersData.pagination.total} users
                </p>
              )}
            </div>
            
            {usersLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading users...</p>
              </div>
            ) : usersData?.users?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID/Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office/Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersData.users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">
                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.admissionNumber || user.employeeId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.className || user.assignedOffice || user.office || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              ✏️ Edit
                            </button>
                            {user.isActive && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 hover:text-red-900"
                              >
                                🚫 Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600 mb-4">No users match the selected filters.</p>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    resetUserForm();
                    setShowUserForm(true);
                  }}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  ➕ Create First User
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Management View */}
      {activeView === 'reports' && (
        <ReportsManagementView />
      )}

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2" />
                  Comments & Complaints
                </h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Filter Section */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Role:
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCommentFilter('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      commentFilter === 'all' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All ({comments?.length || 0})
                  </button>
                  <button
                    onClick={() => setCommentFilter('parent')}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      commentFilter === 'parent' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    👨‍👩‍👧‍👦 Parents
                  </button>
                  <button
                    onClick={() => setCommentFilter('student')}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      commentFilter === 'student' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🎓 Students
                  </button>
                  <button
                    onClick={() => setCommentFilter('teacher')}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      commentFilter === 'teacher' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    👨‍🏫 Teachers
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="p-6">
              {commentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading comments...</p>
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: Comment) => (
                    <div key={comment.id} className={`border rounded-lg p-4 ${comment.status === 'unread' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              comment.fromRole === 'parent' ? 'bg-green-500' :
                              comment.fromRole === 'student' ? 'bg-purple-500' :
                              comment.fromRole === 'teacher' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }`}>
                              {comment.fromRole === 'parent' ? '👨‍👩‍👧‍👦' :
                               comment.fromRole === 'student' ? '🎓' :
                               comment.fromRole === 'teacher' ? '👨‍🏫' :
                               comment.from.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{comment.from}</p>
                            <p className="text-xs text-gray-500 capitalize">{comment.fromRole.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {comment.priority && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(comment.priority)}`}>
                              {comment.priority.toUpperCase()}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${comment.status === 'unread' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {comment.status === 'unread' ? 'NEW' : 'READ'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">{comment.subject}</h4>
                        <p className="text-sm text-gray-700">{comment.message}</p>
                      </div>
                      
                      {comment.studentAdmission && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Student: {comment.studentAdmission}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>To: {comment.to} ({comment.toRole.replace('_', ' ')})</span>
                        <span>{formatDate(comment.timestamp)}</span>
                      </div>
                      
                      {comment.reply && (
                        <div className="mt-3 p-3 bg-white rounded border-l-4 border-green-400">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-800">Admin Reply:</span>
                            <span className="text-xs text-gray-500">{comment.repliedAt && formatDate(comment.repliedAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.reply}</p>
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-2 mt-3">
                        {comment.status === 'unread' && (
                          <button
                            onClick={() => markAsReadMutation.mutate(comment.id)}
                            disabled={markAsReadMutation.isLoading}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            {markAsReadMutation.isLoading ? 'Marking...' : 'Mark as Read'}
                          </button>
                        )}
                        {!comment.reply && (
                          <button
                            onClick={() => handleReply(comment)}
                            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Comments Found</h3>
                  <p className="text-gray-600">
                    {commentFilter === 'all' 
                      ? 'No comments or complaints have been received yet.'
                      : `No comments from ${commentFilter}s have been received yet.`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingUser ? '✏️ Edit User' : '➕ Create New User'}
                </h3>
                <button
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    resetUserForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitUser} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={userFormData.firstName}
                      onChange={(e) => setUserFormData({...userFormData, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={userFormData.lastName}
                      onChange={(e) => setUserFormData({...userFormData, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingUser ? '(leave blank to keep current)' : '*'}
                    </label>
                    <input
                      type="password"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={!editingUser}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="exam_officer">Exam Officer</option>
                      <option value="accountant">Accountant</option>
                      <option value="student">Student</option>
                      <option value="parent">Parent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={userFormData.phone}
                      onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Role-Specific Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Role-Specific Information</h4>
                  
                  {/* Student Fields */}
                  {userFormData.role === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label>
                        <input
                          type="text"
                          value={userFormData.admissionNumber}
                          onChange={(e) => setUserFormData({...userFormData, admissionNumber: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., SHA/2024/001"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                        <select
                          value={userFormData.classId}
                          onChange={(e) => setUserFormData({...userFormData, classId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        >
                          <option value="">Select Class</option>
                          {classes?.map((cls: any) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} ({cls.level})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">House</label>
                        <select
                          value={userFormData.house}
                          onChange={(e) => setUserFormData({...userFormData, house: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select House</option>
                          <option value="RED">RED</option>
                          <option value="BLUE">BLUE</option>
                          <option value="GREEN">GREEN</option>
                          <option value="PURPLE">PURPLE</option>
                          <option value="PINK">PINK</option>
                          <option value="BROWN">BROWN</option>
                          <option value="YELLOW">YELLOW</option>
                          <option value="WHITE">WHITE</option>
                          <option value="MAGENTA">MAGENTA</option>
                          <option value="ORANGE">ORANGE</option>
                          <option value="BLACK">BLACK</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={userFormData.dateOfBirth}
                          onChange={(e) => setUserFormData({...userFormData, dateOfBirth: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
                        <input
                          type="text"
                          value={userFormData.guardianName}
                          onChange={(e) => setUserFormData({...userFormData, guardianName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone</label>
                        <input
                          type="tel"
                          value={userFormData.guardianPhone}
                          onChange={(e) => setUserFormData({...userFormData, guardianPhone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Staff Fields */}
                  {['teacher', 'exam_officer', 'accountant'].includes(userFormData.role) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                        <input
                          type="text"
                          value={userFormData.employeeId}
                          onChange={(e) => setUserFormData({...userFormData, employeeId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., EMP/2024/001"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                        <input
                          type="text"
                          value={userFormData.qualification}
                          onChange={(e) => setUserFormData({...userFormData, qualification: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., B.Ed Mathematics"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                        <input
                          type="number"
                          min="0"
                          value={userFormData.experience}
                          onChange={(e) => setUserFormData({...userFormData, experience: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₦)</label>
                        <input
                          type="number"
                          min="0"
                          value={userFormData.salary}
                          onChange={(e) => setUserFormData({...userFormData, salary: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      {/* Office assignment temporarily disabled */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Office Assignment</label>
                        <input
                          type="text"
                          value={userFormData.assignedOffice}
                          onChange={(e) => setUserFormData({...userFormData, assignedOffice: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., Head Teacher, Discipline Master (optional)"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter office assignment manually for now</p>
                      </div>

                      {userFormData.role === 'teacher' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subjects Taught</label>
                          <textarea
                            value={userFormData.subjects}
                            onChange={(e) => setUserFormData({...userFormData, subjects: e.target.value})}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter subjects separated by commas (e.g., Mathematics, Physics, Chemistry)"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* General Office Field */}
                  {!['student'].includes(userFormData.role) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department/Office</label>
                      <input
                        type="text"
                        value={userFormData.office}
                        onChange={(e) => setUserFormData({...userFormData, office: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Academic Department, Administration"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Address Section */}
              {userFormData.role === 'student' && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Address Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={userFormData.address}
                      onChange={(e) => setUserFormData({...userFormData, address: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter full address..."
                    />
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    resetUserForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isLoading || updateUserMutation.isLoading}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {addUserMutation.isLoading || updateUserMutation.isLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingUser ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingUser ? '✅ Update User' : '➕ Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Reply to Comment</h3>
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setSelectedComment(null);
                    setReplyText('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Original Comment */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Original Comment:</h4>
                <p className="text-sm text-gray-700 mb-2"><strong>Subject:</strong> {selectedComment.subject}</p>
                <p className="text-sm text-gray-700 mb-2"><strong>From:</strong> {selectedComment.from} ({selectedComment.fromRole})</p>
                <p className="text-sm text-gray-700">{selectedComment.message}</p>
              </div>

              {/* Reply Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Reply:</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your reply here..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setSelectedComment(null);
                    setReplyText('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim() || replyMutation.isLoading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {replyMutation.isLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </span>
                  ) : (
                    'Send Reply'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;