import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Configure axios base URL
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

const Teachers: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'teacher',
    department: '',
    subjects: ''
  });

  const { data: teachersData, isLoading } = useQuery(
    ['teachers', searchTerm],
    () => api.get(`/teachers?search=${searchTerm}`).then(res => res.data)
  );

  const teachers = teachersData?.staff || [];

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/teachers', {
        ...newTeacher,
        subjects: newTeacher.subjects
      });
      setShowAddForm(false);
      setNewTeacher({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'teacher',
        department: '',
        subjects: ''
      });
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = '✅ Staff member added successfully!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
      // Refresh the teachers list
      queryClient.invalidateQueries(['teachers']);
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      
      // Show error message with more details
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add staff member';
      errorDiv.textContent = `❌ ${errorMessage}`;
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        document.body.removeChild(errorDiv);
      }, 3000);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers & Staff Management</h1>
          <p className="text-gray-600">Manage teaching staff and their assignments</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Staff
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search teachers by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers && teachers.length > 0 ? (
          teachers.map((teacher: any) => (
          <div key={teacher.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {teacher.firstName.charAt(0)}{teacher.lastName.charAt(0)}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {teacher.firstName} {teacher.lastName}
                </h3>
                <p className="text-sm text-gray-600 capitalize">{teacher.role}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-600">{teacher.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <span className="ml-2 text-gray-600">{teacher.phone}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Department:</span>
                <span className="ml-2 text-gray-600">{teacher.department}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Subjects:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {teacher.subjects && teacher.subjects.trim() ? (
                    typeof teacher.subjects === 'string' 
                      ? teacher.subjects.split(',').map((subject: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {subject.trim()}
                          </span>
                        ))
                      : Array.isArray(teacher.subjects) 
                        ? teacher.subjects.map((subject: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {subject}
                            </span>
                          ))
                        : null
                  ) : (
                    <span className="text-gray-500 text-xs">No subjects assigned</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
              <button className="text-green-600 hover:text-green-900 text-sm">View</button>
            </div>
          </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No teachers found</div>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Add your first staff member to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Staff Member</h3>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newTeacher.firstName}
                    onChange={(e) => setNewTeacher({...newTeacher, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newTeacher.lastName}
                    onChange={(e) => setNewTeacher({...newTeacher, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({...newTeacher, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newTeacher.role}
                    onChange={(e) => setNewTeacher({...newTeacher, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="teacher">Teacher</option>
                    <option value="principal">Principal</option>
                    <option value="vice_principal">Vice Principal</option>
                    <option value="head_teacher">Head Teacher</option>
                    <option value="admin">Admin Staff</option>
                    <option value="accountant">Accountant</option>
                    <option value="exam_officer">Exam Officer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={newTeacher.department}
                    onChange={(e) => setNewTeacher({...newTeacher, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Sciences">Sciences</option>
                    <option value="Languages">Languages</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Arts">Arts</option>
                    <option value="Administration">Administration</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma-separated)</label>
                <input
                  type="text"
                  value={newTeacher.subjects}
                  onChange={(e) => setNewTeacher({...newTeacher, subjects: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mathematics, Physics, Chemistry"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;