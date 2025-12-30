import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import StudentSearch from './StudentSearch.tsx';
import { academicSessions } from '../utils/academicSessions.ts';

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface ResultEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialAcademicYear?: string;
  initialTerm?: string;
  preSelectedStudent?: any;
}

const ResultEntryForm: React.FC<ResultEntryFormProps> = ({ 
  isOpen, 
  onClose, 
  initialAcademicYear = '2024/2025',
  initialTerm = 'first',
  preSelectedStudent = null
}) => {
  console.log('🔄 ResultEntryForm component render - isOpen:', isOpen, 'timestamp:', Date.now());
  
  const [selectedStudent, setSelectedStudent] = useState<any>(preSelectedStudent);
  const [formData, setFormData] = useState({
    academicYear: initialAcademicYear,
    term: initialTerm,
    subjects: [] as any[],
    remarks: '',
    nextTermBegins: ''
  });

  const queryClient = useQueryClient();
  
  // Debug when component mounts/unmounts
  useEffect(() => {
    console.log('🚀 ResultEntryForm component mounted');
    return () => {
      console.log('💀 ResultEntryForm component unmounted');
    };
  }, []);
  
  // Debug when isOpen prop changes
  useEffect(() => {
    console.log('📝 ResultEntryForm: isOpen prop changed to:', isOpen);
  }, [isOpen]);

  // Update form data when initial values change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      academicYear: initialAcademicYear,
      term: initialTerm
    }));
  }, [initialAcademicYear, initialTerm]);

  // Update selected student when preSelectedStudent changes
  useEffect(() => {
    if (preSelectedStudent) {
      console.log('Pre-selected student set:', preSelectedStudent);
      setSelectedStudent(preSelectedStudent);
    }
  }, [preSelectedStudent]);

  const { data: subjects } = useQuery<Subject[]>(
    'subjects',
    () => axios.get('http://localhost:4000/api/subjects').then(res => res.data)
  );

  // Fetch existing results for the selected student
  const { data: existingResults, refetch: refetchResults } = useQuery(
    ['studentResults', selectedStudent?._id, formData.academicYear, formData.term],
    () => axios.get(`http://localhost:4000/api/results/student/${selectedStudent._id}?academicYear=${formData.academicYear}&term=${formData.term}`).then(res => res.data),
    {
      enabled: !!selectedStudent?._id && !!formData.academicYear && !!formData.term,
      retry: 1,
      onSuccess: (data) => {
        console.log('Existing results loaded:', data);
        if (data.hasResults && data.subjects.length > 0) {
          // Pre-populate form with existing results
          setFormData(prev => ({
            ...prev,
            subjects: data.subjects.map((sr: any) => ({
              subject: sr.subject._id,
              ca1: sr.ca1,
              ca2: sr.ca2,
              exam: sr.exam
            })),
            remarks: data.results.remarks || ''
          }));
        }
      },
      onError: (error) => {
        console.error('Error loading existing results:', error);
        // Don't close the form on error, just log it
      }
    }
  );

  const submitResult = useMutation(
    (data: any) => axios.post('http://localhost:4000/api/results', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('results');
        // Don't close the form, just reset it for next entry
        resetFormForNextEntry();
        alert('Result submitted successfully! You can now enter results for another student.');
      },
      onError: (error) => {
        console.error('Error submitting result:', error);
        alert('Error submitting result. Please try again.');
      }
    }
  );

  // Removed unused resetForm function

  const resetFormForNextEntry = () => {
    // Reset form but keep it open for next student
    setSelectedStudent(null);
    setFormData({
      academicYear: formData.academicYear, // Keep current academic year
      term: formData.term, // Keep current term
      subjects: [],
      remarks: '',
      nextTermBegins: ''
    });
  };

  const addSubject = () => {
    setFormData({
      ...formData,
      subjects: [
        ...formData.subjects,
        {
          subject: '',
          ca1: 0,
          ca2: 0,
          exam: 0
        }
      ]
    });
  };

  const removeSubject = (index: number) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter((_, i) => i !== index)
    });
  };

  const updateSubject = (index: number, field: string, value: any) => {
    const updatedSubjects = [...formData.subjects];
    updatedSubjects[index] = {
      ...updatedSubjects[index],
      [field]: value
    };
    setFormData({
      ...formData,
      subjects: updatedSubjects
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Please select a student first');
      return;
    }
    if (formData.subjects.length === 0) {
      alert('Please add at least one subject');
      return;
    }

    // Show confirmation if updating existing results
    if (existingResults?.hasResults) {
      const isPublished = existingResults.results.published;
      const confirmMessage = isPublished 
        ? `⚠️ WARNING: You are about to update PUBLISHED results for ${selectedStudent.user.firstName} ${selectedStudent.user.lastName}.\n\nAcademic Year: ${formData.academicYear}\nTerm: ${formData.term}\n\nThis will modify the student's official academic record. Are you sure you want to continue?`
        : `You are about to update existing results for ${selectedStudent.user.firstName} ${selectedStudent.user.lastName}.\n\nAcademic Year: ${formData.academicYear}\nTerm: ${formData.term}\n\nDo you want to continue?`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    submitResult.mutate({
      student: selectedStudent._id,
      class: selectedStudent.class._id,
      ...formData
    });
  };

  console.log('ResultEntryForm render - isOpen:', isOpen, 'selectedStudent:', selectedStudent);
  console.log('ResultEntryForm props:', { isOpen, initialAcademicYear, initialTerm, preSelectedStudent });
  
  if (!isOpen) {
    console.log('Form not open, returning null');
    return null;
  }
  
  console.log('Form is open, rendering form content');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Enter Student Results</h2>
            <button
              onClick={() => {
                console.log('Form close button clicked');
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Search - Only show if no pre-selected student */}
            {!preSelectedStudent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Student by Admission Number
                </label>
                <StudentSearch
                  onStudentFound={setSelectedStudent}
                  placeholder="Enter admission number to search..."
                />
              </div>
            )}

            {selectedStudent && (
              <>
                {/* Student Information Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Student Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-blue-700">Name:</span>
                      <p className="text-gray-900">{selectedStudent.user.firstName} {selectedStudent.user.lastName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Admission Number:</span>
                      <p className="text-gray-900">{selectedStudent.admissionNumber}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Class:</span>
                      <p className="text-gray-900">{selectedStudent.class.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">House:</span>
                      <p className="text-gray-900">{selectedStudent.house || 'Not assigned'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Email:</span>
                      <p className="text-gray-900">{selectedStudent.user.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Phone:</span>
                      <p className="text-gray-900">{selectedStudent.user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Loading indicator for existing results */}
                {selectedStudent && !existingResults && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Checking for existing results...</span>
                    </div>
                  </div>
                )}

                {/* Existing Results Display */}
                {existingResults?.hasResults && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                      Existing Results for {formData.academicYear} - {formData.term.charAt(0).toUpperCase() + formData.term.slice(1)} Term
                    </h3>
                    <div className="mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-yellow-700">Total Score:</span>
                          <span className="ml-2 text-gray-900">{existingResults.results.totalScore}</span>
                        </div>
                        <div>
                          <span className="font-medium text-yellow-700">Average:</span>
                          <span className="ml-2 text-gray-900">{existingResults.results.averageScore?.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="font-medium text-yellow-700">Grade:</span>
                          <span className="ml-2 text-gray-900">{existingResults.results.overallGrade}</span>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-yellow-300">
                            <th className="text-left py-2 text-yellow-800">Subject</th>
                            <th className="text-center py-2 text-yellow-800">CA1</th>
                            <th className="text-center py-2 text-yellow-800">CA2</th>
                            <th className="text-center py-2 text-yellow-800">Exam</th>
                            <th className="text-center py-2 text-yellow-800">Total</th>
                            <th className="text-center py-2 text-yellow-800">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {existingResults.subjects.map((sr: any, index: number) => (
                            <tr key={sr.id} className={index % 2 === 0 ? 'bg-yellow-25' : 'bg-white'}>
                              <td className="py-2 text-gray-900">{sr.subject.name}</td>
                              <td className="text-center py-2 text-gray-900">{sr.ca1}</td>
                              <td className="text-center py-2 text-gray-900">{sr.ca2}</td>
                              <td className="text-center py-2 text-gray-900">{sr.exam}</td>
                              <td className="text-center py-2 font-medium text-gray-900">{sr.total}</td>
                              <td className="text-center py-2 font-medium text-gray-900">{sr.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-sm text-yellow-700">
                      <strong>Note:</strong> The form below is pre-filled with existing scores. You can modify them and submit to update the results.
                      {existingResults.results.published && (
                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                          <strong>⚠️ Warning:</strong> These results have already been published. Any changes will update the published results.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No existing results message */}
                {existingResults && !existingResults.hasResults && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      New Results Entry
                    </h3>
                    <p className="text-green-700">
                      No existing results found for {formData.academicYear} - {formData.term.charAt(0).toUpperCase() + formData.term.slice(1)} Term. 
                      You are creating new results for this student.
                    </p>
                  </div>
                )}

                {/* Academic Year and Term */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year
                      {preSelectedStudent && <span className="text-xs text-blue-600 ml-1">(Set from dashboard)</span>}
                    </label>
                    <select
                      value={formData.academicYear}
                      onChange={(e) => {
                        setFormData({ ...formData, academicYear: e.target.value });
                        setTimeout(() => refetchResults(), 100);
                      }}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 ${preSelectedStudent ? 'bg-blue-50 cursor-not-allowed' : ''}`}
                      disabled={!!preSelectedStudent}
                    >
                      {academicSessions.map(session => (
                        <option key={session} value={session}>{session}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Term
                      {preSelectedStudent && <span className="text-xs text-blue-600 ml-1">(Set from dashboard)</span>}
                    </label>
                    <select
                      value={formData.term}
                      onChange={(e) => {
                        setFormData({ ...formData, term: e.target.value });
                        setTimeout(() => refetchResults(), 100);
                      }}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 ${preSelectedStudent ? 'bg-blue-50 cursor-not-allowed' : ''}`}
                      disabled={!!preSelectedStudent}
                    >
                      <option value="first">First Term</option>
                      <option value="second">Second Term</option>
                      <option value="third">Third Term</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next Term Begins
                    </label>
                    <input
                      type="date"
                      value={formData.nextTermBegins}
                      onChange={(e) => setFormData({ ...formData, nextTermBegins: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                {/* Subjects */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Subject Scores</h3>
                    <button
                      type="button"
                      onClick={addSubject}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Subject
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.subjects.map((subjectData, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subject
                            </label>
                            <select
                              value={subjectData.subject}
                              onChange={(e) => updateSubject(index, 'subject', e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              required
                            >
                              <option value="">Select Subject</option>
                              {subjects?.map(subject => (
                                <option key={subject._id} value={subject._id}>
                                  {subject.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              1st CA (20)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={subjectData.ca1}
                              onChange={(e) => updateSubject(index, 'ca1', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              2nd CA (20)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={subjectData.ca2}
                              onChange={(e) => updateSubject(index, 'ca2', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Exam (60)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="60"
                              value={subjectData.exam}
                              onChange={(e) => updateSubject(index, 'exam', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              required
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => removeSubject(index)}
                              className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                              <TrashIcon className="h-4 w-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Total: {subjectData.ca1 + subjectData.ca2 + subjectData.exam}/100
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher's Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter remarks about student's performance..."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Close form button clicked');
                      onClose();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close Form
                  </button>
                  <button
                    type="button"
                    onClick={resetFormForNextEntry}
                    className="px-4 py-2 border border-blue-300 rounded-md text-blue-700 hover:bg-blue-50"
                  >
                    Clear for Next Student
                  </button>
                  <button
                    type="submit"
                    disabled={submitResult.isLoading}
                    className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                      existingResults?.hasResults 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {submitResult.isLoading 
                      ? 'Submitting...' 
                      : existingResults?.hasResults 
                        ? 'Update Results' 
                        : 'Submit Results'
                    }
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResultEntryForm;