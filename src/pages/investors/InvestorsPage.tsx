import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { InvestorCard } from '../../components/investor/InvestorCard';
import { investors } from '../../data/users';
import API from '../../api'; // Backend se data lanay k liye

export const InvestorsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  // Real DB Users State
  const [realInvestors, setRealInvestors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Backend se real investors fetch kar rahe hain
  useEffect(() => {
    const fetchRealInvestors = async () => {
      try {
        const response = await API.get('/users?role=investor');
        const formattedUsers = response.data.map((u: any) => ({
          ...u,
          id: u._id, // MongoDB ki ID map kardi
          name: u.name || u.email.split('@')[0],
          bio: u.bio || "Looking for great investment opportunities.",
          investmentStage: u.investmentStage || ["Seed", "Series A"],
          investmentInterests: u.investmentInterests || ["Technology", "AI"],
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=random`
        }));
        setRealInvestors(formattedUsers);
      } catch (error) {
        console.error("Failed to fetch real investors", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRealInvestors();
  }, []);

  // Real DB Investors aur Mock Data Investors ko mila diya
  const allCombinedInvestors = [...realInvestors, ...investors];

  // Get unique investment stages and interests from COMBINED list
  const allStages = Array.from(new Set(allCombinedInvestors.flatMap(i => i.investmentStage)));
  const allInterests = Array.from(new Set(allCombinedInvestors.flatMap(i => i.investmentInterests)));
  
  // Filter based on search and filters
  const filteredInvestors = allCombinedInvestors.filter(investor => {
    const matchesSearch = searchQuery === '' || 
      investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (investor.bio && investor.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (investor.investmentInterests && investor.investmentInterests.some((interest: string) => 
        interest.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    
    const matchesStages = selectedStages.length === 0 ||
      (investor.investmentStage && investor.investmentStage.some((stage: string) => selectedStages.includes(stage)));
    
    const matchesInterests = selectedInterests.length === 0 ||
      (investor.investmentInterests && investor.investmentInterests.some((interest: string) => selectedInterests.includes(interest)));
    
    return matchesSearch && matchesStages && matchesInterests;
  });
  
  const toggleStage = (stage: string) => {
    setSelectedStages(prev => 
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };
  
  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Investors</h1>
        <p className="text-gray-600">Connect with investors who match your startup's needs</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Investment Stage</h3>
                <div className="space-y-2">
                  {allStages.map(stage => (
                    <button
                      key={stage}
                      onClick={() => toggleStage(stage)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                        selectedStages.includes(stage)
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Investment Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {allInterests.map(interest => (
                    <Badge
                      key={interest}
                      variant={selectedInterests.includes(interest) ? 'primary' : 'gray'}
                      className="cursor-pointer"
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Location</h3>
                <div className="space-y-2">
                  <button className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    <MapPin size={16} className="mr-2" />
                    San Francisco, CA
                  </button>
                  <button className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    <MapPin size={16} className="mr-2" />
                    New York, NY
                  </button>
                  <button className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    <MapPin size={16} className="mr-2" />
                    Boston, MA
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search investors by name, interests, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />
            
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                 {isLoading ? 'Loading...' : `${filteredInvestors.length} results`}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredInvestors.map(investor => (
              <InvestorCard
                key={investor.id}
                investor={investor}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};