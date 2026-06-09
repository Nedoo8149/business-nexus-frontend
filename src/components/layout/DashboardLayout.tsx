import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Navigate } from 'react-router-dom'; 
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../socket'; 
import { PhoneCall, Phone, PhoneOff } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [incomingCall, setIncomingCall] = useState<{
    isIncoming: boolean;
    callerName?: string;
    roomId?: string;
    type?: string;
    callerDp?: string;
  } | null>(null);

  useEffect(() => {
    if (user && user.id) {
      socket.emit('register', user.id);

      const handleIncoming = (data: any) => {
        let extName = data.callerName || 'User';
        let extType = 'video';
        let extDp = '';

        if (data.callerName && data.callerName.includes('___')) {
          const parts = data.callerName.split('___');
          extName = parts[0];
          extType = parts[1];
          extDp = decodeURIComponent(parts[2] || '');
        } else if (data.type === 'audio') {
          extType = 'audio';
        }

        setIncomingCall({
          isIncoming: true,
          callerName: extName,
          roomId: data.roomId,
          type: extType,
          callerDp: extDp
        });
      };

      const handleCancel = () => setIncomingCall(null);

      socket.on('incoming-call', handleIncoming);
      socket.on('call-cancelled', handleCancel);
      socket.on('call-declined', handleCancel);

      return () => {
        socket.off('incoming-call', handleIncoming);
        socket.off('call-cancelled', handleCancel);
        socket.off('call-declined', handleCancel);
      };
    }
  }, [user]);

  const acceptCall = () => {
    if (!incomingCall?.roomId) return;
    const safeType = incomingCall.type === 'audio' ? 'audio' : 'video';
    const roomId = incomingCall.roomId;
    const callerName = encodeURIComponent(incomingCall.callerName || '');
    const callerDp = encodeURIComponent(incomingCall.callerDp || '');
    
    setIncomingCall(null);
    navigate(`/meeting/${roomId}?type=${safeType}&role=receiver&name=${callerName}&dp=${callerDp}`);
  };

  const declineCall = () => {
    if (!incomingCall?.roomId) return;
    socket.emit('call-declined', { roomId: incomingCall.roomId, targetName: user?.name });
    setIncomingCall(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      
      {incomingCall?.isIncoming && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] animate-bounce-in transition-all duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white pl-2 pr-3 py-2 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700/50">
            
            <div className="flex items-center gap-3">
              {incomingCall.callerDp ? (
                // 🔥 Fallback Added!
                <img 
                  src={incomingCall.callerDp} 
                  alt="Caller DP" 
                  onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(incomingCall.callerName || 'U')}&background=random&color=fff`; }}
                  className="w-12 h-12 rounded-full border-2 border-green-500 animate-pulse object-cover bg-white" 
                />
              ) : (
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                  <PhoneCall size={20} className="text-green-400" />
                </div>
              )}
              <div className="flex flex-col pr-4">
                <span className="font-semibold text-sm leading-tight tracking-wide">{incomingCall.callerName}</span>
                <span className="text-[11px] text-slate-300 font-medium capitalize">{incomingCall.type} Call...</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
              <button onClick={declineCall} className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                <PhoneOff size={18} />
              </button>
              <button onClick={acceptCall} className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Phone size={18} className="animate-pulse" />
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

      <style>{`
        @keyframes bounceIn {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          60% { transform: translate(-50%, 10%); opacity: 1; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
};