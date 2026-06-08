import React, { useEffect, useState, useRef } from 'react';
// Navigate ko yahan import karna zaroori hai
import { Outlet, useNavigate, Navigate } from 'react-router-dom'; 
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { Phone, PhoneOff, Video } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

export const DashboardLayout: React.FC = () => {
  // isAuthenticated aur isLoading ko extract kar liya hai
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [incomingCall, setIncomingCall] = useState<{callerName: string, roomId: string, callerId: string} | null>(null);
  const [ringtone] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3'));
  const ringtoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user && user.id) {
      socket.emit('register', user.id);

      socket.on('incoming-call', (data) => {
        setIncomingCall(data);
        ringtone.loop = true;
        ringtone.play().catch(err => console.log(err));

        ringtoneTimeoutRef.current = setTimeout(() => {
          ringtone.pause(); ringtone.currentTime = 0;
          setIncomingCall(null);
          toast.error(`Missed video call from ${data.callerName}.`);
          socket.emit('call-no-answer', { roomId: data.roomId, targetName: user.name });
        }, 30000); 
      });

      socket.on('call-cancelled', () => {
        if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
        ringtone.pause(); ringtone.currentTime = 0;
        setIncomingCall(null);
        toast.error('Caller ended the call.');
      });
    }

    return () => {
      socket.off('incoming-call');
      socket.off('call-cancelled');
      ringtone.pause(); ringtone.currentTime = 0;
      if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
    };
  }, [user, ringtone]);

  const handleAcceptCall = () => {
    if (incomingCall) {
      if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
      const roomId = incomingCall.roomId;
      ringtone.pause(); ringtone.currentTime = 0;
      setIncomingCall(null);
      navigate(`/meeting/${roomId}`);
    }
  };

  const handleDeclineCall = () => {
    if (incomingCall) {
      if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
      socket.emit('call-declined', { roomId: incomingCall.roomId, targetName: user?.name });
      ringtone.pause(); ringtone.currentTime = 0;
      setIncomingCall(null);
    }
  };

  // --- 1. LOADING STATE PROTECTOR ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#288DFF] mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Securing connection...</p>
      </div>
    );
  }

  // --- 2. ROUTE GUARD (Un-authorized URL Block) ---
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // --- 3. ORIGINAL DASHBOARD LAYOUT ---
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* PREMIUM INCOMING CALL POPUP */}
      {incomingCall && (
        <div className="fixed bottom-8 right-8 bg-white p-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 z-50 w-80 transform transition-all duration-500 ease-out translate-y-0 opacity-100">
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                <Video size={28} className="text-white" />
              </div>
              <div className="absolute inset-0 border-4 border-primary-400 rounded-full animate-ping opacity-20"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{incomingCall.callerName}</h3>
            <p className="text-sm text-gray-500 mb-5 font-medium">Incoming Video Call...</p>
            <div className="flex w-full justify-center space-x-4">
              <button onClick={handleDeclineCall} className="flex flex-1 justify-center items-center px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors font-medium">
                <PhoneOff size={18} className="mr-2" /> Decline
              </button>
              <button onClick={handleAcceptCall} className="flex flex-1 justify-center items-center px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors shadow-md shadow-green-200 font-medium">
                <Phone size={18} className="mr-2" /> Accept
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};