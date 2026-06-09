import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Smile, MessageCircle, Paperclip, Check, CheckCheck, MoreVertical, Shield, ArrowLeft } from 'lucide-react';
import { socket } from '../../socket';
import axios from 'axios';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Avatar } from '../../components/ui/Avatar';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser && userId) {
      socket.emit("request-sync");

      const handleSyncStatuses = ({ online, lastSeen }: any) => {
        if (online.includes(userId)) {
          setIsPartnerOnline(true);
        } else {
          setIsPartnerOnline(false);
          if (lastSeen[userId]) setPartnerLastSeen(lastSeen[userId]);
        }
      };

      const handleStatusChange = (data: any) => {
        if (data.userId === userId) {
          setIsPartnerOnline(data.isOnline);
          if (!data.isOnline && data.lastSeen) setPartnerLastSeen(data.lastSeen);
        }
      };

      const handleSeenUpdate = ({ conversationId: msgConvoId }: any) => {
        setMessages(prev => prev.map(msg => 
          (msg.conversationId === msgConvoId && msg.status !== 'seen') ? { ...msg, status: 'seen' } : msg
        ));
      };

      socket.on('sync-statuses', handleSyncStatuses);
      socket.on('user-status-changed', handleStatusChange);
      socket.on("messages_seen_update", handleSeenUpdate);

      return () => {
        socket.off('sync-statuses', handleSyncStatuses);
        socket.off('user-status-changed', handleStatusChange);
        socket.off("messages_seen_update", handleSeenUpdate);
      };
    } else if (!userId) {
      // Agar back aa gaye hain toh partner clear kar do
      setChatPartner(null);
    }
  }, [currentUser, userId]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/messages/conversations/${currentUser.id}`);
        setConversations(res.data);
      } catch (error) {}
    };
    fetchConversations();
  }, [currentUser]);

  useEffect(() => {
    const fetchChatData = async () => {
      if (!currentUser || !userId) return;
      try {
        const convoId = [currentUser.id, userId].sort().join('-');
        setConversationId(convoId);

        const partnerRes = await axios.get(`${import.meta.env.VITE_API_URL}/users/${userId}`);
        setChatPartner(partnerRes.data);

        const msgsRes = await axios.get(`${import.meta.env.VITE_API_URL}/messages/${convoId}`);
        setMessages(msgsRes.data);

        socket.emit("mark_as_seen", { conversationId: convoId, userId: currentUser.id, senderId: userId });
      } catch (error) {}
    };
    fetchChatData();
  }, [currentUser, userId]);

  useEffect(() => {
    const handleReceiveMessage = (message: any) => {
      setMessages(prev => [...prev, message]);
      if (message.sender === userId) {
        socket.emit("mark_as_seen", { conversationId: message.conversationId, userId: currentUser?.id, senderId: message.sender });
      }
    };
    const handleMessageAck = (message: any) => setMessages(prev => [...prev, message]);

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_ack", handleMessageAck);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_ack", handleMessageAck);
    };
  }, [userId, currentUser]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId) return;
    
    socket.emit("send_message", { conversationId, sender: currentUser.id, receiver: userId, text: newMessage });
    setNewMessage('');
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => setNewMessage((prev) => prev + emojiData.emoji);

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Last seen recently';
    const date = new Date(dateString);
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${date.toLocaleDateString()}`;
  };

  const formatMessageTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFullImgUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    return `${backendUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  };

  const startCall = (callMode: 'audio' | 'video') => {
    if (!currentUser || !chatPartner) return;
    
    const roomId = conversationId; 
    const safeMyDp = getFullImgUrl(currentUser.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random&color=fff`;
    const safePartnerDp = getFullImgUrl(chatPartner.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatPartner.name)}&background=random&color=fff`;
    
    const safeNameForBackend = `${currentUser.name}___${callMode}___${encodeURIComponent(safeMyDp)}`;
    
    socket.emit("initiate-call", { 
      targetUserId: userId, 
      callerId: currentUser.id, 
      callerName: safeNameForBackend, 
      roomId: roomId, 
      type: callMode 
    });
    
    navigate(`/meeting/${roomId}?type=${callMode}&role=caller&name=${encodeURIComponent(chatPartner.name)}&dp=${encodeURIComponent(safePartnerDp)}`);
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-6rem)] lg:h-[calc(100vh-8.5rem)] bg-white border border-gray-200 rounded-2xl overflow-hidden relative shadow-lg">
      
      {/* 🔥 WhatsApp Mobile Logic: Agar userId selected nahi hai tabhi mobile par dikhao list, warna hide kar do. PC par hamesha dikhao (md:flex) */}
      <div className={`${!userId ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-1/3 lg:w-[30%] border-r border-gray-200 bg-gray-50/50 z-20`}>
        <ChatUserList conversations={conversations} />
      </div>
      
      {/* 🔥 Chat Area: Agar userId selected hai tab mobile par dikhao, warna hide. PC par hamesha dikhao */}
      <div className={`${userId ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-[#F4F7F9] relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-[0.3] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2394a3b8' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3Ccircle cx='13' cy='13' r='1.5'/%3E%3C/g%3E%3C/svg%3E")` }}></div>

        {chatPartner ? (
          <>
            <div className="border-b border-gray-200/80 px-4 md:px-6 py-3 flex justify-between items-center bg-white/95 backdrop-blur-sm shadow-sm z-20">
              <div className="flex items-center cursor-pointer">
                {/* 🔥 Mobile Back Button added */}
                <button 
                  type="button" 
                  onClick={() => navigate('/messages')} 
                  className="md:hidden mr-2 p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                
                <Avatar src={chatPartner.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatPartner.name || 'User')}&background=random&color=fff&size=128`} alt={chatPartner.name || 'User'} size="md" status={isPartnerOnline ? 'online' : 'offline'} className="mr-3 md:mr-4 shadow-sm" />
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">{chatPartner.name}</h2>
                  <p className={`text-xs font-medium ${isPartnerOnline ? 'text-primary-600' : 'text-gray-500'}`}>{isPartnerOnline ? 'Online' : formatLastSeen(partnerLastSeen)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-gray-500">
                <button type="button" onClick={() => startCall('audio')} className="p-2 md:p-2.5 rounded-full hover:bg-gray-100 hover:text-primary-600 transition-colors"><Phone size={20} /></button>
                <button type="button" onClick={() => startCall('video')} className="p-2 md:p-2.5 rounded-full hover:bg-gray-100 hover:text-primary-600 transition-colors"><Video size={20} /></button>
                <div className="hidden md:block w-px h-6 bg-gray-200 mx-1"></div>
                <button type="button" className="hidden md:block p-2.5 rounded-full hover:bg-gray-100 transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>
            
            <div className="flex-1 p-4 md:p-6 overflow-y-auto z-10 flex flex-col space-y-4 scroll-smooth">
              {messages.length > 0 ? (
                <>
                  <div className="text-center mb-6 mt-2">
                    <span className="bg-white/80 backdrop-blur-md border border-gray-100 text-gray-500 text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                      <Shield size={12} className="inline mr-1 text-primary-500" /> End-to-End Encrypted
                    </span>
                  </div>
                  {messages.map((message, index) => {
                    const isMe = message.sender === currentUser.id;
                    const isCallLog = message.text.startsWith('📞');
                    
                    let callTitle = '';
                    let callTime = '';
                    let isMissedOrDeclined = false;

                    if (isCallLog) {
                      callTitle = message.text.replace('📞 ', '').trim();
                      isMissedOrDeclined = callTitle.includes('Missed') || callTitle.includes('Declined');
                      if (callTitle.includes('(')) {
                        const parts = callTitle.split('(');
                        callTitle = parts[0].trim();
                        callTime = parts[1].replace(')', '').trim();
                      } else {
                        callTime = isMissedOrDeclined ? 'Not answered' : '';
                      }
                    }
                    
                    return (
                      <div key={message._id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`} style={{ animationFillMode: 'both', animationDelay: '50ms' }}>
                        
                        {isCallLog ? (
                          <div className={`relative p-1 shadow-sm min-w-[200px] md:min-w-[240px] mb-2 ${isMe ? 'bg-white border border-gray-100 rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm'}`}>
                            <div className="flex items-center gap-3 p-2">
                              <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center shrink-0 ${isMissedOrDeclined ? 'bg-red-50' : 'bg-green-50'}`}>
                                {callTitle.includes('Video') 
                                  ? <Video size={18} className={isMissedOrDeclined ? 'text-red-500' : 'text-green-600'} /> 
                                  : <Phone size={18} className={isMissedOrDeclined ? 'text-red-500' : 'text-green-600'} />}
                              </div>
                              <div className="flex flex-col flex-1">
                                <span className="text-[13px] md:text-[14px] font-bold text-gray-800">{callTitle}</span>
                                <span className="text-[10px] md:text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mt-0.5">
                                  {formatMessageTime(message.createdAt || new Date().toISOString())}
                                  {callTime && (
                                    <>
                                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                      <span className="text-gray-500">{callTime}</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`relative px-4 py-2 shadow-sm max-w-[85%] lg:max-w-[70%] ${isMe ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'}`}>
                            <p className="text-[14px] md:text-[15px] leading-relaxed break-words pr-2">{message.text}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                              <span className="text-[10px] font-medium leading-none">{formatMessageTime(message.createdAt || new Date().toISOString())}</span>
                              {isMe && <span className="ml-0.5">{message.status === 'seen' ? <CheckCheck size={14} className="text-blue-300" /> : message.status === 'delivered' ? <CheckCheck size={14} /> : <Check size={14} />}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="bg-white p-4 md:p-5 rounded-full mb-4 shadow-sm border border-gray-100"><MessageCircle size={40} className="text-primary-400" /></div>
                  <h3 className="text-base md:text-lg font-bold text-gray-800">Start the conversation</h3>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">Send a message or start a call</p>
                </div>
              )}
            </div>
            
            {showEmojiPicker && (
              <div className="absolute bottom-20 md:bottom-24 left-2 md:left-4 z-50 shadow-2xl rounded-2xl overflow-hidden animate-fade-in-up border border-gray-100 transform scale-90 md:scale-100 origin-bottom-left">
                <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.LIGHT} />
              </div>
            )}

            <div className="bg-white p-2 md:p-4 border-t border-gray-200 z-20 pb-safe">
              <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 md:gap-2 max-w-5xl mx-auto">
                <button type="button" className="hidden sm:block p-3 text-gray-400 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100 flex-shrink-0"><Paperclip size={22} /></button>
                <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-3xl flex items-center pr-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:bg-white transition-all shadow-inner">
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2.5 md:p-3 text-gray-400 hover:text-yellow-500 transition-colors rounded-full flex-shrink-0"><Smile size={22} /></button>
                  <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message..." className="flex-1 max-h-32 min-h-[40px] py-2.5 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-700 text-[14px] md:text-[15px]" rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                </div>
                <button type="submit" disabled={!newMessage.trim()} className="p-3 md:p-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-full transition-transform transform hover:scale-105 active:scale-95 shadow-md flex-shrink-0"><Send size={18} className="md:w-5 md:h-5 ml-0.5" /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-50">
            <MessageCircle size={56} className="text-gray-300 mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Business Nexus Web</h2>
            <p className="text-gray-500 mt-2 text-center max-w-md text-sm md:text-base font-medium">Select a conversation from the list to start messaging.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.2s ease-out forwards; }
        
        /* Safe area padding for mobile notches */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe { padding-bottom: max(env(safe-area-inset-bottom), 0.5rem); }
        }
        
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        @media (min-width: 768px) {
          .overflow-y-auto::-webkit-scrollbar { width: 6px; }
        }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .overflow-y-auto:hover::-webkit-scrollbar-thumb { background: #cbd5e1; }
      `}</style>
    </div>
  );
};