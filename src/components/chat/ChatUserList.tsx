import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import axios from 'axios';

interface ChatUserListProps {
  conversations: any[]; 
}

export const ChatUserList: React.FC<ChatUserListProps> = ({ conversations }) => {
  const navigate = useNavigate();
  const { userId: activeUserId } = useParams<{ userId: string }>();
  
  const [partnerDetails, setPartnerDetails] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const fetchPartnersData = async () => {
      const detailsMap: { [key: string]: any } = {};
      
      for (let convo of conversations) {
        if (!convo.partnerId) continue;
        
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/${convo.partnerId}`);
          detailsMap[convo.partnerId] = res.data;
        } catch (error) {
          console.error(`Failed to fetch user ${convo.partnerId}`, error);
        }
      }
      setPartnerDetails(detailsMap);
    };

    if (conversations.length > 0) {
      fetchPartnersData();
    }
  }, [conversations]);

  const handleSelectUser = (partnerId: string) => {
    navigate(`/chat/${partnerId}`);
  };

  return (
    <div className="bg-white border-r border-gray-200 w-full h-full overflow-y-auto">
      <div className="py-4">
        <h2 className="px-4 text-lg font-semibold text-gray-800 mb-4">Messages</h2>
        
        <div className="space-y-1">
          {conversations.length > 0 ? (
            conversations.map(conversation => {
              const partnerId = conversation.partnerId;
              if (!partnerId) return null;
              
              const otherUser = partnerDetails[partnerId];
              
              if (!otherUser) {
                 return (
                    <div key={partnerId} className="px-4 py-3 flex animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    </div>
                 );
              }
              
              const isActive = activeUserId === partnerId;
              
              // 1. Naam ka Fallback (Agar naam na ho tou email show karega)
              const displayName = otherUser.name || (otherUser.email ? otherUser.email.split('@')[0] : 'Unknown User');
              
              // 2. Avatar ka Fallback (Agar DP na ho tou naam ka pehla Letter utha kar colorful DP banayega)
              const displayAvatar = otherUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=128`;
              
              return (
                <div
                  key={partnerId}
                  className={`px-4 py-3 flex cursor-pointer transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 border-l-4 border-primary-600'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleSelectUser(partnerId)}
                >
                 <Avatar
                    src={displayAvatar}
                    alt={displayName}
                    size="md"
                    className="mr-3 flex-shrink-0"
                    // status wali line yahan se poori tarah hata di gayi hai
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {displayName}
                      </h3>
                      
                      {conversation.timestamp && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conversation.timestamp), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      {conversation.lastMessage ? (
                        <p className="text-xs text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No messages yet</p>
                      )}
                      
                      {conversation.unreadCount > 0 && (
                        <Badge variant="primary" size="sm" rounded>
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No conversations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};