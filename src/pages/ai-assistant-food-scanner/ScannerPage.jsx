import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/ui/AppHeader';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import Icon from '../../components/AppIcon';
import FoodScannerCamera from './components/FoodScannerCamera';
import FoodAnalysisResult from './components/FoodAnalysisResult';
import ScanHistory from './components/ScanHistory';

const ScannerPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleTheme = () => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light');
  const handleLogout = () => navigate('/login-screen');

  const FOOD_SCANNER_API_KEY = import.meta.env.VITE_FOOD_SCANNER_API_KEY;
  const handleFoodCapture = async (file, scanType) => {
    setIsScanning(true);
    try {
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const imageBase64 = await toBase64(file);
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': FOOD_SCANNER_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: file.type, data: imageBase64 } },
            { text: 'Analyze this food image and return JSON with name, calories, protein, carbohydrates, fat, sugar, serving_size, recommendation, allergens, health_score.' }
          ] }]
        })
      });
      const data = await response.json();
      let result = null;
      let rawText = '';
      if (Array.isArray(data?.candidates) && data.candidates.length > 0) {
        const parts = data.candidates[0]?.content?.parts;
        if (Array.isArray(parts) && parts.length > 0 && typeof parts[0].text === 'string') {
          rawText = parts[0].text;
          let jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { result = JSON.parse(jsonMatch[0]); } catch {}
          }
        }
      }
      if (!result) result = { name: 'Unknown', recommendation: rawText || 'No prediction', scanType };
      result.image = URL.createObjectURL(file);
      result.scanType = scanType;
      result.timestamp = new Date();
      setScanResult(result);
    } catch (e) {
      setScanResult({ name: 'Error', recommendation: 'Error contacting AI service.', image: URL.createObjectURL(file), scanType, timestamp: new Date() });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToHistory = (result) => {
    const item = { ...result, id: Date.now() };
    setScanHistory(prev => [item, ...prev]);
    setScanResult(null);
  };

  const handleNewScan = () => setScanResult(null);
  const handleReanalyze = (scan) => setScanResult(scan);
  const handleClearHistory = () => setScanHistory([]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        onSidebarToggle={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onThemeToggle={toggleTheme}
        currentTheme={currentTheme}
        user={JSON.parse(localStorage.getItem('user')) || {}}
        onLogout={handleLogout}
      />
      <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="pt-16 lg:pl-72 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => navigate('/dashboard')} className="hover:text-foreground transition-colors">Dashboard</button>
            <Icon name="ChevronRight" size={16} />
            <span className="text-foreground">Food Scanner</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6">
              {scanResult ? (
                <FoodAnalysisResult result={scanResult} onSaveToHistory={handleSaveToHistory} onNewScan={handleNewScan} />
              ) : (
                <FoodScannerCamera onCapture={handleFoodCapture} onUpload={handleFoodCapture} isScanning={isScanning} />
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <ScanHistory history={scanHistory} onReanalyze={handleReanalyze} onClearHistory={handleClearHistory} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScannerPage;


