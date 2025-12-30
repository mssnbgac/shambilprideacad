import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Create axios instance for API calls
const API_BASE_URL = 'http://localhost:4000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Class {
  id: number;
  name: string;
  level: string;
  capacity: number;
  classTeacher?: number;
  classTeacherName?: string;
  classTeacherEmail?: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Teacher {
  id: number;
  name: string;
  email: string;
  office?: string;
  currentClass?: string;
}

const Classes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects'>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  // Form states
  const [classForm, setClassForm] = useState({
    name: '',
    level: '',
    capacity: 30,
    classTeacher: ''
  });
  
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes, teachersRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/classes/teachers/available')
      ]);
      
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);
      setError(null);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes', {
        ...classForm,
        classTeacher: classForm.classTeacher || null
      });
      setShowClassModal(false);
      resetClassForm();
      fetchData();
    } catch (err: any) {
      console.error('Create class error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create class');
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    
    try {
      await api.put(`/classes/${editingClass.id}`, {
        ...classForm,
        classTeacher: classForm.classTeacher || null
      });
      setShowClassModal(false);
      setEditingClass(null);
      resetClassForm();
      fetchData();
    } catch (err: any) {
      console.error('Update class error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update class');
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    
    try {
      await api.delete(`/classes/${id}`);
      fetchData();
    } catch (err: any) {
      console.error('Delete class error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete class');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subjects', subjectForm);
      setShowSubjectModal(false);
      resetSubjectForm();
      fetchData();
    } catch (err: any) {
      console.error('Create subject error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create subject');
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    
    try {
      await api.put(`/subjects/${editingSubject.id}`, subjectForm);
      setShowSubjectModal(false);
      setEditingSubject(null);
      resetSubjectForm();
      fetchData();
    } catch (err: any) {
      console.error('Update subject error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update subject');
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    
    try {
      await api.delete(`/subjects/${id}`);
      fetchData();
    } catch (err: any) {
      console.error('Delete subject error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete subject');
    }
  };

  const openEditClass = (classItem: Class) => {
    setEditingClass(classItem);
    setClassForm({
      name: classItem.name,
      level: classItem.level,
      capacity: classItem.capacity,
      classTeacher: classItem.classTeacher?.toString() || ''
    });
    setShowClassModal(true);
  };

  const openEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      description: subject.description || ''
    });
    setShowSubjectModal(true);
  };

  const resetClassForm = () => {
    setClassForm({
      name: '',
      level: '',
      capacity: 30,
      classTeacher: ''
    });
  };

  const resetSubjectForm = () => {
    setSubjectForm({
      name: '',
      code: '',
      description: ''
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes Management</h1>
        <p className="text-gray-600">Manage class sections and subjects</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'classes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Classes ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subjects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Subjects ({subjects.length})
          </button>
        </nav>
      </div>

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Class Sections</h2>
            <button
              onClick={() => {
                resetClassForm();
                setEditingClass(null);
                setShowClassModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add New Class
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <div key={classItem.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{classItem.name}</h3>
                    <p className="text-gray-600">{classItem.level}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditClass(classItem)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClass(classItem.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity:</span>
                    <span>{classItem.capacity} students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Students:</span>
                    <span>{classItem.studentCount}</span>
                  </div>
                  {classItem.classTeacherName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class Teacher:</span>
                      <span>{classItem.classTeacherName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {classes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No classes found. Create your first class to get started.
            </div>
          )}
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Subjects</h2>
            <button
              onClick={() => {
                resetSubjectForm();
                setEditingSubject(null);
                setShowSubjectModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add New Subject
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <div key={subject.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{subject.name}</h3>
                    <p className="text-gray-600 font-mono">{subject.code}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditSubject(subject)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {subject.description && (
                  <p className="text-sm text-gray-600">{subject.description}</p>
                )}
              </div>
            ))}
          </div>

          {subjects.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No subjects found. Create your first subject to get started.
            </div>
          )}
        </div>
      )}

      {/* Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </h3>
            
            <form onSubmit={editingClass ? handleUpdateClass : handleCreateClass}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level *
                  </label>
                  <select
                    value={classForm.level}
                    onChange={(e) => setClassForm({ ...classForm, level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Level</option>
                    <option value="Kindergarten">Kindergarten</option>
                    <option value="Nursery 1">Nursery 1</option>
                    <option value="Nursery 2">Nursery 2</option>
                    <option value="Primary 1">Primary 1</option>
                    <option value="Primary 2">Primary 2</option>
                    <option value="Primary 3">Primary 3</option>
                    <option value="Primary 4">Primary 4</option>
                    <option value="Primary 5">Primary 5</option>
                    <option value="Primary 6">Primary 6</option>
                    <option value="JSS 1">JSS 1</option>
                    <option value="JSS 2">JSS 2</option>
                    <option value="JSS 3">JSS 3</option>
                    <option value="SSS 1">SSS 1</option>
                    <option value="SSS 2">SSS 2</option>
                    <option value="SSS 3">SSS 3</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={classForm.capacity}
                    onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Teacher
                  </label>
                  <select
                    value={classForm.classTeacher}
                    onChange={(e) => setClassForm({ ...classForm, classTeacher: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Teacher (Optional)</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} {teacher.currentClass ? `(Currently: ${teacher.currentClass})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowClassModal(false);
                    setEditingClass(null);
                    resetClassForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingClass ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>
            
            <form onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., MATH, ENG, SCI"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional description of the subject"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubjectModal(false);
                    setEditingSubject(null);
                    resetSubjectForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSubject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;