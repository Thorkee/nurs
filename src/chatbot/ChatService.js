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
 * @param {string} userInput - The user's message
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {function} streamHandler - Optional callback for handling streamed responses
 * @returns {Promise<string>} - The generated response
 */
export const generateChatResponse = async (userInput, conversationHistory, streamHandler = null) => {
  try {
    // Check cache for similar questions if conversation history is not too long
    if (conversationHistory.length < 10) {
      // Find similar cached questions
      for (const [cacheKey, cachedResponse] of responseCache.entries()) {
        const [cachedInput, cachedHistoryLength] = cacheKey.split('|');
        
        // Check if the current history length is similar to the cached history length
        if (Math.abs(conversationHistory.length - parseInt(cachedHistoryLength)) <= 2) {
          // Calculate similarity between current input and cached input
          const similarity = calculateSimilarity(userInput, cachedInput);
          
          // If similarity is above threshold (85%), return cached response
          if (similarity > 0.85 && Date.now() - cachedResponse.timestamp < 30 * 60 * 1000) { // 30 minutes expiry
            console.log('Using cached response for similar question:', similarity);
            return cachedResponse.text;
          }
        }
      }
    }
    
    // Get API credentials from environment variables
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const deploymentId = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_ID;
    const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

    console.log('Azure OpenAI API Key available:', !!apiKey);
    console.log('Azure OpenAI Endpoint:', endpoint);
    console.log('Azure OpenAI Deployment ID:', deploymentId);
    
    // Format conversation history for the API
    // Only include the last 10 messages from history to keep context manageable
    const recentHistory = conversationHistory.slice(-10);
    const formattedHistory = recentHistory.map(entry => ({
      role: entry.role,
      content: entry.content
    }));

    // Prepare the system message with patient simulation instructions - using the same as in gpt4Service.js
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

    // Create the full message array with system message, conversation history, and current input
    const messages = [
      systemMessage,
      ...formattedHistory,
      { role: 'user', content: userInput }
    ];

    // Using streaming API if a streamHandler is provided
    if (streamHandler) {
      return await streamResponse(endpoint, deploymentId, apiVersion, apiKey, messages, streamHandler);
    }

    // Make API request to Azure OpenAI in regular (non-streaming) mode
    try {
      console.log('Sending request to Azure OpenAI...');
      const response = await axios.post(
        `${endpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`,
        {
          messages,
          temperature: 0.7,
          max_tokens: 800,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          // Add timeout to prevent hanging requests
          timeout: 30000, // 30 seconds
        }
      );

      console.log('Successfully received response from Azure OpenAI');
      // Extract the generated text
      const generatedText = response.data.choices[0].message.content;
      
      // Cache the response for future similar questions
      if (responseCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
      }
      
      // Create a cache key combining the user input and conversation history length
      const cacheKey = `${userInput}|${conversationHistory.length}`;
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
 * Stream a response from Azure OpenAI API
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
    
    // Create request options for fetch API
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 800,
        stream: true
      })
    };
    
    // Make fetch request
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get reader for streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    
    // Process stream
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Decode chunk
      const chunk = decoder.decode(value);
      
      // Process SSE format (data: {...}\n\n)
      const lines = chunk.split('\n\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            // Extract JSON
            const jsonStr = line.replace('data: ', '');
            const json = JSON.parse(jsonStr);
            
            // Extract content delta
            if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
              const content = json.choices[0].delta.content;
              fullText += content;
              
              // Call stream handler with new content
              if (streamHandler) {
                streamHandler(content, fullText);
              }
            }
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      }
    }
    
    // Cache the final response
    if (responseCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = responseCache.keys().next().value;
      responseCache.delete(oldestKey);
    }
    
    // Create a cache key combining the first message and conversation history length
    const cacheKey = `${messages[messages.length - 1].content}|${messages.length - 2}`; // Excluding system message
    responseCache.set(cacheKey, {
      text: fullText,
      timestamp: Date.now()
    });
    
    return fullText;
  } catch (error) {
    console.error('Error in streaming response:', error);
    throw error;
  }
} 