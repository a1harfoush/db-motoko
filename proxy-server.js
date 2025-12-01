/**
 * DeepSeek API Proxy Server - Auto-starts with the main app
 * Handles CORS and forwards requests to Huawei ModelArts
 * Automatically started by npm start/dev commands
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// DeepSeek API Configuration (from environment variables)
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api-ap-southeast-1.modelarts-maas.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Huawei OCR Configuration
const HUAWEI_OCR_AK = process.env.HUAWEI_OCR_AK;
const HUAWEI_OCR_SK = process.env.HUAWEI_OCR_SK;
const HUAWEI_OCR_REGION = process.env.HUAWEI_OCR_REGION || 'ap-southeast-1';
const HUAWEI_OCR_ENDPOINT = `https://ocr.${HUAWEI_OCR_REGION}.myhuaweicloud.com`;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:4028', 'http://localhost:3000', 'http://127.0.0.1:4028'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Handle GET requests to /api/deepseek (for testing)
app.get('/api/deepseek', (req, res) => {
  res.json({
    message: 'DeepSeek API Proxy is running',
    usage: 'Send POST requests to this endpoint with messages array',
    example: {
      method: 'POST',
      body: {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      }
    }
  });
});

// DeepSeek API proxy endpoint
app.post('/api/deepseek', async (req, res) => {
  try {
    console.log('🚀 DeepSeek Proxy Request Started');
    console.log('📤 Request Body:', JSON.stringify(req.body, null, 2));
    
    // Log message details for debugging
    if (req.body.messages) {
      console.log('📋 Messages breakdown:');
      req.body.messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.role}: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`);
        
        // Check for any problematic characters
        if (msg.content.includes('\n')) {
          console.log(`    ⚠️  Contains newlines`);
        }
        if (msg.content.includes('\r')) {
          console.log(`    ⚠️  Contains carriage returns`);
        }
        if (msg.content.includes('\t')) {
          console.log(`    ⚠️  Contains tabs`);
        }
        if (msg.content.includes('"')) {
          console.log(`    ⚠️  Contains quotes`);
        }
      });
    }

    const { messages, model = 'deepseek-v3.1', ...options } = req.body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: messages array is required'
      });
    }

    // Prepare request payload according to official docs
    const requestPayload = {
      model: 'deepseek-v3.1', // Fixed model name as per docs
      messages: messages,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.top_p || 0.9,
      stream: false, // Keep it simple for now
      ...options
    };

    console.log('📡 Sending to DeepSeek API:', {
      url: DEEPSEEK_API_URL,
      model: requestPayload.model,
      messageCount: messages.length,
      maxTokens: requestPayload.max_tokens
    });

    // Use only Bearer token method (X-Auth-Token is invalid)
    const authMethods = [
      { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` }
    ];

    let lastError = null;

    for (let i = 0; i < authMethods.length; i++) {
      try {
        console.log(`🔐 Trying auth method ${i + 1}:`, Object.keys(authMethods[i])[0]);

        const response = await axios.post(DEEPSEEK_API_URL, requestPayload, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...authMethods[i]
          },
          timeout: 60000 // 60 second timeout as per docs
        });

        console.log('✅ DeepSeek API Success!');
        console.log('📥 Response Status:', response.status);
        console.log('📝 Response Data:', JSON.stringify(response.data, null, 2));

        // Return the successful response
        return res.json(response.data);

      } catch (error) {
        lastError = error;
        console.log(`❌ Auth method ${i + 1} failed:`, error.response?.status, error.response?.statusText);

        if (error.response) {
          console.log('❌ Error Response Data:', JSON.stringify(error.response.data, null, 2));
          console.log('❌ Error Headers:', error.response.headers);
        } else {
          console.log('❌ Network Error:', error.message);
        }

        // If this is the last method, we'll handle the error below
        if (i === authMethods.length - 1) {
          break;
        }
      }
    }

    // If we get here, all auth methods failed
    if (lastError?.response) {
      console.error('❌ All auth methods failed. Last error:', lastError.response.data);
      return res.status(lastError.response.status).json({
        error: 'DeepSeek API Error',
        details: lastError.response.data,
        status: lastError.response.status
      });
    } else {
      console.error('❌ Network or other error:', lastError.message);
      return res.status(500).json({
        error: 'Network Error',
        details: lastError.message
      });
    }

  } catch (error) {
    console.error('❌ Proxy Server Error:', error);
    res.status(500).json({
      error: 'Proxy server error',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'DeepSeek proxy server is running',
    timestamp: new Date().toISOString(),
    apiUrl: DEEPSEEK_API_URL
  });
});

// Huawei OCR proxy endpoint with enhanced debugging
app.post('/api/huawei-ocr', async (req, res) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substr(2, 9),
    steps: []
  };

  try {
    console.log(`🔍 Huawei OCR Proxy Request Started [${debugInfo.requestId}]`);
    debugInfo.steps.push({ step: 'request_started', timestamp: new Date().toISOString() });
    
    console.log('🔑 Using AK:', HUAWEI_OCR_AK ? HUAWEI_OCR_AK.substring(0, 8) + '...' : 'NOT SET');
    console.log('🔑 Using SK:', HUAWEI_OCR_SK ? HUAWEI_OCR_SK.substring(0, 8) + '...' : 'NOT SET');
    console.log('🌍 Region:', HUAWEI_OCR_REGION);
    
    const { image, detect_direction = true, extract_type = ["text", "table"] } = req.body;
    
    // Validation
    if (!image) {
      debugInfo.steps.push({ step: 'validation_failed', error: 'No image data' });
      return res.status(400).json({
        success: false,
        error: 'Image data is required',
        debugInfo
      });
    }
    
    if (!HUAWEI_OCR_AK || !HUAWEI_OCR_SK) {
      debugInfo.steps.push({ step: 'credentials_missing' });
      return res.status(500).json({
        success: false,
        error: 'Huawei OCR credentials not configured',
        debugInfo
      });
    }
    
    debugInfo.steps.push({ step: 'validation_passed' });
    console.log('✅ Validation passed');
    
    // Prepare request
    console.log('📡 Preparing OCR API call to Huawei Cloud...');
    const ocrEndpoint = `https://ocr.${HUAWEI_OCR_REGION}.myhuaweicloud.com/v2/ocr/general-text`;
    console.log('🌐 OCR Endpoint:', ocrEndpoint);
    
    debugInfo.endpoint = ocrEndpoint;
    debugInfo.steps.push({ step: 'endpoint_prepared', endpoint: ocrEndpoint });
    
    // Generate authentication
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    debugInfo.timestamp_generated = timestamp;
    
    const requestBody = {
      image: image.substring(0, 50) + '...', // Truncate for logging
      detect_direction: detect_direction,
      extract_type: extract_type
    };
    
    const fullRequestBody = {
      image: image,
      detect_direction: detect_direction,
      extract_type: extract_type
    };
    
    const bodyString = JSON.stringify(fullRequestBody);
    debugInfo.request_body_size = bodyString.length;
    debugInfo.steps.push({ step: 'request_body_prepared', size: bodyString.length });
    
    console.log('🔐 Generating authentication signature...');
    
    try {
      const signature = generateHuaweiCloudSignature(
        'POST',
        '/v2/ocr/general-text',
        '',
        {
          'Content-Type': 'application/json',
          'X-Sdk-Date': timestamp,
          'Host': `ocr.${HUAWEI_OCR_REGION}.myhuaweicloud.com`
        },
        bodyString,
        timestamp
      );
      
      debugInfo.steps.push({ step: 'signature_generated' });
      console.log('✅ Authentication signature generated');
      
      const headers = {
        'Content-Type': 'application/json',
        'X-Sdk-Date': timestamp,
        'Host': `ocr.${HUAWEI_OCR_REGION}.myhuaweicloud.com`,
        'Authorization': signature
      };
      
      debugInfo.headers = {
        'Content-Type': headers['Content-Type'],
        'X-Sdk-Date': headers['X-Sdk-Date'],
        'Host': headers['Host'],
        'Authorization': signature.substring(0, 50) + '...' // Truncate for security
      };

      console.log('📤 Sending request to Huawei OCR API...');
      debugInfo.steps.push({ step: 'api_call_started', timestamp: new Date().toISOString() });

      // Make the actual API call
      const response = await axios.post(ocrEndpoint, fullRequestBody, {
        headers: headers,
        timeout: 30000
      });

      debugInfo.steps.push({ 
        step: 'api_call_success', 
        status: response.status,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Huawei OCR API Success!');
      console.log('📥 Response Status:', response.status);
      console.log('📊 Response Data Keys:', Object.keys(response.data || {}));
      
      // Check if we have the expected response structure
      if (response.data && response.data.result) {
        const wordCount = response.data.result.words_block_list ? response.data.result.words_block_list.length : 0;
        console.log(`📝 Extracted ${wordCount} text blocks`);
        debugInfo.extracted_blocks = wordCount;
      }
      
      res.json({
        success: true,
        result: response.data.result,
        debugInfo
      });
      
    } catch (signatureError) {
      debugInfo.steps.push({ step: 'signature_failed', error: signatureError.message });
      console.error('❌ Signature generation failed:', signatureError);
      throw signatureError;
    }
    
  } catch (error) {
    console.error(`❌ Huawei OCR API Error [${debugInfo.requestId}]:`, error.message);
    debugInfo.steps.push({ 
      step: 'error_occurred', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    if (error.response) {
      console.error('❌ Error Response Status:', error.response.status);
      console.error('❌ Error Response Data:', error.response.data);
      console.error('❌ Error Response Headers:', Object.keys(error.response.headers || {}));
      
      debugInfo.error_response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: Object.keys(error.response.headers || {})
      };
      
      // Provide specific error analysis
      let errorAnalysis = 'Unknown error';
      if (error.response.status === 401) {
        errorAnalysis = 'Authentication failed - check AK/SK credentials';
      } else if (error.response.status === 403) {
        errorAnalysis = 'Access forbidden - check permissions and service activation';
      } else if (error.response.status === 404) {
        errorAnalysis = 'Service not found - check region and endpoint URL';
      } else if (error.response.status === 429) {
        errorAnalysis = 'Rate limit exceeded - too many requests';
      } else if (error.response.status >= 500) {
        errorAnalysis = 'Server error - Huawei Cloud service issue';
      }
      
      debugInfo.error_analysis = errorAnalysis;
      console.log('💡 Error Analysis:', errorAnalysis);
      
      res.status(error.response.status).json({
        success: false,
        error: `Huawei OCR API error: ${error.response.status} - ${error.response.statusText}`,
        details: error.response.data,
        analysis: errorAnalysis,
        debugInfo
      });
    } else if (error.code === 'ECONNREFUSED') {
      debugInfo.error_analysis = 'Connection refused - check network and endpoint';
      res.status(500).json({
        success: false,
        error: 'Cannot connect to Huawei OCR service',
        details: 'Connection refused - check network connectivity',
        analysis: 'Network connectivity issue or incorrect endpoint',
        debugInfo
      });
    } else if (error.code === 'ETIMEDOUT') {
      debugInfo.error_analysis = 'Request timeout - service too slow or network issue';
      res.status(500).json({
        success: false,
        error: 'OCR request timeout',
        details: 'Request took too long to complete',
        analysis: 'Service timeout - try with smaller image or check network',
        debugInfo
      });
    } else {
      console.error('❌ Network/Other Error:', error.message);
      debugInfo.error_analysis = 'Network or configuration error';
      res.status(500).json({
        success: false,
        error: 'OCR proxy server error',
        details: error.message,
        analysis: 'Network or configuration issue',
        debugInfo
      });
    }
  }
});

// Generate Huawei Cloud authentication signature
function generateHuaweiCloudSignature(method, uri, queryString, headers, body, timestamp) {
  const crypto = require('crypto');
  
  try {
    console.log('🔐 Generating Huawei Cloud signature...');
    
    // Create canonical headers
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');
    
    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');
    
    // Hash the payload
    const hashedPayload = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
    
    // Create canonical request
    const canonicalRequest = [
      method,
      uri,
      queryString,
      canonicalHeaders,
      '',
      signedHeaders,
      hashedPayload
    ].join('\n');
    
    console.log('📝 Canonical request created');
    
    // Create string to sign
    const algorithm = 'SDK-HMAC-SHA256';
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex');
    
    const stringToSign = [
      algorithm,
      timestamp,
      hashedCanonicalRequest
    ].join('\n');
    
    console.log('📝 String to sign created');
    
    // Calculate signature
    const signature = crypto.createHmac('sha256', HUAWEI_OCR_SK).update(stringToSign, 'utf8').digest('hex');
    
    console.log('✅ Signature generated successfully');
    
    // Return authorization header
    return `${algorithm} Access=${HUAWEI_OCR_AK}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
  } catch (error) {
    console.error('❌ Error generating signature:', error);
    throw error;
  }
}

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing DeepSeek API connection...');

    const testPayload = {
      model: 'deepseek-v3.1',
      messages: [
        { role: 'user', content: 'Say "API working" if you can respond.' }
      ],
      max_tokens: 50,
      temperature: 0.1
    };

    // Try both authentication methods from the documentation
    let response;
    let lastError;
    
    const authMethods = [
      { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` }
    ];
    
    for (let i = 0; i < authMethods.length; i++) {
      try {
        console.log(`🔐 Testing auth method ${i + 1}:`, Object.keys(authMethods[i])[0]);
        
        response = await axios.post(DEEPSEEK_API_URL, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...authMethods[i]
          },
          timeout: 30000
        });
        
        console.log(`✅ Auth method ${i + 1} successful!`);
        break; // Success, exit the loop
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Auth method ${i + 1} failed:`, error.response?.data || error.message);
        
        if (i === authMethods.length - 1) {
          // Last method failed, throw the error
          throw lastError;
        }
      }
    }

    res.json({
      status: 'Test successful',
      response: response.data
    });

  } catch (error) {
    res.status(500).json({
      status: 'Test failed',
      error: error.response?.data || error.message
    });
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 Proxy server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Proxy server shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log('🎯 DeepSeek Proxy Server Started (Auto-started with app)');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📡 API Endpoint: POST http://localhost:${PORT}/api/deepseek`);
  console.log(`🔍 Health Check: GET http://localhost:${PORT}/health`);
  console.log(`🧪 Test Endpoint: GET http://localhost:${PORT}/test`);
  console.log(`🔑 Using API Key: ${DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log('');
  console.log('✅ Ready to handle DeepSeek API requests!');
});

module.exports = app;