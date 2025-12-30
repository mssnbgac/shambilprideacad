import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  AcademicCapIcon, 
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TeacherDashboardProps {
  user: User;
}

interface TeacherData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  employeeId?: string;
  subjects?: string;
  qualification?: string;
  experience?: string;
  office?: string;
  dateOfBirth?: string;
  address?: string;
  salary?: number;
}

interface TeacherStats {
  totalMessages: number;
  pendingReplies: number;
  resolvedComplaints: number;
  unreadMessages: number;
}

interface Message {
  id: number;
  subject: string;
  message: string;
  recipient: string;
  status: string;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageData, setMessageData] = useState({
    recipient: 'admin',
    subject: '',
    message: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchTeacherData();
    fetchTeacherStats();
    fetchMessages();
  }, []);

  const fetchTeacherData = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/dashboard/teacher/current', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeacherData(data.teacher || data);
      } else {
        console.error('Failed to fetch teacher data');
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherStats = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/dashboard/teacher/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Set default stats if endpoint doesn't exist
        setStats({
          totalMessages: 0,
          pendingReplies: 0,
          resolvedComplaints: 0,
          unreadMessages: 0
        });
      }
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      setStats({
        totalMessages: 0,
        pendingReplies: 0,
        resolvedComplaints: 0,
        unreadMessages: 0
      });
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/teacher/messages', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    try {
      if (!messageData.subject || !messageData.message) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await fetch('http://localhost:4000/api/teacher/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        alert('Message sent successfully!');
        setShowMessageForm(false);
        setMessageData({
          recipient: 'admin',
          subject: '',
          message: '',
          priority: 'normal'
        });
        fetchMessages();
        fetchTeacherStats();
      } else {
        alert('Error sending message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          👨‍🏫 Welcome, {teacherData?.firstName || user?.firstName} {teacherData?.lastName || user?.lastName}
        </h1>
        <p className="text-blue-100 mb-4">
          Welcome back! Here's what's happening at Shambil Pride Academy.
        </p>
        
        {teacherData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Employee ID:</span>
                <span className="ml-2">{teacherData.employeeId || 'Not assigned'}</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Role:</span>
                <span className="ml-2 capitalize">{teacherData.role}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'dashboard' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('messages')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'messages' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💬 Messages
          </button>
          <button
            onClick={() => setActiveView('profile')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'profile' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👤 My Profile
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalMessages || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Replies</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.pendingReplies || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Resolved Issues</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.resolvedComplaints || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.unreadMessages || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setShowMessageForm(true)}
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <PaperAirplaneIcon className="h-6 w-6 text-blue-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-blue-900">Send Message</p>
                  <p className="text-sm text-blue-600">Contact admin or exam officer</p>
                </div>
              </button>

              <button
                onClick={() => setActiveView('messages')}
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-green-900">View Messages</p>
                  <p className="text-sm text-green-600">Check replies and conversations</p>
                </div>
              </button>

              <button
                onClick={() => setActiveView('profile')}
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <UserIcon className="h-6 w-6 text-purple-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-purple-900">Update Profile</p>
                  <p className="text-sm text-purple-600">Edit your information</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages View */}
      {activeView === 'messages' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">💬 Messages & Communications</h3>
              <button
                onClick={() => setShowMessageForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Send New Message
              </button>
            </div>
            
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{message.subject}</h4>
                        <p className="text-sm text-gray-600">To: {message.recipient}</p>
                        <p className="text-sm text-gray-500">{new Date(message.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        message.status === 'replied' ? 'bg-green-100 text-green-800' :
                        message.status === 'read' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {message.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{message.message}</p>
                    {message.reply && (
                      <div className="bg-gray-50 p-3 rounded-lg mt-3">
                        <p className="text-sm font-medium text-gray-900">Reply:</p>
                        <p className="text-gray-700">{message.reply}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Replied on: {new Date(message.repliedAt!).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No messages yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Send your first message to admin or exam officer
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile View */}
      {activeView === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">👤 My Profile</h3>
          
          {teacherData ? (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {teacherData.firstName} {teacherData.lastName}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {teacherData.employeeId || 'Not assigned'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Email</label>
                    <p className="text-lg font-semibold text-gray-900">{teacherData.email}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {teacherData.phone || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Professional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Role</label>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{teacherData.role}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Subjects</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {teacherData.subjects || 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Qualification</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {teacherData.qualification || 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-600">Experience</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {teacherData.experience || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(teacherData.office || teacherData.address) && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teacherData.office && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-600">Office</label>
                        <p className="text-lg font-semibold text-gray-900">{teacherData.office}</p>
                      </div>
                    )}
                    
                    {teacherData.address && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-600">Address</label>
                        <p className="text-lg font-semibold text-gray-900">{teacherData.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading profile information...</p>
            </div>
          )}
        </div>
      )}

      {/* Message Form Modal */}
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
                  <option value="exam_officer">Exam Officer</option>
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

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-600">
                  💡 <strong>Tip:</strong> Be clear and specific in your message. Include relevant details to help admin/exam officer understand and respond effectively.
                </p>
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
    </div>
  );
};

export default TeacherDashboard;