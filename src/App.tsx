import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { socket } from './socket';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Dashboard Pages
import { EntrepreneurDashboard } from './pages/dashboard/EntrepreneurDashboard';
import { InvestorDashboard } from './pages/dashboard/InvestorDashboard';

// Profile Pages
import { EntrepreneurProfile } from './pages/profile/EntrepreneurProfile';
import { InvestorProfile } from './pages/profile/InvestorProfile';

// Feature Pages
import { InvestorsPage } from './pages/investors/InvestorsPage';
import { EntrepreneursPage } from './pages/entrepreneurs/EntrepreneursPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { HelpPage } from './pages/help/HelpPage';
import { DealsPage } from './pages/deals/DealsPage';

// Chat & Call Pages
import { ChatPage } from './pages/chat/ChatPage';
import { VideoCallPage } from './pages/meeting/VideoCallPage';
import { WalletPage } from './pages/wallet/WalletPage';

// Sound
const RINGING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/1352/1352-preview.mp3';

// Yeh component global call sunta hai aur popup dikhata hai
const GlobalCallListener = () => {
  const [callState, setCallState] = useState({
    isIncoming: false,
    callerName: '',
    roomId: '',
    type: 'video'
  });
  const [incomingAudio] = useState(new Audio(RINGING_SOUND_URL));

  useEffect(() => {
    const handleIncomingCall = ({ callerName, roomId, type }: any) => {
      setCallState({ isIncoming: true, callerName, roomId, type });
      incomingAudio.loop = true;
      incomingAudio.play().catch(e => console.log("Audio play blocked", e));
    };

    const handleCallEnded = () => {
      setCallState({ isIncoming: false, callerName: '', roomId: '', type: 'video' });
      incomingAudio.pause();
      incomingAudio.currentTime = 0;
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-cancelled", handleCallEnded);
    socket.on("call-declined", handleCallEnded);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-cancelled", handleCallEnded);
      socket.off("call-declined", handleCallEnded);
      incomingAudio.pause();
    };
  }, [incomingAudio]);

  const acceptCall = () => {
    window.location.href = `/meeting/${callState.roomId}?type=${callState.type}`;
  };

  const declineCall = () => {
    socket.emit("call-declined", { roomId: callState.roomId, targetName: 'User' });
    setCallState({ isIncoming: false, callerName: '', roomId: '', type: 'video' });
    incomingAudio.pause();
    incomingAudio.currentTime = 0;
  };

  if (!callState.isIncoming) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full animate-fade-in border border-slate-200">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
           <span className="text-3xl">📞</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">{callState.callerName}</h2>
        <p className="text-slate-500 mb-8 font-medium">Incoming {callState.type} call...</p>
        
        <div className="flex justify-center gap-4">
          <button onClick={declineCall} className="px-6 py-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-full font-semibold transition-colors">
            Decline
          </button>
          <button onClick={acceptCall} className="px-6 py-2.5 bg-green-500 text-white hover:bg-green-600 rounded-full font-semibold shadow-md transition-colors">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      
      <Router>
        <GlobalCallListener />
        
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="entrepreneur" element={<EntrepreneurDashboard />} />
            <Route path="investor" element={<InvestorDashboard />} />
          </Route>
          
          <Route path="/profile" element={<DashboardLayout />}>
            <Route path="entrepreneur/:id" element={<EntrepreneurProfile />} />
            <Route path="investor/:id" element={<InvestorProfile />} />
          </Route>
          
          <Route path="/investors" element={<DashboardLayout />}>
            <Route index element={<InvestorsPage />} />
          </Route>
          
          <Route path="/entrepreneurs" element={<DashboardLayout />}>
            <Route index element={<EntrepreneursPage />} />
          </Route>
          
          {/* Fix: Messages ab ChatPage ko hi load karega */}
          <Route path="/messages" element={<DashboardLayout />}>
            <Route index element={<ChatPage />} />
          </Route>
          
          <Route path="/notifications" element={<DashboardLayout />}>
            <Route index element={<NotificationsPage />} />
          </Route>
          
          <Route path="/documents" element={<DashboardLayout />}>
            <Route index element={<DocumentsPage />} />
          </Route>

          <Route path="/wallet" element={<DashboardLayout />}>
            <Route index element={<WalletPage />} />
          </Route>
          
          <Route path="/settings" element={<DashboardLayout />}>
            <Route index element={<SettingsPage />} />
          </Route>
          
          <Route path="/help" element={<DashboardLayout />}>
            <Route index element={<HelpPage />} />
          </Route>
          
          <Route path="/deals" element={<DashboardLayout />}>
            <Route index element={<DealsPage />} />
          </Route>
          
          {/* Chat Routes */}
          <Route path="/chat" element={<DashboardLayout />}>
            <Route index element={<ChatPage />} />
            <Route path=":userId" element={<ChatPage />} />
          </Route>

          <Route path="/meeting/:roomId" element={<DashboardLayout />}>
           <Route index element={<VideoCallPage />} />
          </Route>
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;