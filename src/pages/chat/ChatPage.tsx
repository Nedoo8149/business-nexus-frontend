import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Smile, MessageCircle, PhoneCall, Paperclip, Check, CheckCheck, MoreVertical } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Avatar } from '../../components/ui/Avatar';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

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
  
  // Calling States
  const [callState, setCallState] = useState<{
    isIncoming: boolean;
    isOutgoing: boolean;
    callerName?: string;
    callerId?: string;
    roomId?: string;
    type?: 'audio' | 'video';
  }>({ isIncoming: false, isOutgoing: false });

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // ==========================================
  // 1. SOCKET SETUP & LISTENERS (UNTOUCHED)
  // ==========================================
  useEffect(() => {
    if (currentUser && userId) {
      socketRef.current = io(SOCKET_URL);
      socketRef.current.emit("register", currentUser.id);
      socketRef.current.emit("request-sync");

      socketRef.current.on('sync-statuses', ({ online, lastSeen }: any) => {
        if (online.includes(userId)) {
          setIsPartnerOnline(true);
        } else {
          setIsPartnerOnline(false);
          if (lastSeen[userId]) setPartnerLastSeen(lastSeen[userId]);
        }
      });

      socketRef.current.on('user-status-changed', (data: any) => {
        if (data.userId === userId) {
          setIsPartnerOnline(data.isOnline);
          if (!data.isOnline && data.lastSeen) {
            setPartnerLastSeen(data.lastSeen);
          }
        }
      });

      socketRef.current.on("messages_seen_update", ({ conversationId: msgConvoId }) => {
        setMessages(prev => prev.map(msg => 
          (msg.conversationId === msgConvoId && msg.status !== 'seen') 
            ? { ...msg, status: 'seen' } 
            : msg
        ));
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [currentUser, userId]);

  // ==========================================
  // 2. FETCH APIS (UNTOUCHED)
  // ==========================================
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/messages/conversations/${currentUser.id}`);
        setConversations(res.data);
      } catch (error) {
        console.error("Failed to load conversations", error);
      }
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

        if (socketRef.current) {
          socketRef.current.emit("mark_as_seen", {
            conversationId: convoId,
            userId: currentUser.id,
            senderId: userId
          });
        }
      } catch (error) {
        console.error("Error fetching chat data", error);
      }
    };
    fetchChatData();
  }, [currentUser, userId]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleReceiveMessage = (message: any) => {
      setMessages(prev => [...prev, message]);
      if (message.sender === userId) {
        socketRef.current?.emit("mark_as_seen", {
          conversationId: message.conversationId,
          userId: currentUser?.id,
          senderId: message.sender
        });
      }
    };

    const handleMessageAck = (message: any) => {
      setMessages(prev => [...prev, message]);
    };

    socketRef.current.on("receive_message", handleReceiveMessage);
    socketRef.current.on("message_ack", handleMessageAck);

    return () => {
      socketRef.current?.off("receive_message", handleReceiveMessage);
      socketRef.current?.off("message_ack", handleMessageAck);
    };
  }, [userId, currentUser]);

  // ==========================================
  // 3. UI HELPERS & HANDLERS
  // ==========================================
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId || !socketRef.current) return;
    
    const messageData = {
      conversationId: conversationId,
      sender: currentUser.id,
      receiver: userId,
      text: newMessage
    };
    
    socketRef.current.emit("send_message", messageData);
    setNewMessage('');
    setShowEmojiPicker(false); // Send hone ke baad emoji box band ho jaye
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Last seen recently';
    const date = new Date(dateString);
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${date.toLocaleDateString()}`;
  };

  const formatMessageTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ==========================================
  // 4. CALL HANDLERS (UNTOUCHED)
  // ==========================================
 // ==========================================
  // CALL HANDLERS (UPDATED BULLETPROOF LOGIC)
  // ==========================================
  const startCall = (type: 'audio' | 'video') => {
    if (!currentUser || !chatPartner || !socketRef.current) return;
    
    // Exact room id, no 'room-' prefix
    const roomId = conversationId; 
    setCallState({ isIncoming: false, isOutgoing: true, callerName: chatPartner.name, roomId, type });
    socketRef.current.emit("initiate-call", { targetUserId: userId, callerId: currentUser.id, callerName: currentUser.name, roomId, type });
    
    // Explicitly role=caller pass kar rahe hain
    navigate(`/meeting/${roomId}?type=${type}&role=caller`);
  };

  const acceptCall = (e?: React.MouseEvent) => {
    if (e) e.preventDefault(); // Page refresh hone se bachayega
    if (!callState.roomId) return;
    
    // Agar type undefined aa jaye tou default video call set kardo
    const safeType = (callState.type && callState.type !== 'undefined') ? callState.type : 'video';
    
    // Explicitly role=receiver pass kar rahe hain
    navigate(`/meeting/${callState.roomId}?type=${safeType}&role=receiver`);
    setCallState({ isIncoming: false, isOutgoing: false });
  };

  const declineCall = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!callState.roomId || !socketRef.current) return;
    socketRef.current.emit("call-declined", { roomId: callState.roomId, targetName: currentUser?.name });
    setCallState({ isIncoming: false, isOutgoing: false });
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden relative animate-fade-in shadow-sm">
      
      {/* INCOMING CALL OVERLAY */}
      {callState.isIncoming && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white animate-fade-in">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-lg shadow-primary-500/50">
              <PhoneCall size={40} />
            </div>
            <h2 className="text-2xl font-bold">{callState.callerName}</h2>
            <p className="text-gray-300 font-medium animate-pulse">Incoming {callState.type} call...</p>
            <div className="flex space-x-6 mt-8">
              <button onClick={acceptCall} className="px-8 py-3 bg-green-500 hover:bg-green-600 rounded-full font-bold shadow-lg transition-transform hover:scale-105">
                Accept
              </button>
              <button onClick={declineCall} className="px-8 py-3 bg-red-500 hover:bg-red-600 rounded-full font-bold shadow-lg transition-transform hover:scale-105">
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR: CONVERSATIONS */}
      <div className="hidden md:flex flex-col w-1/3 lg:w-[30%] border-r border-gray-200 bg-gray-50/50">
        <ChatUserList conversations={conversations} />
      </div>
      
      {/* RIGHT SIDE: MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
        {/* Subtle Chat Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>

        {chatPartner ? (
          <>
            {/* PREMIUM CHAT HEADER */}
            <div className="border-b border-gray-200 px-6 py-3 flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center cursor-pointer">
                <Avatar
                  src={chatPartner.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatPartner.name || (chatPartner.email ? chatPartner.email.split('@')[0] : 'User'))}&background=random&color=fff&size=128`}
                  alt={chatPartner.name || 'User'}
                  size="md"
                  status={isPartnerOnline ? 'online' : 'offline'}
                  className="mr-4 shadow-sm"
                />
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">
                    {chatPartner.name || (chatPartner.email ? chatPartner.email.split('@')[0] : 'Unknown User')}
                  </h2>
                  <p className={`text-xs font-medium ${isPartnerOnline ? 'text-primary-600' : 'text-gray-500'}`}>
                    {isPartnerOnline ? 'Online' : formatLastSeen(partnerLastSeen)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 text-gray-500">
                <button onClick={() => startCall('audio')} className="p-2.5 rounded-full hover:bg-gray-100 transition-colors">
                  <Phone size={20} />
                </button>
                <button onClick={() => startCall('video')} className="p-2.5 rounded-full hover:bg-gray-100 transition-colors">
                  <Video size={20} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                <button className="p-2.5 rounded-full hover:bg-gray-100 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
            
            {/* MESSAGES AREA (PREMIUM BUBBLES) */}
            <div className="flex-1 p-6 overflow-y-auto z-10 flex flex-col space-y-4 scroll-smooth">
              {messages.length > 0 ? (
                <>
                  <div className="text-center mb-4">
                    <span className="bg-white/80 backdrop-blur-sm text-gray-600 text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                      End-to-End Encrypted
                    </span>
                  </div>
                  
                  {messages.map((message, index) => {
                    const isMe = message.sender === currentUser.id;
                    
                    return (
                      <div 
                        key={message._id || index} 
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}
                        style={{ animationFillMode: 'both', animationDelay: '50ms' }}
                      >
                        <div className={`relative px-4 py-2 shadow-sm max-w-[75%] lg:max-w-[65%] ${
                          isMe 
                            ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm' 
                            : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                        }`}>
                          <p className="text-[15px] leading-relaxed break-words pr-2">
                            {message.text}
                          </p>
                          
                          {/* Time & Ticks */}
                          <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                            <span className="text-[10px] font-medium leading-none">
                              {formatMessageTime(message.createdAt || new Date().toISOString())}
                            </span>
                            {isMe && (
                              <span className="ml-0.5">
                                {message.status === 'seen' ? (
                                  <CheckCheck size={14} className="text-blue-300" />
                                ) : message.status === 'delivered' ? (
                                  <CheckCheck size={14} />
                                ) : (
                                  <Check size={14} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="bg-white p-5 rounded-full mb-4 shadow-sm">
                    <MessageCircle size={40} className="text-primary-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Start the conversation</h3>
                  <p className="text-gray-500 mt-1 text-sm font-medium">Say hello to {chatPartner.name.split(' ')[0]}</p>
                </div>
              )}
            </div>
            
            {/* EMOJI PICKER POPUP */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden animate-fade-in-up border border-gray-100">
                <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.LIGHT} />
              </div>
            )}

            {/* PREMIUM MESSAGE INPUT BAR */}
            <div className="bg-gray-50 p-3 sm:p-4 border-t border-gray-200 z-10">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-5xl mx-auto">
                <button type="button" className="p-3 text-gray-400 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-200 flex-shrink-0">
                  <Paperclip size={22} />
                </button>
                
                <div className="flex-1 bg-white border border-gray-300 rounded-3xl flex items-center pr-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all shadow-sm">
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-3 text-gray-400 hover:text-yellow-500 transition-colors rounded-full flex-shrink-0"
                  >
                    <Smile size={24} />
                  </button>
                  
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 max-h-32 min-h-[44px] py-3 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-700 text-[15px]"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="p-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-transform transform hover:scale-105 active:scale-95 shadow-md flex-shrink-0"
                >
                  <Send size={20} className="ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* EMPTY STATE (No chat selected) */
          <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-50">
            <div className="bg-white p-8 rounded-full mb-6 shadow-sm border border-gray-100">
              <MessageCircle size={56} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Business Nexus Web</h2>
            <p className="text-gray-500 mt-2 text-center max-w-md font-medium">
              Select a conversation from the sidebar to start messaging. Your messages are private and secure.
            </p>
          </div>
        )}
      </div>

      {/* Global CSS for Smooth Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.2s ease-out forwards; }
        
        /* Hide scrollbar for clean look */
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};