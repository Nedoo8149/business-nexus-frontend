import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { Investor } from '../../types';
import { Card, CardBody, CardFooter } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { socket } from '../../socket'; // Central socket import

const formatLastSeen = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + date.toLocaleDateString();
};

interface InvestorCardProps {
  investor: Investor;
  showActions?: boolean;
}

export const InvestorCard: React.FC<InvestorCardProps> = ({
  investor,
  showActions = true
}) => {
  const navigate = useNavigate();
  
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    const handleSync = ({ online, lastSeen: lastSeenData }: { online: string[], lastSeen: any }) => {
      const isUserOnline = online.includes(investor.id);
      setIsOnline(isUserOnline);
      if (!isUserOnline && lastSeenData[investor.id]) {
        setLastSeen(lastSeenData[investor.id]);
      }
    };

    const handleStatusChange = (data: { userId: string, isOnline: boolean, lastSeen?: string }) => {
      if (data.userId === investor.id) {
        setIsOnline(data.isOnline);
        if (!data.isOnline && data.lastSeen) {
          setLastSeen(data.lastSeen);
        }
      }
    };

    socket.on('sync-statuses', handleSync);
    socket.on('user-status-changed', handleStatusChange);

    socket.emit('request-sync');

    return () => {
      socket.off('sync-statuses', handleSync);
      socket.off('user-status-changed', handleStatusChange);
    };
  }, [investor.id]);
  
  const handleViewProfile = () => navigate(`/profile/investor/${investor.id}`);
  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    navigate(`/chat/${investor.id}`);
  };
  
  return (
    <Card hoverable className="transition-all duration-300 h-full flex flex-col" onClick={handleViewProfile}>
      <CardBody className="flex flex-col flex-1">
        <div className="flex items-start">
          <Avatar
            src={investor.avatarUrl}
            alt={investor.name}
            size="lg"
            status={isOnline ? 'online' : 'offline'}
            className="mr-4"
          />
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{investor.name}</h3>
            <p className="text-sm text-gray-500 mb-2">Investor • {investor.totalInvestments} investments</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {investor.investmentStage.map((stage, index) => (
                <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Investment Interests</h4>
          <div className="flex flex-wrap gap-2">
            {investor.investmentInterests.map((interest, index) => (
              <Badge key={index} variant="primary" size="sm">{interest}</Badge>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex-1">
          <p className="text-sm text-gray-600 line-clamp-2">{investor.bio}</p>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-500">Investment Range</span>
            <p className="text-sm font-medium text-gray-900">{investor.minimumInvestment} - {investor.maximumInvestment}</p>
          </div>
        </div>
      </CardBody>
      
      <div className={`px-6 py-2 text-xs font-semibold flex justify-between items-center border-t border-gray-100 transition-colors ${
        isOnline ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
      }`}>
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
          {isOnline ? 'Active Now' : 'Inactive'}
        </div>
        {!isOnline && lastSeen && (
          <span className="text-gray-400 font-medium tracking-wide">
            Last seen: {formatLastSeen(lastSeen)}
          </span>
        )}
      </div>

      {showActions && (
        <CardFooter className="border-t border-gray-100 bg-white flex justify-between">
          <Button variant="outline" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
            Message
          </Button>
          <Button variant="primary" size="sm" rightIcon={<ExternalLink size={16} />} onClick={handleViewProfile}>
            View Profile
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};