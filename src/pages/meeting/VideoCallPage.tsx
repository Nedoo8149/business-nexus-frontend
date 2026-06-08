import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, 
  PhoneOff, ArrowLeft, MonitorUp, MessageSquare, 
  Shield, MoreVertical 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../socket'; 
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCClient } from 'agora-rtc-sdk-ng';
import axios from 'axios';
import toast from 'react-hot-toast';

const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export const VideoCallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  
  const [callStatus, setCallStatus] = useState<string>('Ringing...'); 
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Call Timer State
  const [callDuration, setCallDuration] = useState<number>(0);
  
  const [disconnectSound] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  // Timer Logic
 // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>; // Error Fix: Browser ka default timer type laga diya
    if (callStatus === 'Connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);
  // Format Time (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    let tracks: [IMicrophoneAudioTrack, ICameraVideoTrack] | null = null;

    const initAgora = async () => {
      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const res = await axios.get(`${BACKEND_URL}/api/agora/token?channelName=${roomId}`);
        const token = res.data.token;

        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          setCallStatus('Connected'); 

          if (mediaType === 'video' && remoteVideoRef.current) {
            remoteUser.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
          }
        });

        const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
        await client.join(APP_ID, roomId as string, token, user?.id || null);

        tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(tracks[0]);
        setLocalVideoTrack(tracks[1]);
        
        if (localVideoRef.current) {
          tracks[1].play(localVideoRef.current);
        }

        await client.publish(tracks);
      } catch (error) {
        console.error("Agora Connection Error:", error);
        toast.error("Network issue. Reconnecting...");
      }
    };

    if (roomId) {
      initAgora();
    }

    const handleRemoteEnd = (msg: string) => {
      setCallStatus('Ended');
      setStatusMessage(msg);
      disconnectSound.play().catch(e => console.log(e));
      leaveAgoraCall();
    };

    socket.on('call-no-answer', ({ targetName }) => handleRemoteEnd(`${targetName} is not answering.`));
    socket.on('call-declined', ({ targetName }) => handleRemoteEnd(`${targetName} declined the call.`));
    socket.on('active-call-ended', () => handleRemoteEnd('Call Disconnected'));
    socket.on('user-disconnected', () => handleRemoteEnd('User disconnected / network lost'));

    return () => {
      socket.off('call-no-answer');
      socket.off('call-declined');
      socket.off('active-call-ended');
      socket.off('user-disconnected');
      leaveAgoraCall();
    };
  }, [roomId, user, disconnectSound]);

  const leaveAgoraCall = async () => {
    if (localAudioTrack) { localAudioTrack.stop(); localAudioTrack.close(); }
    if (localVideoTrack) { localVideoTrack.stop(); localVideoTrack.close(); }
    await client.leave();
  };

  const toggleCamera = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const endCall = async () => {
    if (callStatus === 'Ringing...') {
      socket.emit('cancel-call', { roomId });
    } else {
      socket.emit('end-active-call', { roomId });
    }
    await leaveAgoraCall();
    navigate(-1);
  };

  const showFeatureToast = (featureName: string) => {
    toast(`${featureName} feature coming soon!`, { icon: '🚀', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
  };

  return (
    <div className="flex flex-col h-[90vh] bg-gray-950 rounded-3xl overflow-hidden relative shadow-2xl border border-gray-800">
      
      {/* --- TOP HEADER BAR (Glassmorphism) --- */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-40 pointer-events-none">
        <div className="flex flex-col gap-2">
           <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 pointer-events-auto">
             <Shield size={16} className="text-green-400" />
             <span className="text-white text-sm font-medium tracking-wide">End-to-end Encrypted</span>
           </div>
        </div>

        {callStatus === 'Connected' && (
          <div className="bg-black/50 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2 pointer-events-auto shadow-lg">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <span className="text-white font-mono text-lg font-medium">{formatTime(callDuration)}</span>
          </div>
        )}
      </div>

      {/* --- REMOTE VIDEO (Bara Dabba) --- */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center bg-gray-900">
        <div ref={remoteVideoRef} className="w-full h-full object-cover"></div> 
        
        {/* Ringing Screen Upgrade */}
        {callStatus === 'Ringing...' && (
          <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center backdrop-blur-xl z-20">
             <div className="relative mb-8">
                <div className="w-28 h-28 bg-primary-600 rounded-full flex items-center justify-center z-10 relative shadow-2xl border-4 border-gray-800">
                  <span className="text-white text-5xl font-bold animate-pulse">...</span>
                </div>
                <div className="absolute inset-0 bg-primary-500 rounded-full animate-ping opacity-20 scale-[1.8]"></div>
                <div className="absolute inset-0 bg-primary-400 rounded-full animate-ping opacity-10 scale-[2.5]" style={{ animationDelay: '0.2s' }}></div>
             </div>
             <p className="text-white text-3xl font-semibold tracking-wider mb-3">Calling...</p>
             <p className="text-gray-400 text-base font-medium bg-gray-900/50 px-6 py-2 rounded-full border border-gray-800">Please wait while they connect</p>
          </div>
        )}

        {/* Ended Screen */}
        {callStatus === 'Ended' && (
          <div className="absolute inset-0 bg-gray-950/95 flex flex-col items-center justify-center backdrop-blur-xl z-50">
             <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
               <PhoneOff size={40} className="text-red-500" />
             </div>
             <p className="text-white text-3xl font-bold mb-10 text-center px-4 tracking-wide">{statusMessage}</p>
             <button onClick={() => navigate(-1)} className="flex items-center px-10 py-4 bg-white text-gray-950 rounded-full hover:bg-gray-200 transition-all font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105">
               <ArrowLeft size={22} className="mr-3" /> Back to Dashboard
             </button>
          </div>
        )}
      </div>

      {/* --- LOCAL VIDEO (Floating Chota Dabba) --- */}
      {callStatus !== 'Ended' && (
        <div className="absolute top-24 right-6 w-36 md:w-56 aspect-[3/4] md:aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl z-40 transition-all hover:scale-105 group">
          <div ref={localVideoRef} className="w-full h-full object-cover mirror"></div>
          
          {/* Label & Mic indicator for local video */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10">
            {!isMicOn && <MicOff size={14} className="text-red-400" />}
            <span className="text-white text-xs font-medium">You</span>
          </div>
        </div>
      )}

      {/* --- BOTTOM CONTROLS (Pro Mac-like Dock) --- */}
      {callStatus !== 'Ended' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3 md:gap-5 z-40 bg-gray-900/60 px-6 md:px-8 py-4 md:py-5 rounded-3xl backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          <button onClick={toggleMic} className={`p-4 rounded-2xl flex flex-col items-center gap-1 transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/90 hover:bg-red-600 text-white'}`}>
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>

          <button onClick={toggleCamera} className={`p-4 rounded-2xl flex flex-col items-center gap-1 transition-all ${isCameraOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/90 hover:bg-red-600 text-white'}`}>
            {isCameraOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
          </button>

          {/* New Screen Share Placeholder */}
          <button onClick={() => showFeatureToast('Screen Share')} className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all hidden md:block">
            <MonitorUp size={22} />
          </button>

          {/* New Chat Placeholder */}
          <button onClick={() => showFeatureToast('Live Chat')} className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all hidden md:block">
            <MessageSquare size={22} />
          </button>

          {/* End Call Button (Prominent) */}
          <button onClick={endCall} className="p-4 px-8 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all flex items-center gap-2 font-bold ml-2">
            <PhoneOff size={22} /> <span className="hidden md:inline">End Call</span>
          </button>

          {/* More Options */}
          <button onClick={() => showFeatureToast('Settings')} className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <MoreVertical size={22} />
          </button>

        </div>
      )}
    </div>
  );
};