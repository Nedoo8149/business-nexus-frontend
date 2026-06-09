import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, 
  PhoneOff, ArrowLeft, Shield, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../socket'; 
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCClient } from 'agora-rtc-sdk-ng';
import axios from 'axios';
import toast from 'react-hot-toast';

const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

const RINGING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/1352/1352-preview.mp3';
const DISCONNECT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const VideoCallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // URL Parse Logic (Bulletproof)
  const queryParams = new URLSearchParams(location.search);
  let rawCallType = queryParams.get('type');
  const callType = (rawCallType && rawCallType !== 'undefined' && rawCallType !== 'null') ? rawCallType : 'video';
  
  // Check if current user is caller or receiver
  const userRole = queryParams.get('role') || 'caller'; 

  // Fix room mismatch: Hamesha 'room-' hata kar pure ID use karega dono k liye
  const cleanRoomId = roomId?.replace(/^room-/, '') || '';

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(callType === 'video');
  const [isMicOn, setIsMicOn] = useState(true);
  
  // Receiver hai tou 'Connecting...' show hoga, Caller hai tou 'Ringing...'
  const [callStatus, setCallStatus] = useState<string>(userRole === 'receiver' ? 'Connecting...' : 'Ringing...'); 
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);
  
  const [ringingAudio] = useState(new Audio(RINGING_SOUND_URL));
  const [disconnectAudio] = useState(new Audio(DISCONNECT_SOUND_URL));

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (user?.id) {
      socket.emit('register', user.id);
    }
  }, [user]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>; 
    if (callStatus === 'Connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // --- Timeout & Sound Logic (Only Caller hears ringing) ---
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (callStatus === 'Ringing...' || callStatus === 'Connecting...') {
      // Sirf caller ko ringtone sunao
      if (callStatus === 'Ringing...' && userRole === 'caller') {
        ringingAudio.loop = true;
        setTimeout(() => {
           ringingAudio.play().catch(e => console.log("Audio block fix:", e));
        }, 300);
      }

      timeoutId = setTimeout(() => {
        if (callStatus !== 'Connected') {
          handleRemoteEnd(userRole === 'caller' ? 'No Answer' : 'Call Ended');
          if (userRole === 'caller') {
            socket.emit('call-no-answer', { roomId: cleanRoomId, targetName: user?.name });
            socket.emit('cancel-call', { roomId: cleanRoomId });
          }
        }
      }, 30000);
    } else {
      ringingAudio.pause();
      ringingAudio.currentTime = 0;
    }

    return () => {
      ringingAudio.pause();
      clearTimeout(timeoutId);
    };
  }, [callStatus, ringingAudio, cleanRoomId, user, userRole]);

  const isAgoraInitialized = useRef(false);

  useEffect(() => {
    const initAgora = async () => {
      if (isAgoraInitialized.current) return;
      isAgoraInitialized.current = true;

      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        // Clean room ID backend ko bhejein
        const res = await axios.get(`${BACKEND_URL}/api/agora/token?channelName=${cleanRoomId}`);
        const token = res.data.token;

        client.on('user-joined', () => {
          setCallStatus('Connected');
        });

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

        client.on('user-left', () => {
          handleRemoteEnd('User Disconnected');
        });

        const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
        await client.join(APP_ID, cleanRoomId, token, user?.id || null);

        if (client.remoteUsers.length > 0) {
           setCallStatus('Connected');
        }

        let audioTrack = null;
        let videoTrack = null;

        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          setLocalAudioTrack(audioTrack);
        } catch (err) {
          console.error("Mic error:", err);
        }

        if (callType === 'video') {
          try {
            videoTrack = await AgoraRTC.createCameraVideoTrack();
            setLocalVideoTrack(videoTrack);
            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current);
            }
          } catch (err) {
            console.error("Camera blocked. Audio only fallback.");
            setIsCameraOn(false);
          }
        }

        const tracksToPublish = [];
        if (audioTrack) tracksToPublish.push(audioTrack);
        if (videoTrack) tracksToPublish.push(videoTrack);

        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }

      } catch (error) {
        console.error("Agora Critical Error:", error);
      }
    };

    if (cleanRoomId) initAgora();

    const handleSocketEvents = () => {
      socket.on('call-declined', () => handleRemoteEnd('Call Declined'));
      socket.on('call-no-answer', () => handleRemoteEnd('No Answer'));
      socket.on('user-disconnected', () => handleRemoteEnd('User Disconnected'));
      socket.on('active-call-ended', (data) => {
        if (data && data.roomId === cleanRoomId) {
          handleRemoteEnd('Call Ended');
        }
      });
    };

    handleSocketEvents();

    return () => {
      socket.off('call-declined');
      socket.off('call-no-answer');
      socket.off('active-call-ended');
      socket.off('user-disconnected');
      leaveAgoraCall();
    };
  }, [cleanRoomId, user, callType]);

  const handleRemoteEnd = (msg: string) => {
    setCallStatus((prev) => {
      if (prev === 'Ended') return prev; 
      setStatusMessage(msg);
      disconnectAudio.play().catch(e => console.log(e));
      leaveAgoraCall();
      return 'Ended';
    });
  };

  const leaveAgoraCall = async () => {
    if (localAudioTrack) { localAudioTrack.stop(); localAudioTrack.close(); }
    if (localVideoTrack) { localVideoTrack.stop(); localVideoTrack.close(); }
    await client.leave();
  };

  const toggleCamera = () => {
    if (callType === 'audio') return;
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
    if (callStatus === 'Ringing...' || callStatus === 'Connecting...') {
      socket.emit('cancel-call', { roomId: cleanRoomId });
      handleRemoteEnd('Call Cancelled');
    } else {
      socket.emit('end-active-call', { roomId: cleanRoomId });
      handleRemoteEnd('Call Ended');
    }
    setTimeout(() => navigate(-1), 1500); 
  };

  return (
    <div className="flex flex-col h-[90vh] bg-slate-50 rounded-3xl overflow-hidden relative shadow-md border border-slate-200 animate-fade-in font-sans">
      
      {/* TOP HEADER BAR */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-40 pointer-events-none">
        <div className="flex flex-col gap-2">
           <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-full flex items-center gap-2 pointer-events-auto shadow-sm">
             <Shield size={16} className="text-green-500" />
             <span className="text-slate-700 text-sm font-medium tracking-wide">End-to-end Encrypted</span>
           </div>
        </div>

        {callStatus === 'Connected' && (
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-5 py-2.5 rounded-full flex items-center gap-2 pointer-events-auto shadow-sm">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <span className="text-slate-800 font-medium text-lg">{formatTime(callDuration)}</span>
          </div>
        )}
      </div>

      {/* REMOTE USER AREA */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center bg-slate-100">
        
        <div ref={remoteVideoRef} className={`w-full h-full object-cover ${callType === 'audio' ? 'hidden' : 'block'}`}></div> 
        
        {(callType === 'audio' || callStatus !== 'Connected') && callStatus !== 'Ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center shadow-inner mb-6">
               <User size={60} className="text-primary-600" />
            </div>
            {callStatus === 'Connected' && <p className="text-slate-800 text-2xl font-medium">Audio Call Connected</p>}
          </div>
        )}
        
        {/* Calling/Connecting Screen */}
        {(callStatus === 'Ringing...' || callStatus === 'Connecting...') && (
          <div className="absolute inset-0 bg-slate-50/95 flex flex-col items-center justify-center backdrop-blur-md z-20">
             <div className="relative mb-8 flex items-center justify-center">
                <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center z-10 relative shadow-lg border border-slate-100">
                  <User size={48} className="text-slate-400" />
                </div>
                {callStatus === 'Ringing...' && (
                  <>
                    <div className="absolute inset-0 bg-primary-200 rounded-full animate-ping opacity-40 scale-[1.5]"></div>
                    <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-30 scale-[2.2]" style={{ animationDelay: '0.2s' }}></div>
                  </>
                )}
             </div>
             <p className="text-slate-800 text-3xl font-medium mb-2 tracking-wide">
               {callStatus === 'Ringing...' ? 'Calling...' : 'Connecting...'}
             </p>
             <p className="text-slate-500 text-sm font-medium">
               {callStatus === 'Ringing...' ? 'Waiting for response...' : 'Securing connection...'}
             </p>
          </div>
        )}

        {callStatus === 'Ended' && (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-50">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
               <PhoneOff size={32} className="text-red-500" />
             </div>
             <p className="text-slate-800 text-2xl font-semibold mb-8 text-center px-4">{statusMessage}</p>
             <button onClick={() => navigate(-1)} className="flex items-center px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-full hover:bg-slate-100 transition-all font-medium shadow-sm">
               <ArrowLeft size={20} className="mr-2" /> Back
             </button>
          </div>
        )}
      </div>

      {/* LOCAL VIDEO */}
      {callStatus !== 'Ended' && callType === 'video' && (
        <div className="absolute top-24 right-6 w-36 md:w-56 aspect-[3/4] md:aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-white shadow-xl z-40 transition-all hover:scale-105">
          <div ref={localVideoRef} className={`w-full h-full object-cover mirror ${!isCameraOn && 'hidden'}`}></div>
          
          {!isCameraOn && (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <User size={40} className="text-slate-400" />
            </div>
          )}

          <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-2">
            {!isMicOn && <MicOff size={14} className="text-red-400" />}
            <span className="text-white text-xs font-medium">You</span>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS */}
      {callStatus !== 'Ended' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3 md:gap-4 z-40 bg-white px-6 py-4 rounded-full shadow-lg border border-slate-200">
          
          <button onClick={toggleMic} className={`p-3.5 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>

          <button 
            onClick={toggleCamera} 
            disabled={callType === 'audio'}
            className={`p-3.5 rounded-full flex items-center justify-center transition-all ${
              callType === 'audio' ? 'bg-slate-50 text-slate-300 cursor-not-allowed' :
              isCameraOn ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            {isCameraOn && callType !== 'audio' ? <VideoIcon size={22} /> : <VideoOff size={22} />}
          </button>

          <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

          <button onClick={endCall} className="p-3.5 px-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium">
            <PhoneOff size={20} /> <span className="hidden md:inline">End</span>
          </button>
        </div>
      )}
    </div>
  );
};