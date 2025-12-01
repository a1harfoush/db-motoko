/**
 * DeepSeek API Final Solution - Direct API calls
 * Based on working Python code, handles CORS properly
 */

const API_URL = "https://api-ap-southeast-1.modelarts-maas.com/v1/chat/completions";
const API_TOKEN = import.meta.env.VITE_CHATBOT_API_KEY || "4_JENf9g9NVi7_332loZt65qIydiAJCPNHhbx0irqaHtJPkfqcUCpp8tp85SlqOU8QX1lYp4AsvLtKqgx0OXRQ";

export const callDeepSeekModel = async (userMessage, systemMessage = null, conversationHistory = [], options = {}) => {
  console.log('🚀 DeepSeek Final API Request Started');
  console.log('💬 Conversation history length:', conversationHistory.length);
  console.log('📝 User message:', userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''));

  // Prepare messages array
  const messages = [];

  // Add system message first
  if (systemMessage) {
    messages.push({ role: 'system', content: systemMessage });
  }

  // Add conversation history (filtered)
  const MAX_HISTORY_MESSAGES = 10;
  const recentHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);

  recentHistory.forEach(msg => {
    if (msg.message &&
      msg.message !== "Hello! I'm your AI fitness coach. How can I assist you today?" &&
      !msg.isError &&
      !msg.message.includes('DeepSeek API error') &&
      !msg.message.includes('Error:') &&
      !msg.message.includes('🔧') &&
      !msg.message.includes('🔑') &&
      !msg.message.includes('⏱️') &&
      !msg.message.includes('🌐') &&
      !msg.message.includes('temporarily unavailable') &&
      !msg.message.includes('server error') &&
      !msg.message.startsWith('Error contacting AI service')) {
      messages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.message
      });
    }
  });

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  // Prepare payload (using working Python parameters)
  const payload = {
    model: "deepseek-v3.1",
    messages: messages,
    max_tokens: options.max_tokens || 500, // Increased for better responses
    temperature: options.temperature || 0.7, // Good balance
    top_p: options.top_p || 0.9,
    stream: false
  };

  console.log('📤 DeepSeek Request:', {
    model: payload.model,
    totalMessages: messages.length,
    maxTokens: payload.max_tokens
  });

  try {
    // Try direct API call first
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      mode: 'cors', // Explicitly set CORS mode
      credentials: 'omit' // Don't send credentials
    });

    console.log('📥 API Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      // Handle specific errors
      if (response.status === 401) {
        throw new Error('🔑 Authentication failed: Invalid DeepSeek API key');
      } else if (response.status === 429) {
        throw new Error('⏱️ Rate limit exceeded: Too many requests');
      } else if (response.status === 403) {
        throw new Error('🚫 Request blocked: Content may violate policies');
      } else if (response.status >= 500) {
        throw new Error('🔧 DeepSeek API server error: Please try again later');
      } else {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (!message) {
      console.error('❌ No content in response:', data);
      throw new Error('No content received from DeepSeek API');
    }

    console.log('🎉 DeepSeek API Success!');
    console.log('📝 Response length:', message.length);
    console.log('✅ Direct API call successful!');

    return message;

  } catch (error) {
    // Handle CORS errors by falling back to proxy (don't log as error since this is expected)
    if (error.message.includes('CORS') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'TypeError') {

      console.log('🔄 CORS detected, trying proxy fallback...');
      try {
        return await tryProxyFallback(payload);
      } catch (proxyError) {
        console.error('❌ Both direct API and proxy failed:', proxyError);
        throw new Error('🌐 Cannot connect to AI service. Please ensure the proxy server is running with: node proxy-server.js');
      }
    }

    // Log and re-throw other errors (non-CORS errors)
    console.error('❌ DeepSeek API Error:', error);
    throw error;
  }
};

// Fallback to proxy server if direct API fails due to CORS
async function tryProxyFallback(payload) {
  try {
    console.log('📡 Trying proxy server fallback...');

    // Check if proxy server is available
    const healthCheck = await fetch('http://localhost:3001/health', { timeout: 2000 });
    if (!healthCheck.ok) {
      throw new Error('Proxy server not available');
    }

    console.log('✅ Proxy server is available');

    // Make request through proxy
    const response = await fetch('http://localhost:3001/api/deepseek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Proxy error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (!message) {
      throw new Error('No content received from proxy');
    }

    console.log('✅ Proxy fallback successful!');
    return message;

  } catch (proxyError) {
    console.error('❌ Proxy fallback failed:', proxyError);
    throw new Error('🌐 Cannot connect to DeepSeek API. Please ensure the proxy server is running with: node proxy-server.js');
  }
}