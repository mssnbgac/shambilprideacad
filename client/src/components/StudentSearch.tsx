import React, { useState } from 'react';
import { useMutation } from 'react-query';
import axios from 'axios';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Configure axios base URL
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

interface StudentSearchProps {
  onStudentFound: (student: any) => void;
  placeholder?: string;
}

const StudentSearch: React.FC<StudentSearchProps> = ({ 
  onStudentFound, 
  placeholder = "Enter admission number..." 
}) => {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [error, setError] = useState('');

  const searchStudent = useMutation(
    (admissionNum: string) => api.get(`/students/search/admission/${encodeURIComponent(admissionNum)}`),
    {
      onSuccess: (response) => {
        setSearchResult(response.data);
        setError('');
        onStudentFound(response.data);
      },
      onError: (error: any) => {
        setSearchResult(null);
        setError(error.response?.data?.message || 'Student not found');
      }
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (admissionNumber.trim()) {
      searchStudent.mutate(admissionNumber.trim());
    }
  };

  const clearSearch = () => {
    setAdmissionNumber('');
    setSearchResult(null);
    setError('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
        <button
          type="submit"
          disabled={searchStudent.isLoading || !admissionNumber.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searchStudent.isLoading ? 'Searching...' : 'Search'}
        </button>
        {(searchResult || error) && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear
          </button>
        )}
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {searchResult && (
        <div className="bg-white border border-green-300 rounded-lg shadow-sm">
          {/* Header */}
          <div className="bg-green-50 px-6 py-4 border-b border-green-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-green-800 flex items-center">
                <span className="mr-2">✅</span>
                Student Found - Please Confirm Details
              </h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Active Student
              </span>
            </div>
          </div>

          {/* Student Details */}
          <div className="p-6">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {searchResult.user?.firstName?.charAt(0)}{searchResult.user?.lastName?.charAt(0)}
                </div>
              </div>

              {/* Student Information */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">
                    Personal Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {searchResult.user?.firstName} {searchResult.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="text-sm text-gray-700">{searchResult.user?.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="text-sm text-gray-700">{searchResult.user?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Academic Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">
                    Academic Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Admission Number</p>
                      <p className="text-lg font-bold text-blue-600">{searchResult.admissionNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Student ID</p>
                      <p className="text-sm text-gray-700">{searchResult.studentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Class</p>
                      <p className="text-sm font-medium text-gray-900">
                        {searchResult.class?.name} ({searchResult.class?.level})
                      </p>
                    </div>
                    {searchResult.house && (
                      <div>
                        <p className="text-sm text-gray-500">House</p>
                        <p className="text-sm font-medium text-indigo-600 capitalize">{searchResult.house}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-blue-500 text-lg">ℹ️</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Confirm Student Identity</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Please verify that this is the correct student before proceeding with result entry. 
                    The results will be associated with <strong>{searchResult.user?.firstName} {searchResult.user?.lastName}</strong> 
                    (Admission: <strong>{searchResult.admissionNumber}</strong>).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSearch;