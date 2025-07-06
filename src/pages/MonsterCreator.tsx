// src/pages/MonsterCreator.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Heart, 
  Brain, 
  ArrowRight, 
  ArrowLeft, 
  Loader2,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { keywords } from '@/data/keywords';

interface MonsterProfile {
  symptoms: string[];
  coping: string[];
  personality: string[];
}

const CATEGORIES = [
  {
    key: 'symptoms' as keyof MonsterProfile,
    title: 'Your Daily Experiences',
    description: 'Select 1-3 that resonate with you',
    icon: <Heart className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-500'
  },
  {
    key: 'coping' as keyof MonsterProfile,
    title: 'What Helps You',
    description: 'Choose 1-3 strategies you use',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-purple-500 to-pink-500'
  },
  {
    key: 'personality' as keyof MonsterProfile,
    title: 'Your Monster\'s Vibe',
    description: 'Pick 1-3 personality traits',
    icon: <Brain className="w-5 h-5" />,
    color: 'from-blue-500 to-purple-500'
  }
];

export default function MonsterCreator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedKeywords, setSelectedKeywords] = useState<MonsterProfile>({
    symptoms: [],
    coping: [],
    personality: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentCategory = CATEGORIES[currentStep];
  const isLastStep = currentStep === CATEGORIES.length - 1;
  const canProceed = selectedKeywords[currentCategory.key].length > 0;

  const toggleKeyword = (category: keyof MonsterProfile, keyword: string) => {
    setSelectedKeywords(prev => {
      const currentKeywords = prev[category];
      const isSelected = currentKeywords.includes(keyword);
      
      if (isSelected) {
        // Remove keyword
        return {
          ...prev,
          [category]: currentKeywords.filter(k => k !== keyword)
        };
      } else {
        // Add keyword (max 3)
        if (currentKeywords.length >= 3) {
          toast({
            title: "Maximum reached",
            description: "You can select up to 3 keywords per category",
            variant: "default"
          });
          return prev;
        }
        return {
          ...prev,
          [category]: [...currentKeywords, keyword]
        };
      }
    });
  };

  const handleNext = () => {
    if (!canProceed) {
      toast({
        title: "Selection Required",
        description: "Please select at least one keyword to continue",
        variant: "destructive"
      });
      return;
    }

    if (isLastStep) {
      generateMonsterImage();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const generateMonsterImage = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const response = await supabase.functions.invoke('generate-monster-image', {
        body: {
          profile: selectedKeywords,
          userId: user.id
        }
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.success && response.data?.imageUrl) {
        setGeneratedImage(response.data.imageUrl);
        
        // Save the monster profile to the database
        const { error: dbError } = await supabase
          .from('profiles')
          .update({
            monster_profile: selectedKeywords,
            monster_image_url: response.data.imageUrl,
            onboarding_completed: true
          })
          .eq('id', user.id);

        if (dbError) {
          console.error('Error saving monster profile:', dbError);
          toast({
            title: "Profile saved with warning",
            description: "Your monster was created but there was an issue saving it. Please try again.",
            variant: "default"
          });
        }
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (err) {
      console.error('Error generating monster:', err);
      setError(err.message || 'Failed to generate your monster. Please try again.');
      toast({
        title: "Generation Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    navigate('/connections');
  };

  const regenerateMonster = () => {
    setGeneratedImage(null);
    setError(null);
    generateMonsterImage();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-800">Create Your Monster</h1>
            <Badge variant="secondary">
              Step {currentStep + 1} of {CATEGORIES.length}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / CATEGORIES.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!generatedImage ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${currentCategory.color} text-white`}>
                      {currentCategory.icon}
                    </div>
                    <CardTitle>{currentCategory.title}</CardTitle>
                  </div>
                  <CardDescription>{currentCategory.description}</CardDescription>
                  {selectedKeywords[currentCategory.key].length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Selected: {selectedKeywords[currentCategory.key].length}/3
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                      <p className="text-lg font-medium">Creating your unique monster...</p>
                      <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {keywords[currentCategory.key].map((keyword) => {
                          const isSelected = selectedKeywords[currentCategory.key].includes(keyword);
                          return (
                            <motion.button
                              key={keyword}
                              onClick={() => toggleKeyword(currentCategory.key, keyword)}
                              className={`
                                relative p-4 rounded-lg border-2 transition-all duration-200
                                ${isSelected 
                                  ? 'border-purple-500 bg-purple-50 shadow-md' 
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                                }
                              `}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span className={`
                                text-sm font-medium
                                ${isSelected ? 'text-purple-700' : 'text-gray-700'}
                              `}>
                                {keyword}
                              </span>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-1 right-1"
                                >
                                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>

                      {error && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={handleBack}
                          disabled={currentStep === 0}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={handleNext}
                          disabled={!canProceed}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {isLastStep ? 'Generate Monster' : 'Next'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl">
                    Meet Your Monster! 🎉
                  </CardTitle>
                  <CardDescription className="text-center">
                    Your unique companion based on your selections
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="relative mb-6">
                    <motion.img
                      src={generatedImage}
                      alt="Your generated monster"
                      className="w-64 h-64 mx-auto rounded-lg shadow-lg"
                      initial={{ rotate: -5 }}
                      animate={{ rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    />
                    <motion.div
                      className="absolute -top-4 -right-4 text-4xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      ✨
                    </motion.div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <p className="text-sm text-muted-foreground">Your monster's traits:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {Object.entries(selectedKeywords).map(([category, keywords]) => 
                        keywords.map(keyword => (
                          <Badge key={`${category}-${keyword}`} variant="secondary">
                            {keyword}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={regenerateMonster}
                      disabled={isGenerating}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      onClick={handleComplete}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      Continue to Connections
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}