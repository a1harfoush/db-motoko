import React, { useState, useRef } from 'react';
import Icon from './AppIcon';
import Button from './ui/Button';
import { scanInBodyDocument } from '../utils/huaweiOCR';

const InBodyScanner = ({ onScanComplete, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, BMP, TIFF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      console.log('📸 Scanning InBody document:', file.name);
      
      // Scan the document (no debug mode in main app)
      const result = await scanInBodyDocument(file, false);
      
      if (result.success) {
        const scanData = {
          ...result.data,
          image: URL.createObjectURL(file),
          fileName: file.name,
          fileSize: file.size,
          metadata: result.metadata
        };
        
        setScanResult(scanData);
        console.log('✅ InBody scan completed:', scanData);
      } else {
        throw new Error('Failed to scan InBody document');
      }
      
    } catch (error) {
      console.error('❌ InBody scan error:', error);
      alert('Unable to process the image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleUseScan = () => {
    if (scanResult && onScanComplete) {
      onScanComplete(scanResult);
    }
  };

  const handleNewScan = () => {
    setScanResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatValue = (value, unit = '') => {
    if (typeof value === 'number') {
      return `${value.toFixed(1)}${unit}`;
    }
    return 'N/A';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Icon name="Scan" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">InBody Scanner</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        )}
      </div>

      {!scanResult ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your InBody report to get personalized body composition analysis
          </p>



          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isScanning ? (
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">Scanning InBody Document...</p>
                  <p className="text-xs text-muted-foreground">Using Huawei Cloud OCR</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Icon name="Upload" size={48} className="mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-card-foreground mb-2">
                    Drag & drop your InBody report here
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports PNG, JPG, JPEG, BMP, TIFF (max 10MB)
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                  >
                    <Icon name="FolderOpen" size={16} className="mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        /* Scan Results */
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-success">
            <Icon name="CheckCircle" size={16} />
            <span>InBody document scanned successfully!</span>
          </div>

          {/* Scanned Image Preview */}
          <div className="relative">
            <img
              src={scanResult.image}
              alt="Scanned InBody Report"
              className="w-full h-32 object-cover rounded-lg border border-border"
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {scanResult.fileName}
            </div>
          </div>

          {/* Extracted Data */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span className="font-medium">{formatValue(scanResult.weight, ' kg')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Body Fat:</span>
                <span className="font-medium">{formatValue(scanResult.bodyFat, '%')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Muscle Mass:</span>
                <span className="font-medium">{formatValue(scanResult.muscleMass, ' kg')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BMI:</span>
                <span className="font-medium">{formatValue(scanResult.bmi)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visceral Fat:</span>
                <span className="font-medium">{formatValue(scanResult.visceralFat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Body Water:</span>
                <span className="font-medium">{formatValue(scanResult.bodyWater, '%')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protein:</span>
                <span className="font-medium">{formatValue(scanResult.protein, ' kg')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mineral:</span>
                <span className="font-medium">{formatValue(scanResult.mineral, ' kg')}</span>
              </div>
            </div>
          </div>

          {/* Metadata - Clean version for main app */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <div className="flex justify-between mb-1">
              <span>Analysis Service:</span>
              <span className="font-medium text-primary">
                InBody Analysis
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Confidence:</span>
              <span>85%</span>
            </div>
            <div className="flex justify-between">
              <span>Metrics Analyzed:</span>
              <span>8 values</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button onClick={handleUseScan} className="flex-1">
              <Icon name="MessageSquare" size={16} className="mr-2" />
              Get AI Analysis
            </Button>
            <Button onClick={handleNewScan} variant="outline">
              <Icon name="RotateCcw" size={16} className="mr-2" />
              New Scan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InBodyScanner;