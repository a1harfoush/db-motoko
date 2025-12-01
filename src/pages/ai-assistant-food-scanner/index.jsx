import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import AppHeader from '../../components/ui/AppHeader';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import InBodyScanner from '../../components/InBodyScanner';
import { callDeepSeekModel } from '../../utils/deepseekApiFinal';

const AIAssistantFoodScanner = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isTyping, setIsTyping] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const chatContainerRef = useRef(null);

  // Initial welcome message
  const [messages, setMessages] = useState([{
    id: 1,
    message: "Hello! I'm your AI fitness coach. I can analyze your InBody reports and provide personalized fitness advice. How can I assist you today?",
    isUser: false,
    timestamp: new Date()
  }]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef?.current) {
      chatContainerRef.current.scrollTop = chatContainerRef?.current?.scrollHeight;
    }
  }, [messages, isTyping]);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    if (savedTheme === 'dark') document.documentElement?.classList?.add('dark');
    else document.documentElement?.classList?.remove('dark');
  }, []);

  const handleSendMessage = async (message) => {
    const messageId = Date.now() + Math.random();
    const userMessage = {
      id: messageId,
      message,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const systemMessage = `You are ATOS FIT AI Coach, a friendly fitness assistant specializing in body composition analysis and fitness coaching. Help users with workouts, nutrition, and fitness advice based on their InBody data. Be encouraging and concise. Support both English and Arabic. Focus only on fitness and health topics.`;

      // Pass the current conversation history to maintain context
      const aiText = await callDeepSeekModel(message, systemMessage, messages);
      const aiMessageId = Date.now() + Math.random();
      setMessages(prev => [...prev, {
        id: aiMessageId,
        message: aiText,
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('DeepSeek API Error:', error);

      // Show the actual error message from DeepSeek API
      let errorMessage = error.message || 'Error contacting AI service. Please try again.';

      // Add some helpful context for common errors
      if (error.message.includes('proxy server')) {
        errorMessage = '🔧 For full AI functionality, please start the proxy server with: node proxy-server.js';
      } else if (error.message.includes('Authentication failed')) {
        errorMessage = '🔑 Authentication failed: Invalid or expired DeepSeek API key';
      } else if (error.message.includes('Rate limit exceeded')) {
        errorMessage = '⏱️ Rate limit exceeded: Too many requests to DeepSeek API. Please wait a moment.';
      } else if (error.message.includes('server error') || error.message.includes('temporarily unavailable')) {
        errorMessage = '🔧 DeepSeek API temporarily unavailable. Please try again later.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '⏱️ Request timeout: The AI service took too long to respond. Please try again.';
      } else if (error.message.includes('Network error')) {
        errorMessage = '🌐 Network error: Cannot connect to DeepSeek API. Check your internet connection.';
      }

      const errorMessageId = Date.now() + Math.random();
      setMessages(prev => [...prev, {
        id: errorMessageId,
        message: errorMessage,
        isUser: false,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInBodyScan = (scanData) => {
    setShowScanner(false);
    
    // Create a detailed message about the InBody results
    const inBodyMessage = `📊 **InBody Analysis Results:**

**Body Composition:**
• Weight: ${scanData.weight?.toFixed(1)} kg
• Body Fat: ${scanData.bodyFat?.toFixed(1)}%
• Muscle Mass: ${scanData.muscleMass?.toFixed(1)} kg
• BMI: ${scanData.bmi?.toFixed(1)}

**Additional Metrics:**
• Visceral Fat Level: ${scanData.visceralFat}
• Body Water: ${scanData.bodyWater?.toFixed(1)}%
• Protein: ${scanData.protein?.toFixed(1)} kg
• Mineral: ${scanData.mineral?.toFixed(1)} kg

Please analyze my body composition and provide personalized fitness and nutrition recommendations based on these results.`;

    // Add the InBody data message with unique ID
    const inBodyMessageId = Date.now() + Math.random();
    const userMessage = { 
      id: inBodyMessageId, 
      message: inBodyMessage, 
      isUser: true, 
      timestamp: new Date(),
      isInBodyData: true,
      scanData: scanData
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Wait a moment to ensure different timestamps, then get AI analysis
    setTimeout(() => {
      handleSendMessage(inBodyMessage);
    }, 10);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleTheme = () => {
    setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader
        onSidebarToggle={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onThemeToggle={toggleTheme}
        currentTheme={currentTheme}
        user={JSON.parse(localStorage.getItem('user')) || {}}
        onLogout={handleLogout}
      />
      {/* Sidebar */}
      <SidebarNavigation
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      {/* Main Content */}
      <main className="pt-16 lg:pl-72 min-h-screen">
        <div className="p-4 lg:p-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </button>
            <Icon name="ChevronRight" size={16} />
            <span className="text-foreground">AI Chatbot</span>
          </div>

          {/* Chat Container */}
          <div className="bg-card border border-border rounded-xl h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Icon name="Bot" size={20} color="white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">ATOS fit AI Coach</h3>
                    <p className="text-sm text-muted-foreground flex items-center space-x-1">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span>Online</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowScanner(!showScanner)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="InBody Scanner"
                  >
                    <Icon name="Scan" size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto">
              {showScanner && (
                <div className="p-4 border-b border-border">
                  <InBodyScanner 
                    onScanComplete={handleInBodyScan}
                    onClose={() => setShowScanner(false)}
                  />
                </div>
              )}
              <div ref={chatContainerRef} className="p-4 space-y-4">
                {messages?.map((m) => (
                  <ChatMessage 
                    key={m?.id} 
                    message={m?.message} 
                    isUser={m?.isUser} 
                    timestamp={m?.timestamp}
                  />
                ))}
                {isTyping && <ChatMessage message="" isUser={false} timestamp={new Date()} isTyping={true} />}
              </div>
            </div>

            {/* Chat Input */}
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isTyping}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIAssistantFoodScanner;
