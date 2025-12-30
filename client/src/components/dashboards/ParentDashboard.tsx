import React, { useState } from 'react';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:4000',
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Child {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  classLevel: string;
  house: string;
}

interface ParentData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  children: Child[];
}

const ParentDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'children' | 'messages'>('overview');
  const [messageView, setMessageView] = useState<'inbox' | 'send'>('inbox');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [complaintData, setComplaintData] = useState({
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    category: 'general' as 'general' | 'academic' | 'administrative' | 'disciplinary' | 'facilities' | 'transport'
  });

  // Fetch parent data
  const { data: parentData, isLoading: isLoadingParent } = useQuery<ParentData>(
    'parentData',
    async () => {
      const response = await api.get('/api/parents/me');
      return response.data;
    }
  );

  // Fetch parent messages
  const { data: parentMessages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery(
    'parentMessages',
    async () => {
      const response = await api.get('/api/comments?role=parent');
      return response.data;
    }
  );

  const sendComplaint = async () => {
    if (!complaintData.subject.trim() || !complaintData.message.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    try {
      await api.post('/api/comments', {
        fromUser: parentData?.firstName + ' ' + parentData?.lastName,
        fromRole: 'parent',
        toUser: 'admin',
        toRole: 'admin',
        subject: complaintData.subject,
        message: complaintData.message,
        priority: complaintData.priority,
        category: complaintData.category
      });

      toast.success('Message sent successfully!');
      setComplaintData({
        subject: '',
        message: '',
        priority: 'normal',
        category: 'general'
      });
      setMessageView('inbox');
      refetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  if (isLoadingParent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          👨‍👩‍👧‍👦 Welcome, {parentData?.firstName} {parentData?.lastName}
        </h1>
        <p className="text-gray-600">Monitor your children's academic progress and school activities</p>
        {parentData?.email && (
          <p className="text-gray-500 text-sm mt-1">
            {parentData.email} {parentData.phone && `• ${parentData.phone}`}
          </p>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'overview' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveView('children')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'children' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👶 Child Details
          </button>
          <button
            onClick={() => setActiveView('messages')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'messages' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💬 Messages
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Children Overview */}
          {parentData?.children && parentData.children.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Your Children</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parentData.children.map((child) => (
                  <div key={child.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                        {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{child.firstName} {child.lastName}</h3>
                        <p className="text-sm text-gray-600">{child.admissionNumber}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Class:</span> {child.className}</p>
                      <p><span className="font-medium">Level:</span> {child.classLevel}</p>
                      <p><span className="font-medium">House:</span> {child.house}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedChild(child);
                        setActiveView('children');
                      }}
                      className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Dashboard
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Found</h3>
              <p className="text-gray-600">No children are currently linked to your parent account.</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveView('messages')}
                className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <EnvelopeIcon className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium">Send Message</span>
              </button>
              <button
                onClick={() => window.open('/', '_blank')}
                className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <GlobeAltIcon className="h-8 w-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium">School Homepage</span>
              </button>
              <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <CalendarDaysIcon className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium">Schedule Meeting</span>
              </button>
              <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <AcademicCapIcon className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium">Academic Reports</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Children Tab */}
      {activeView === 'children' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Child Details</h2>
          {selectedChild ? (
            <div>
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {selectedChild.firstName?.charAt(0)}{selectedChild.lastName?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedChild.firstName} {selectedChild.lastName}
                  </h3>
                  <p className="text-gray-600">
                    {selectedChild.admissionNumber} • {selectedChild.className} • {selectedChild.house}
                  </p>
                </div>
              </div>
              <p className="text-gray-600">Child dashboard details will be loaded here.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Child</h3>
              <p className="text-gray-600 mb-4">Choose a child from the overview to view their detailed information.</p>
              <button
                onClick={() => setActiveView('overview')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Overview
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeView === 'messages' && (
        <div className="space-y-6">
          {/* Messages Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Messages & Communication</h2>
            <p className="text-gray-600 mb-4">
              View replies from school administration and send new messages.
            </p>
            
            {/* Message Sub-tabs */}
            <div className="flex space-x-4">
              <button
                onClick={() => setMessageView('inbox')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  messageView === 'inbox' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📥 Inbox ({parentMessages?.length || 0})
              </button>
              <button
                onClick={() => setMessageView('send')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  messageView === 'send' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✉️ Send Message
              </button>
            </div>
          </div>

          {/* Inbox View */}
          {messageView === 'inbox' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Your Messages & Replies</h3>
              
              {messagesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading messages...</p>
                </div>
              ) : parentMessages && parentMessages.length > 0 ? (
                <div className="space-y-4">
                  {parentMessages.map((message: any) => (
                    <div key={message.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{message.subject}</h4>
                          <p className="text-sm text-gray-600">
                            To: {message.to} ({message.toRole}) • {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          message.reply ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {message.reply ? 'REPLIED' : 'PENDING'}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-700 mb-2"><strong>Your Message:</strong></p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{message.message}</p>
                      </div>
                      
                      {message.reply && (
                        <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-800">
                              📧 Reply from {message.repliedBy || 'Admin'}:
                            </span>
                            <span className="text-xs text-blue-600">
                              {message.repliedAt && new Date(message.repliedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-blue-700">{message.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Messages Yet</h4>
                  <p className="text-gray-600 mb-4">You haven't sent any messages to the school yet.</p>
                  <button
                    onClick={() => setMessageView('send')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send Your First Message
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Send Message View */}
          {messageView === 'send' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Send Message to School</h2>
              <p className="text-gray-600 mb-6">
                Send messages, complaints, or inquiries to the school administration.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={complaintData.category}
                      onChange={(e) => setComplaintData({...complaintData, category: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="academic">Academic Concern</option>
                      <option value="administrative">Administrative Issue</option>
                      <option value="disciplinary">Disciplinary Matter</option>
                      <option value="facilities">Facilities & Infrastructure</option>
                      <option value="transport">Transportation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={complaintData.priority}
                      onChange={(e) => setComplaintData({...complaintData, priority: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={complaintData.subject}
                    onChange={(e) => setComplaintData({...complaintData, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief subject of your message"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={complaintData.message}
                    onChange={(e) => setComplaintData({...complaintData, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={6}
                    placeholder="Detailed message or complaint..."
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setComplaintData({
                      subject: '',
                      message: '',
                      priority: 'normal',
                      category: 'general'
                    })}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Clear
                  </button>
                  <button
                    onClick={sendComplaint}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    <span>Send Message</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;