import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Icon from '../../components/AppIcon';
import { updateUserProfile } from '../../utils/db';

const OnboardingScreen = () => {
  const navigate = useNavigate();
  const { isAuthenticated, principal } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: 30,
    height: 175,
    weight: 70,
    fitnessLevel: 'intermediate',
    goals: [],
  });

  const totalSteps = 2;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setCurrentTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login-screen', { replace: true });
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.name && user.email) {
          navigate('/dashboard', { replace: true });
          return;
        }
        setFormData(prev => ({ ...prev, ...user }));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const userProfile = {
        ...formData,
        principalId: principal?.toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('user', JSON.stringify({ id: principal?.toString(), ...userProfile }));
      await updateUserProfile(principal?.toString(), userProfile);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Failed to save user profile:', error);
      navigate('/dashboard', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const fitnessLevelOptions = [
    { value: 'beginner', label: 'Beginner - New to fitness' },
    { value: 'intermediate', label: 'Intermediate - Some experience' },
    { value: 'advanced', label: 'Advanced - Regular exerciser' },
  ];

  const goalOptions = [
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'endurance', label: 'Build Endurance' },
    { value: 'strength', label: 'Increase Strength' },
    { value: 'general_fitness', label: 'General Fitness' },
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to ATOS-fit!</h2>
              <p className="text-muted-foreground">Let's get to know you.</p>
            </div>
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                required
              />
              <Input
                label="Email Address (Optional)"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email (optional)"
              />
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Fitness Profile</h2>
              <p className="text-muted-foreground">These details help us tailor your experience.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Age: {formData.age}</label>
                <input
                  type="range"
                  min="13"
                  max="100"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Height: {formData.height} cm</label>
                <input
                  type="range"
                  min="100"
                  max="250"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Weight: {formData.weight} kg</label>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <Select
                label="Fitness Level"
                value={formData.fitnessLevel}
                onChange={(value) => handleInputChange('fitnessLevel', value)}
                options={fitnessLevelOptions}
                placeholder="Select your fitness level"
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Primary Goal</label>
                <div className="space-y-2">
                  {goalOptions.map((goal) => (
                    <label key={goal.value} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.goals.includes(goal.value)}
                        onChange={(e) => handleArrayChange('goals', goal.value, e.target.checked)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span className="text-foreground">{goal.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim(); // Only name is required, email is optional
      case 2:
        return formData.age && formData.height && formData.weight && formData.fitnessLevel && formData.goals.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${
      currentTheme === 'dark' ? 'dark' : ''
    }`}>
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          {renderStep()}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <Icon name="ChevronLeft" size={16} />
              <span>Previous</span>
            </Button>
            
            {currentStep === totalSteps ? (
              <Button
                onClick={handleComplete}
                disabled={!isStepValid() || isLoading}
                loading={isLoading}
                className="flex items-center space-x-2"
              >
                <Icon name="Check" size={16} />
                <span>Complete Setup</span>
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <Icon name="ChevronRight" size={16} />
              </Button>
            )}
          </div>
        </div>
        
        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              // Save minimal user data when skipping
              const minimalUserData = {
                id: principal?.toString(),
                principalId: principal?.toString(),
                name: formData.name || 'New User',
                email: formData.email || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                skippedOnboarding: true
              };
              localStorage.setItem('user', JSON.stringify(minimalUserData));
              navigate('/dashboard');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;