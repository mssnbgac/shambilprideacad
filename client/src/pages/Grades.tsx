import React, { useState, useCallback } from 'react';
import { useQuery } from 'react-query';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  DocumentTextIcon,
  PencilSquareIcon,
  EyeIcon,
  ChartBarIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api.ts';
import { academicSessions, getCurrentSession } from '../utils/academicSessions.ts';
import ResultEntryForm from '../components/ResultEntryForm.tsx';

interface Result {
  id: number;
  student: {
    name: string;
    admissionNumber: string;
    class: string;
  };
  academicYear: string;
  term: string;
  totalScore: number;
  averageScore: number;
  grade: string;
  published: boolean;
  enteredAt: string;
  updatedAt: string;
}

const Grades: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentSession());
  const [selectedTerm, setSelectedTerm] = useState('first');
  const [selectedClass, setSelectedClass] = useState('');
  const [showResultForm, setShowResultForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Debug state changes
  React.useEffect(() => {
    console.log('Grades: showResultForm changed to:', showResultForm);
  }, [showResultForm]);
  
  React.useEffect(() => {
    console.log('Grades: selectedStudent changed to:', selectedStudent);
  }, [selectedStudent]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch results with filters
  const { data: resultsData, isLoading, refetch } = useQuery(
    ['grades', searchTerm, selectedAcademicYear, selectedTerm, selectedClass, currentPage],
    () => api.get('/results', {
      params: {
        search: searchTerm,
        academicYear: selectedAcademicYear,
        term: selectedTerm,
        class: selectedClass,
        page: currentPage,
        limit: pageSize
      }
    }).then(res => res.data),
    {
      keepPreviousData: true,
      staleTime: 30000, // Consider data fresh for 30 seconds
      refetchOnWindowFocus: false // Don't refetch when window gains focus
    }
  );

  // Fetch classes for filter
  const { data: classes } = useQuery(
    'classes',
    () => api.get('/classes').then(res => res.data.classes || [])
  );

  // Fetch statistics
  const { data: stats } = useQuery(
    ['grades-stats', selectedAcademicYear, selectedTerm],
    () => api.get('/dashboard/exam-officer-stats', {
      params: {
        academicYear: selectedAcademicYear,
        term: selectedTerm
      }
    }).then(res => res.data)
  );

  const results = resultsData?.results || [];
  const pagination = resultsData?.pagination || {};

  const handleEditResult = useCallback((result: Result) => {
    // Convert result to student format for the form
    const studentData = {
      _id: result.id,
      admissionNumber: result.student.admissionNumber,
      user: {
        firstName: result.student.name.split(' ')[0],
        lastName: result.student.name.split(' ').slice(1).join(' ')
      },
      class: {
        _id: 1,
        name: result.student.class
      }
    };
    console.log('🎯 handleEditResult called, setting student and opening form');
    setSelectedStudent(studentData);
    setShowResultForm(true);
  }, []);

  const handleOpenNewResultForm = useCallback(() => {
    console.log('🎯 handleOpenNewResultForm called');
    console.log('Current showResultForm state:', showResultForm);
    
    // Clear any selected student first
    setSelectedStudent(null);
    
    // Use functional state update to ensure we get the latest state
    setShowResultForm(prev => {
      console.log('Previous showResultForm state:', prev);
      console.log('Setting showResultForm to true');
      return true;
    });
  }, [showResultForm]);

  const handleCloseForm = useCallback(() => {
    console.log('🎯 handleCloseForm called');
    setShowResultForm(false);
    setSelectedStudent(null);
    refetch(); // Refresh the results list
  }, [refetch]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'E': return 'text-red-600 bg-red-100';
      case 'F': return 'text-red-800 bg-red-200';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grades Management</h1>
          <p className="text-gray-600">View and manage student results and grades</p>
          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-1">
            Form State: {showResultForm ? '✅ OPEN' : '❌ CLOSED'} | 
            Selected Student: {selectedStudent ? '👤 YES' : '❌ NO'} |
            Render Count: {Math.random().toString(36).substr(2, 5)}
          </div>
        </div>
        <button
          onClick={handleOpenNewResultForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <PencilSquareIcon className="h-5 w-5" />
          <span>Enter New Results</span>
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Results</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalResults}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisMonthResults}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingResults}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Academic Year */}
          <select
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {academicSessions.map(session => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>

          {/* Term */}
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="first">First Term</option>
            <option value="second">Second Term</option>
            <option value="third">Third Term</option>
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Classes</option>
            {classes?.map((cls: any) => (
              <option key={cls.id} value={cls.name}>{cls.name}</option>
            ))}
          </select>

          {/* Filter Button */}
          <button
            onClick={() => refetch()}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2"
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Student Results ({pagination.total || 0} total)
          </h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading results...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No results found for the selected criteria.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Academic Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Term
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result: Result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {result.student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.student.admissionNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.student.class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.academicYear}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {result.term}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.totalScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.averageScore?.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(result.grade)}`}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.published 
                            ? 'text-green-800 bg-green-100' 
                            : 'text-yellow-800 bg-yellow-100'
                        }`}>
                          {result.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(result.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditResult(result)}
                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
                            <EyeIcon className="h-4 w-4" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Result Entry Form */}
      <ResultEntryForm
        key="grades-result-form"
        isOpen={showResultForm}
        onClose={handleCloseForm}
        initialAcademicYear={selectedAcademicYear}
        initialTerm={selectedTerm}
        preSelectedStudent={selectedStudent}
      />
    </div>
  );
};

export default Grades;