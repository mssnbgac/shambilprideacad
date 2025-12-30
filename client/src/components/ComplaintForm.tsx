import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface ComplaintFormProps {
  isOpen: boolean;
  onClose: () => void;
  recipientType?: 'admin' | 'exam_officer';
}

const ComplaintForm: React.FC<ComplaintFormProps> = ({ isOpen, onClose, recipientType = 'admin' }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic',
    priority: 'medium'
  });

  const queryClient = useQueryClient();

  const submitComplaint = useMutation(
    (data: any) => axios.post('/api/comments', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('comments');
        queryClient.invalidateQueries('my-comments');
        onClose();
        setFormData({
          title: '',
          description: '',
          category: 'academic',
          priority: 'medium'
        });
        alert('Comment submitted successfully!');
      },
      onError: (error) => {
        console.error('Error submitting comment:', error);
        alert('Error submitting comment. Please try again.');
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitComplaint.mutate({
      title: formData.title,
      message: formData.description,
      recipient: recipientType,
      category: formData.category,
      priority: formData.priority
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">General inquiries, complaints, or administrative requests</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* User Information Section */}
        {user && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">📋 Your Information</h3>
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">Name:</span> {user.firstName} {user.lastName}</div>
              <div><span className="font-medium">Admission No:</span> {(user as any).admissionNumber || 'Loading...'}</div>
              <div><span className="font-medium">Class:</span> {(user as any).className || 'Loading...'}</div>
              <div><span className="font-medium">Session:</span> 2024/2025 - first term</div>
            </div>
          </div>
        )}

        {/* Priority Level Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📌 Priority Level</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="priority"
                value="low"
                checked={formData.priority === 'low'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-green-600">🟢</span>
              <span className="ml-2 text-sm">Low - General inquiry or suggestion</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="priority"
                value="medium"
                checked={formData.priority === 'medium'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-yellow-600">🟡</span>
              <span className="ml-2 text-sm">Normal - Standard request or concern</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="priority"
                value="high"
                checked={formData.priority === 'high'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-red-600">🔴</span>
              <span className="ml-2 text-sm">High - Urgent issue requiring immediate attention</span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📝 Subject
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength={100}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the issue"
            />
            <div className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              💬 Message
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed description of your message..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitComplaint.isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitComplaint.isLoading ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintForm;