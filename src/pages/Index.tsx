import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LightCounter } from '@/components/LightCounter';
import { DailyStreakCard } from '@/components/DailyStreakCard';
import { CommunityActionsCard } from '@/components/CommunityActionsCard';
import { TierBadge } from '@/components/TierBadge';
import { usePoints } from '@/hooks/usePoints';
import { Heart, Users, Sparkles, Camera, BarChart3, Trophy } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { userTier } = usePoints();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 text-pink-500" />
            <h1 className="text-xl font-bold">Fiber Companion</h1>
            {userTier && (
              <TierBadge tier={userTier.current_tier} showTitle={false} size="sm" />
            )}
          </div>
          <div className="flex items-center gap-4">
            {userTier && (
              <LightCounter 
                totalLight={userTier.total_light} 
                variant="compact"
              />
            )}
            <span className="text-sm text-muted-foreground">
              Welcome, {user.email}
            </span>
            <Button 
              variant="outline" 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2"
            >
              Profile
            </Button>
            <Button 
              onClick={() => navigate('/profile-registration')}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Complete Health Profile
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Gamification Dashboard */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <DailyStreakCard />
          <CommunityActionsCard />
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="h-12 w-12 text-pink-500" />
            <Sparkles className="h-8 w-8 text-purple-500" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Welcome to Fiber Companion</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with others who understand your journey. Create your Romantic Morgellons Monster 
            and find meaningful connections based on shared experiences.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur rounded-lg p-6 border border-border">
            <Heart className="h-8 w-8 text-pink-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create Your Monster</h3>
            <p className="text-muted-foreground mb-4">
              Design your unique Romantic Morgellons Monster persona to represent your inner self.
            </p>
            <Button 
              onClick={() => navigate('/create-monster')}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Create Monster
            </Button>
          </div>
          
          <div className="bg-white/60 backdrop-blur rounded-lg p-6 border border-border">
            <Users className="h-8 w-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Find Connections</h3>
            <p className="text-muted-foreground mb-4">
              Match with others based on similar symptoms, experiences, and interests.
            </p>
            <Button 
              onClick={() => navigate('/connections')}
              variant="outline" 
              className="w-full"
            >
              Find Connections
            </Button>
          </div>
          
          <div className="bg-white/60 backdrop-blur rounded-lg p-6 border border-border">
            <Sparkles className="h-8 w-8 text-indigo-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">What Works</h3>
            <p className="text-muted-foreground mb-4">
              Explore anonymous community knowledge about treatments and strategies that bring real relief.
            </p>
            <Button 
              onClick={() => navigate('/what-works')}
              variant="outline" 
              className="w-full"
            >
              Browse Knowledge Base
            </Button>
          </div>
          
          <div className="bg-white/60 backdrop-blur rounded-lg p-6 border border-border">
            <Camera className="h-8 w-8 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Photo Challenges</h3>
            <p className="text-muted-foreground mb-4">
              Track your symptoms with daily photos and build healthy habits through gamified challenges.
            </p>
            <Button 
              onClick={() => navigate('/photo-challenges')}
              variant="outline" 
              className="w-full"
            >
              Start Challenge
            </Button>
          </div>
          
          <div className="bg-white/60 backdrop-blur rounded-lg p-6 border border-border">
            <Trophy className="h-8 w-8 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Achievements</h3>
            <p className="text-muted-foreground mb-4">
              Track your progress in the fight against the monster. Earn Light and unlock tiers in the Resistance.
            </p>
            <Button 
              onClick={() => navigate('/achievements')}
              variant="outline" 
              className="w-full"
            >
              View Achievements
            </Button>
          </div>
          
          <div className="bg-white/60 backdrop-blur rounded-lg p-6 border border-border">
            <BarChart3 className="h-8 w-8 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Community Analytics</h3>
            <p className="text-muted-foreground mb-4">
              View anonymous patterns and insights from community data to help researchers find better treatments.
            </p>
            <Button 
              onClick={() => navigate('/analytics')}
              variant="outline" 
              className="w-full"
            >
              View Insights
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
