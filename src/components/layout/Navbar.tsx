import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, X, Bell, MessageCircle, User, LogOut, Building2, CircleDollarSign, Users, FolderOpen, Wallet, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const dashboardRoute = user?.role === 'entrepreneur' 
    ? '/dashboard/entrepreneur' 
    : '/dashboard/investor';
  
  const profileRoute = user 
    ? `/profile/${user.role}/${user.id}` 
    : '/login';
  
  // 1. SIRF LAPTOP KE LIYE ORIGINAL LINKS (Clean & Short)
  const desktopNavLinks = [
    {
      icon: user?.role === 'entrepreneur' ? <Building2 size={18} /> : <CircleDollarSign size={18} />,
      text: 'Dashboard',
      path: dashboardRoute,
    },
    {
      icon: <MessageCircle size={18} />,
      text: 'Messages',
      path: user ? '/messages' : '/login',
    },
    {
      icon: <Bell size={18} />,
      text: 'Notifications',
      path: user ? '/notifications' : '/login',
    },
    {
      icon: <User size={18} />,
      text: 'Profile',
      path: profileRoute,
    }
  ];

  // 2. MOBILE KE LIYE FULL LINKS (Settings, Wallet, Documents waghera ke sath)
  const mobileNavLinks = [
    ...desktopNavLinks, // Upar wale 4 original links
    {
      icon: user?.role === 'entrepreneur' ? <CircleDollarSign size={18} /> : <Users size={18} />,
      text: user?.role === 'entrepreneur' ? 'Find Investors' : 'Find Startups',
      path: user?.role === 'entrepreneur' ? '/investors' : '/entrepreneurs',
    },
    {
      icon: <FolderOpen size={18} />,
      text: 'Documents',
      path: user ? '/documents' : '/login',
    },
    {
      icon: <Wallet size={18} />,
      text: 'Wallet',
      path: user ? '/wallet' : '/login',
    },
    {
      icon: <Settings size={18} />,
      text: 'Settings',
      path: user ? '/settings' : '/login',
    }
  ];
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">Business Nexus</span>
            </Link>
          </div>
          
          {/* DESKTOP NAVIGATION (Sirf Original 4 Links) */}
          <div className="hidden lg:flex lg:items-center lg:ml-6">
            {user ? (
              <div className="flex items-center space-x-2 xl:space-x-4">
                {desktopNavLinks.map((link, index) => (
                  <Link
                    key={index}
                    to={link.path}
                    className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  >
                    <span className="mr-1.5">{link.icon}</span>
                    <span className="hidden xl:block">{link.text}</span>
                  </Link>
                ))}
                
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                
                <Button 
                  variant="ghost"
                  onClick={handleLogout}
                  size="sm"
                  className="text-gray-600 hover:text-red-600"
                >
                  <LogOut size={18} className="mr-1.5" />
                  <span className="hidden xl:block">Logout</span>
                </Button>
                
                <Link to={profileRoute} className="flex items-center space-x-2 ml-2 pl-2 border-l border-gray-200">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name}
                    size="sm"
                    status={user.isOnline ? 'online' : 'offline'}
                  />
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap max-w-[120px] truncate">
                    {user.name}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login"><Button variant="outline" size="sm">Log in</Button></Link>
                <Link to="/register"><Button size="sm">Sign up</Button></Link>
              </div>
            )}
          </div>
          
          {/* MOBILE MENU BUTTON */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-50 focus:outline-none"
            >
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* MOBILE MENU DRAWER (Saray Full Links Yahan Aayenge) */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 animate-fade-in shadow-lg absolute w-full z-50">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 h-[calc(100vh-4rem)] overflow-y-auto">
            {user ? (
              <>
                <div className="flex items-center space-x-3 px-3 py-4 bg-gray-50 rounded-lg mb-2">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name}
                    size="md"
                    status={user.isOnline ? 'online' : 'offline'}
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{user.name}</p>
                    <p className="text-xs font-medium text-primary-600 capitalize">{user.role}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-2 space-y-1">
                  {mobileNavLinks.map((link, index) => (
                    <Link
                      key={index}
                      to={link.path}
                      className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="mr-3 text-gray-400">{link.icon}</span>
                      {link.text}
                    </Link>
                  ))}
                  
                  <div className="border-t border-gray-100 my-2 pt-2"></div>
                  
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="flex w-full items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={18} className="mr-3" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col space-y-3 px-3 py-4">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" fullWidth>Log in</Button>
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button fullWidth>Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};