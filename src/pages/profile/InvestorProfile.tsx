import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Building2, MapPin, UserCircle, BarChart3, Briefcase } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { findUserById } from '../../data/users';
import API from '../../api'; // Yeh import add karna mat bhoolna

export const InvestorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  
  const [investor, setInvestor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);


useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      
      // 1. Pehle check karein agar logged-in user apni hi profile dekh raha hai
      if (currentUser && currentUser.id === id) {
        setInvestor({
          ...currentUser,
          totalInvestments: 0,
          investmentStage: ["Seed", "Series A"],
          investmentInterests: ["Technology", "AI", "CleanTech"],
          bio: "Welcome to my investor profile! I am currently setting up my details.",
          portfolioCompanies: [],
          minimumInvestment: "$50K",
          maximumInvestment: "$250K"
        });
        setIsLoading(false);
        return;
      }

      try {
        // 2. Agar current user nahi hai, toh backend se us ID ka data fetch karein
        const response = await API.get(`/users/${id}`); // Assuming aapki aisi koi API route hai
        const userData = response.data;
        
        // Data ko theek se format kar lein
        setInvestor({
          ...userData,
          id: userData._id || userData.id,
          name: userData.name || userData.email.split('@')[0],
          // Default values de dein agar backend se na aayein
          totalInvestments: userData.totalInvestments || 0,
          investmentStage: userData.investmentStage || ["Seed", "Series A"],
          investmentInterests: userData.investmentInterests || ["Technology", "AI"],
          bio: userData.bio || "Looking for great investment opportunities.",
          portfolioCompanies: userData.portfolioCompanies || [],
          minimumInvestment: userData.minimumInvestment || "$50K",
          maximumInvestment: userData.maximumInvestment || "$250K"
        });

      } catch (error) {
        console.error("Failed to fetch real investor from DB:", error);
        
        // 3. Fallback: Agar backend se fail ho jaye, toh mock data check karein (Demo accounts ke liye)
        const mockUser = findUserById(id || '');
        if (mockUser) {
          setInvestor(mockUser);
        } else {
          setInvestor(null); // Agar mock mein bhi na mile
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [id, currentUser]);


  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    );
  }
  
  if (!investor || investor.role !== 'investor') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Investor not found</h2>
        <p className="text-gray-600 mt-2">The investor profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard/entrepreneur">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }
  
  const isCurrentUser = currentUser?.id === investor.id;
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={investor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(investor.name || 'User')}&background=random`}
              alt={investor.name}
              size="xl"
              status={investor.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{investor.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Investor • {investor.totalInvestments} investments
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="primary">
                  <MapPin size={14} className="mr-1" />
                  San Francisco, CA
                </Badge>
                {investor.investmentStage?.map((stage: string, index: number) => (
                  <Badge key={index} variant="secondary">{stage}</Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <Link to={`/chat/${investor.id}`}>
                <Button
                  leftIcon={<MessageCircle size={18} />}
                >
                  Message
                </Button>
              </Link>
            )}
            
            {isCurrentUser && (
              <Button
                variant="outline"
                leftIcon={<UserCircle size={18} />}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">{investor.bio}</p>
            </CardBody>
          </Card>
          
          {/* Investment Interests */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Interests</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900">Industries</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {investor.investmentInterests?.map((interest: string, index: number) => (
                      <Badge key={index} variant="primary">{interest}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900">Investment Stages</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {investor.investmentStage?.map((stage: string, index: number) => (
                      <Badge key={index} variant="secondary">{stage}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900">Investment Criteria</h3>
                  <ul className="mt-2 space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Strong founding team with domain expertise
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Clear market opportunity and product-market fit
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Scalable business model with strong unit economics
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Potential for significant growth and market impact
                    </li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Portfolio Companies */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Portfolio Companies</h2>
              <span className="text-sm text-gray-500">{investor.portfolioCompanies?.length || 0} companies</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {investor.portfolioCompanies?.map((company: string, index: number) => (
                  <div key={index} className="flex items-center p-3 border border-gray-200 rounded-md">
                    <div className="p-3 bg-primary-50 rounded-md mr-3">
                      <Briefcase size={18} className="text-primary-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{company}</h3>
                      <p className="text-xs text-gray-500">Invested in 2022</p>
                    </div>
                  </div>
                ))}
                {(!investor.portfolioCompanies || investor.portfolioCompanies.length === 0) && (
                  <p className="text-sm text-gray-500">No portfolio companies yet.</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Investment Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Details</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Investment Range</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {investor.minimumInvestment} - {investor.maximumInvestment}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Total Investments</span>
                  <p className="text-md font-medium text-gray-900">{investor.totalInvestments} companies</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Typical Investment Timeline</span>
                  <p className="text-md font-medium text-gray-900">3-5 years</p>
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Investment Focus</span>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">SaaS & B2B</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">FinTech</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">HealthTech</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Stats */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Stats</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Successful Exits</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">4</p>
                    </div>
                    <BarChart3 size={24} className="text-primary-600" />
                  </div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Avg. ROI</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">3.2x</p>
                    </div>
                    <BarChart3 size={24} className="text-primary-600" />
                  </div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Active Investments</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">{investor.portfolioCompanies?.length || 0}</p>
                    </div>
                    <BarChart3 size={24} className="text-primary-600" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};