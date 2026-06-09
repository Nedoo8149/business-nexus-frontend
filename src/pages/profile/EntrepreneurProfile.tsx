import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Calendar, Building2, MapPin, UserCircle, FileText, DollarSign, Send, Video } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { findUserById } from '../../data/users';
import { createCollaborationRequest, getRequestsFromInvestor } from '../../data/collaborationRequests';
import API from '../../api';
import { scheduleMeeting } from '../../authService';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [entrepreneur, setEntrepreneur] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Meeting Modal State
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  
    useEffect(() => {
    const fetchEntrepreneurData = async () => {
      setIsLoading(true);
      
      // 1. Pehle check karein agar logged-in user apni hi profile dekh raha hai
      if (currentUser && currentUser.id === id) {
        const currentAuthUser = currentUser as any; 
        
        setEntrepreneur({
          ...currentAuthUser,
          id: currentAuthUser.id || id,
          name: currentAuthUser.name || currentAuthUser.email?.split('@')[0] || "My Profile",
          startupName: currentAuthUser.startupName || "My Awesome Startup", 
          industry: currentAuthUser.industry || "Technology",
          location: currentAuthUser.location || "Pakistan",
          foundedYear: currentAuthUser.foundedYear || new Date().getFullYear(),
          teamSize: currentAuthUser.teamSize || 1,
          bio: currentAuthUser.bio || "Welcome to my entrepreneur profile! I am currently setting up my details.",
          pitchSummary: currentAuthUser.pitchSummary || "We are solving complex problems using modern technology.",
          fundingNeeded: currentAuthUser.fundingNeeded || "$50,000"
        });
        setIsLoading(false);
        return;
      }

      try {
        const response = await API.get(`/users/${id}`);
        const userData = response.data;
        
        setEntrepreneur({
          ...userData,
          id: userData._id || userData.id,
          name: userData.name || userData.email.split('@')[0],
          startupName: userData.startupName || "New Startup",
          industry: userData.industry || "Technology",
          location: userData.location || "Global",
          foundedYear: userData.foundedYear || new Date().getFullYear(),
          teamSize: userData.teamSize || 1,
          bio: userData.bio || "No biography provided yet.",
          pitchSummary: userData.pitchSummary || "Solving complex market problems with innovative solutions.",
          fundingNeeded: userData.fundingNeeded || "$100K"
        });

      } catch (error) {
        console.error("Failed to fetch real entrepreneur from DB:", error);
        
        const mockUser = findUserById(id || '');
        if (mockUser) {
          setEntrepreneur(mockUser);
        } else {
          setEntrepreneur(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntrepreneurData();
  }, [id, currentUser?.id]); // ✅ FIX: Poora `currentUser` hata kar sirf `currentUser?.id` lagaya
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    );
  }
  
  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Entrepreneur not found</h2>
        <p className="text-gray-600 mt-2">The entrepreneur profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard/investor">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }
  
  const isCurrentUser = currentUser?.id === entrepreneur.id;
  const isInvestor = currentUser?.role === 'investor';
  
  const hasRequestedCollaboration = isInvestor && id && currentUser?.id
    ? getRequestsFromInvestor(currentUser.id).some(req => req.entrepreneurId === id)
    : false;
  
  const handleStartVideoCall = () => {
    if (!currentUser || !id) return;
    
    const uniqueRoomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    
    socket.emit('initiate-call', {
      targetUserId: id,
      callerId: currentUser.id,
      callerName: currentUser.name,
      roomId: uniqueRoomId
    });

    navigate(`/meeting/${uniqueRoomId}`);
  };

  const handleSendRequest = () => {
    if (isInvestor && currentUser && id) {
      createCollaborationRequest(
        currentUser.id,
        id,
        `I'm interested in learning more about ${entrepreneur.startupName} and would like to explore potential investment opportunities.`
      );
      window.location.reload();
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingDate || !meetingTime) {
      toast.error("Please select both date and time");
      return;
    }

    setIsScheduling(true);
    try {
      await scheduleMeeting({
        entrepreneurId: id,
        title: `Meeting with ${entrepreneur.name}`,
        date: meetingDate,
        time: meetingTime
      });
      toast.success("Meeting Scheduled Successfully!");
      setShowMeetingModal(false);
      setMeetingDate('');
      setMeetingTime('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to schedule meeting");
    } finally {
      setIsScheduling(false);
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* ---------------- MEETING MODAL ---------------- */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl font-bold mb-4">Schedule a Meeting</h2>
            <form onSubmit={handleScheduleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} 
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Time</label>
                <input 
                  type="time" 
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowMeetingModal(false)} type="button">Cancel</Button>
                <Button type="submit" isLoading={isScheduling}>Confirm Slot</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ------------------------------------------------ */}

      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={entrepreneur.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entrepreneur.name || 'User')}&background=random`}
              alt={entrepreneur.name}
              size="xl"
              status={entrepreneur.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{entrepreneur.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Founder at {entrepreneur.startupName}
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="primary">{entrepreneur.industry}</Badge>
                <Badge variant="gray">
                  <MapPin size={14} className="mr-1" />
                  {entrepreneur.location}
                </Badge>
                <Badge variant="accent">
                  <Calendar size={14} className="mr-1" />
                  Founded {entrepreneur.foundedYear}
                </Badge>
                <Badge variant="secondary">
                  <Users size={14} className="mr-1" />
                  {entrepreneur.teamSize} team members
                </Badge>
              </div>
            </div>
          </div>
          
          {/* ========== 2x2 ACTION BUTTONS GRID ========== */}
          <div className="mt-6 sm:mt-0">
            {!isCurrentUser && isInvestor && (
              <div className="grid grid-cols-2 gap-3 min-w-[260px] sm:min-w-[300px]">
                {/* Row 1, Col 1: Message */}
                <Link to={`/chat/${entrepreneur._id || entrepreneur.id}`} className="block">
                  <Button
                    variant="outline"
                    leftIcon={<MessageCircle size={16} />}
                    className="w-full justify-center py-2.5 px-3 text-sm"
                  >
                    Message
                  </Button>
                </Link>

                {/* Row 1, Col 2: Video Call */}
                <Button
                  style={{ backgroundColor: '#288DFF', color: 'white', borderColor: '#288DFF' }}
                  leftIcon={<Video size={16} />}
                  onClick={handleStartVideoCall}
                  className="w-full justify-center py-2.5 px-3 text-sm whitespace-nowrap"
                >
                  Video Call
                </Button>

                {/* Row 2, Col 1: Meeting */}
                <Button
                  variant="outline"
                  leftIcon={<Calendar size={16} />}
                  onClick={() => setShowMeetingModal(true)}
                  className="w-full justify-center py-2.5 px-3 text-sm"
                >
                  Meeting
                </Button>

                {/* Row 2, Col 2: Collaborate */}
                <Button
                  leftIcon={<Send size={16} />}
                  disabled={hasRequestedCollaboration}
                  onClick={handleSendRequest}
                  className="w-full justify-center py-2.5 px-3 text-sm whitespace-nowrap"
                >
                  {hasRequestedCollaboration ? 'Sent' : 'Collaborate'}
                </Button>
              </div>
            )}

            {/* Non-investor viewing: only Message */}
            {!isCurrentUser && !isInvestor && (
              <Link to={`/chat/${entrepreneur._id || entrepreneur.id}`}>
              <Button
                variant="outline"
                leftIcon={<MessageCircle size={18} />}
              >
                Message
              </Button>
            </Link>
                        )}

            {/* Current user: Edit Profile */}
            {isCurrentUser && (
              <Button
                variant="outline"
                leftIcon={<UserCircle size={18} />}
              >
                Edit Profile
              </Button>
            )}
          </div>
          {/* ========== END BUTTONS GRID ========== */}
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">{entrepreneur.bio}</p>
            </CardBody>
          </Card>
          
          {/* Startup Description */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Startup Overview</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900">Problem Statement</h3>
                  <p className="text-gray-700 mt-1">
                    {entrepreneur.pitchSummary ? entrepreneur.pitchSummary.split('.')[0] + '.' : 'Identifying key market problems.'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900">Solution</h3>
                  <p className="text-gray-700 mt-1">
                    {entrepreneur.pitchSummary}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900">Market Opportunity</h3>
                  <p className="text-gray-700 mt-1">
                    The {entrepreneur.industry} market is experiencing significant growth, with a projected CAGR of 14.5% through 2027. Our solution addresses key pain points in this expanding market.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900">Competitive Advantage</h3>
                  <p className="text-gray-700 mt-1">
                    Unlike our competitors, we offer a unique approach that combines innovative technology with deep industry expertise, resulting in superior outcomes for our customers.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Team */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Team</h2>
              <span className="text-sm text-gray-500">{entrepreneur.teamSize} members</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center p-3 border border-gray-200 rounded-md">
                  <Avatar
                    src={entrepreneur.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entrepreneur.name || 'User')}&background=random`}
                    alt={entrepreneur.name}
                    size="md"
                    className="mr-3"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{entrepreneur.name}</h3>
                    <p className="text-xs text-gray-500">Founder & CEO</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 border border-gray-200 rounded-md">
                  <Avatar
                    src="https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg"
                    alt="Team Member"
                    size="md"
                    className="mr-3"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Alex Johnson</h3>
                    <p className="text-xs text-gray-500">CTO</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 border border-gray-200 rounded-md">
                  <Avatar
                    src="https://images.pexels.com/photos/773371/pexels-photo-773371.jpeg"
                    alt="Team Member"
                    size="md"
                    className="mr-3"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Jessica Chen</h3>
                    <p className="text-xs text-gray-500">Head of Product</p>
                  </div>
                </div>
                
                {entrepreneur.teamSize > 3 && (
                  <div className="flex items-center justify-center p-3 border border-dashed border-gray-200 rounded-md">
                    <p className="text-sm text-gray-500">+ {entrepreneur.teamSize - 3} more team members</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Funding Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Funding</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Current Round</span>
                  <div className="flex items-center mt-1">
                    <DollarSign size={18} className="text-accent-600 mr-1" />
                    <p className="text-lg font-semibold text-gray-900">{entrepreneur.fundingNeeded}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Valuation</span>
                  <p className="text-md font-medium text-gray-900">$8M - $12M</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Previous Funding</span>
                  <p className="text-md font-medium text-gray-900">$750K Seed (2022)</p>
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Funding Timeline</span>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Pre-seed</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Completed</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Seed</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Completed</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Series A</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">In Progress</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Documents */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Documents</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-primary-50 rounded-md mr-3">
                    <FileText size={18} className="text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Pitch Deck</h3>
                    <p className="text-xs text-gray-500">Updated 2 months ago</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
                
                <div className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-primary-50 rounded-md mr-3">
                    <FileText size={18} className="text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Business Plan</h3>
                    <p className="text-xs text-gray-500">Updated 1 month ago</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
                
                <div className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-primary-50 rounded-md mr-3">
                    <FileText size={18} className="text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Financial Projections</h3>
                    <p className="text-xs text-gray-500">Updated 2 weeks ago</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
              
              {!isCurrentUser && isInvestor && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Request access to detailed documents and financials by sending a collaboration request.
                  </p>
                  
                  {!hasRequestedCollaboration ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={handleSendRequest}
                    >
                      Request Collaboration
                    </Button>
                  ) : (
                    <Button
                      className="mt-3 w-full"
                      disabled
                    >
                      Request Sent
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};