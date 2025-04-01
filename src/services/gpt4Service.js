import axios from 'axios';

// Add a response cache for common questions
const responseCache = new Map();
const MAX_CACHE_SIZE = 20;

// Helper to calculate similarity between strings
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  // Simple similarity by checking how many characters in the longer string appear in the shorter string
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }
  
  return matches / longer.length;
};

/**
 * Generates a response using Azure OpenAI GPT-4o API
 * @param {string} userInput - The transcribed nurse's speech
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {function} streamHandler - Optional callback for handling streamed responses
 * @returns {Promise<string>} - The generated patient response
 */
export const generateResponse = async (userInput, conversationHistory, streamHandler = null) => {
  try {
    // Use a faster similarity check for frequently asked questions
    const cacheKey = `${userInput.trim().toLowerCase().slice(0, 50)}|${conversationHistory.length}`;
    
    // Check exact cache match - faster than similarity calculation
    const exactCacheMatch = responseCache.get(cacheKey);
    if (exactCacheMatch && Date.now() - exactCacheMatch.timestamp < 30 * 60 * 1000) {
      console.log('Using exact cache match for response');
      return exactCacheMatch.text;
    }
    
    // Very quick fuzzy matching for common questions - only check most recent questions
    if (conversationHistory.length < 15) {
      for (const [key, cachedResponse] of responseCache.entries()) {
        // Only check cache entries from the last 10 minutes
        if (Date.now() - cachedResponse.timestamp > 10 * 60 * 1000) continue;
        
        const [cachedInput] = key.split('|');
        // Quick prefix matching, good enough for most cases
        if (userInput.trim().toLowerCase().startsWith(cachedInput.slice(0, 25)) || 
            cachedInput.slice(0, 25).includes(userInput.trim().toLowerCase().slice(0, 25))) {
          console.log('Using fuzzy cache match for response');
          return cachedResponse.text;
        }
      }
    }
    
    // Get API credentials from environment variables
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const deploymentId = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_ID;
    const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;
    
    // Format conversation history - only include recent messages for context
    // Keep only 10 most recent messages to reduce context size
    const recentHistory = conversationHistory.slice(-10);
    const formattedHistory = recentHistory.map(entry => ({
      role: entry.role === 'nurse' ? 'user' : 'assistant',
      content: entry.text
    }));

    // Prepare system message - same as before
    const systemMessage = {
      role: 'system',
      content: `# System Role

You are **Mr. Chan**, a **58-year-old man** preparing for a **colonoscopy**. You will interact with a nursing student who is assessing your condition, addressing your concerns, answering your questions, and performing a physical examination as part of this simulated clinical scenario. Your primary goal is to create an engaging, realistic, and appropriately challenging interaction for the nursing student by authentically expressing your anxieties, confusion, embarrassment, and questions regarding the procedure and its outcomes.

**Always respond in Hong Kong-style Cantonese, using natural conversational expressions and tone. Avoid formal or overly technical language.**

---

## Patient Background

- You've been referred for a colonoscopy due to recent changes in bowel habits, occasional blood in your stool, and mild abdominal discomfort.
- You do not yet have a diagnosis, which significantly contributes to your anxiety.
- You're concerned about the colonoscopy procedure, preparation, potential discomfort, and possible serious outcomes.

---

## Emotional State

- **Anxious**: Worried about receiving serious or bad news from the colonoscopy.
- **Confused**: Unsure about why the procedure is necessary and what preparation entails.
- **Embarrassed**: Uncomfortable discussing bowel symptoms and undergoing the physical examination.
- **Nervous**: Fearful about discomfort during the procedure and potential risks involved.

---

## Interaction Behavior

- Respond in a hesitant, worried tone, regularly seeking reassurance and clarification from the nursing student.
- Ask detailed follow-up questions based on the nursing student's explanations to show continued concern and confusion.
- During the physical examination, verbally express discomfort and embarrassment, particularly about your privacy and any physical discomfort.
- Do not display advanced medical knowledge or provide unsolicited helpful information; your role is a layperson with limited medical understanding.
- **Do NOT ask the nursing student how they are feeling.**
- **Always answer in Hong Kong-style Cantonese, using natural expressions and casual phrasing.**

---

## Tone and Communication Style

- Maintain a consistent, mild level of anxiety, uncertainty, and embarrassment throughout.
- Occasionally express relief or gratitude when reassured, but continue to show concern and ask further questions, keeping the interaction realistic and engaging.
- **Always respond in Hong Kong-style Cantonese.** Use natural, everyday expressions and avoid overly technical or formal terms.`
    };

    // Create message array - keep context smaller for faster responses
    const messages = [
      systemMessage,
      ...formattedHistory,
      { role: 'user', content: userInput }
    ];

    // Use streaming API for real-time response by default
    if (streamHandler || true) { // Always use streaming for better responsiveness
      const response = await streamResponse(endpoint, deploymentId, apiVersion, apiKey, messages, streamHandler);
      
      // Cache the response for future similar questions
      if (responseCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
      }
      
      responseCache.set(cacheKey, {
        text: response,
        timestamp: Date.now()
      });
      
      return response;
    }

    // This section is kept for compatibility but will generally not be used
    try {
      console.log('Sending request to Azure OpenAI...');
      const response = await axios.post(
        `${endpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`,
        {
          messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          timeout: 15000, // Reduced timeout for faster error detection
        }
      );

      console.log('Successfully received response from Azure OpenAI');
      const generatedText = response.data.choices[0].message.content;
      
      // Cache the response
      if (responseCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
      }
      
      responseCache.set(cacheKey, {
        text: generatedText,
        timestamp: Date.now()
      });
      
      return generatedText;
    } catch (apiError) {
      console.error('Error calling Azure OpenAI API:', apiError);
      if (apiError.response) {
        console.error('Response status:', apiError.response.status);
        console.error('Response data:', apiError.response.data);
      }
      throw new Error(`Failed to call Azure OpenAI API: ${apiError.message}`);
    }
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
};

/**
 * Stream a response from Azure OpenAI API with faster processing
 * @param {string} endpoint - API endpoint
 * @param {string} deploymentId - Deployment ID
 * @param {string} apiVersion - API version
 * @param {string} apiKey - API key
 * @param {Array} messages - Message array
 * @param {Function} streamHandler - Callback for handling streamed tokens
 * @returns {Promise<string>} - The complete generated text
 */
async function streamResponse(endpoint, deploymentId, apiVersion, apiKey, messages, streamHandler) {
  try {
    const url = `${endpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;
    
    // Create request options - optimized for faster first token
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 400, // Slightly reduced for faster responses
        stream: true,
        top_p: 0.95, // Add top_p for faster sampling
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      })
    };
    
    // Make fetch request with AbortController for timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Process stream more efficiently
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    
    // Process stream
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete messages in buffer
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep the last incomplete chunk
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.replace('data: ', '');
          
          if (jsonStr === '[DONE]') {
            continue;
          }
          
          try {
            const json = JSON.parse(jsonStr);
            
            if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
              const content = json.choices[0].delta.content;
              fullText += content;
              
              // Call the stream handler with new content
              if (streamHandler) {
                streamHandler(content, fullText);
              }
            }
          } catch (e) {
            console.warn('Error parsing JSON from stream:', e);
          }
        }
      }
    }
    
    return fullText;
  } catch (error) {
    console.error('Error in stream response:', error);
    throw error;
  }
} 