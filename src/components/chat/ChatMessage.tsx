import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../ui/Avatar';
import { Check, CheckCheck } from 'lucide-react';

interface ChatMessageProps {
  message: any; 
  isCurrentUser: boolean;
  user: any; 
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser, user }) => {
  if (!user) return null;
  
  const messageDate = message.createdAt || message.timestamp || new Date();

  // 1. Naam aur Avatar ka Fallback Logic
  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
  const displayAvatar = user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=128`;

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      {/* Dusre User ki DP */}
      {!isCurrentUser && (
        <Avatar
          src={displayAvatar}
          alt={displayName}
          size="sm"
          className="mr-2 self-end"
        />
      )}
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-xs sm:max-w-md px-4 py-2 rounded-lg ${
            isCurrentUser
              ? 'bg-primary-600 text-white rounded-br-none shadow-sm'
              : 'bg-gray-100 text-gray-800 rounded-bl-none shadow-sm'
          }`}
        >
          <p className="text-sm">{message.text || message.content}</p>
        </div>
        
        <div className="flex items-center mt-1 space-x-1">
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(messageDate), { addSuffix: true })}
          </span>
          
          {isCurrentUser && (
            <span className="flex items-center ml-1">
              {message.status === 'sent' && <Check size={14} className="text-gray-400" />}
              {message.status === 'delivered' && <CheckCheck size={14} className="text-gray-400" />}
              {message.status === 'seen' && <CheckCheck size={14} className="text-blue-500" />}
            </span>
          )}
        </div>
      </div>
      
      {/* Current User ki DP */}
      {isCurrentUser && (
        <Avatar
          src={displayAvatar}
          alt={displayName}
          size="sm"
          className="ml-2 self-end"
        />
      )}
    </div>
  );
};