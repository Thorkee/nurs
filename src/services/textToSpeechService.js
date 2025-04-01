import axios from 'axios';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// Cache for storing recently generated speech audio
const audioCache = new Map();
const MAX_CACHE_SIZE = 25;

/**
 * Expose the audio cache for reference checking
 * This allows components to check if a URL is from the cache
 * @private - Not intended for direct manipulation
 */
export const _getAudioCache = () => audioCache;

/**
 * Converts text to speech using Azure Speech Studio API (REST API version)
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} - URL to the audio blob
 */
export const textToSpeech = async (text) => {
  try {
    // Check cache first
    const cacheKey = `speech-${text.slice(0, 100)}`;
    const cachedAudio = audioCache.get(cacheKey);
    
    if (cachedAudio && Date.now() - cachedAudio.timestamp < 30 * 60 * 1000) { // 30 min expiry
      console.log('Using cached audio for text');
      return cachedAudio.url;
    }
    
    // Get API credentials from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const voiceName = import.meta.env.VITE_AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural';

    // Escape special XML characters to prevent SSML parsing errors
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    console.log('Azure Speech Key length:', speechKey ? speechKey.length : 0);
    console.log('Azure Speech Region:', speechRegion);
    console.log('Voice Name:', voiceName);
    console.log('Text length:', text.length, 'characters');

    // Check for common issues
    if (!speechKey) {
      throw new Error('Missing Speech API Key');
    }
    
    if (speechKey.length < 30) {
      console.warn('Speech API Key appears too short. Azure keys are typically 32 characters');
    }
    
    if (!speechRegion) {
      throw new Error('Missing Speech Region');
    }
    
    if (!['eastus', 'eastus2', 'westus', 'westus2', 'southcentralus', 'northeurope', 'westeurope', 'southeastasia', 'eastasia', 'japaneast', 'japanwest', 'australiaeast', 'centralindia', 'canadacentral', 'uksouth', 'francecentral', 'switzerlandnorth', 'germanywestcentral'].includes(speechRegion)) {
      console.warn(`Speech region "${speechRegion}" might not be valid. Azure regions are typically in format like "eastus2"`);
    }
    
    // For very long text, process in chunks
    if (text.length > 300) {
      return processLongTextInChunks(text, speechKey, speechRegion, voiceName);
    }

    // Prepare SSML with enhanced error checking
    console.log('Preparing SSML for Azure Speech Service');
    
    // Keep SSML simple and compact
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK"><voice name="${voiceName}">${escapedText}</voice></speak>`;

    console.log('SSML length:', ssml.length, 'characters');

    // Make direct request to speech synthesis endpoint with API key
    try {
      console.log(`Sending request to ${speechRegion}.tts.speech.microsoft.com...`);
      
      const response = await axios({
        method: 'post',
        url: `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'patient-simulation-hk'
        },
        data: ssml,
        responseType: 'arraybuffer',
        timeout: 10000 // 10 second timeout
      });

      // Check if we got a valid audio response
      if (response.data.byteLength < 100) {
        console.warn('Received very small audio data:', response.data.byteLength, 'bytes');
      } else {
        console.log('Successfully received', response.data.byteLength, 'bytes of audio data');
      }

      // Convert the audio data to a blob and create a URL
      const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Add to cache
      if (audioCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const oldestKey = audioCache.keys().next().value;
        URL.revokeObjectURL(audioCache.get(oldestKey).url); // Clean up URL
        audioCache.delete(oldestKey);
      }
      
      audioCache.set(cacheKey, {
        url: audioUrl,
        timestamp: Date.now()
      });
      
      return audioUrl;
    } catch (apiError) {
      console.error('Error calling Azure Speech Service:', apiError);
      
      // Enhanced error handling
      if (apiError.code === 'ECONNABORTED') {
        throw new Error('Connection timed out. The Azure Speech Service did not respond in time.');
      }
      
      if (apiError.code === 'ENOTFOUND') {
        throw new Error(`Could not connect to ${speechRegion}.tts.speech.microsoft.com. Check your region or internet connection.`);
      }
      
      if (apiError.response) {
        console.error('Response status:', apiError.response.status);
        
        let errorMessage = `HTTP Error ${apiError.response.status}`;
        
        // Status code specific guidance
        if (apiError.response.status === 400) {
          errorMessage += ': Bad Request. Check SSML syntax or voice name.';
        } else if (apiError.response.status === 401) {
          errorMessage += ': Unauthorized. Check your API key.';
        } else if (apiError.response.status === 403) {
          errorMessage += ': Forbidden. Your API key might not have access to this service or region.';
        } else if (apiError.response.status === 404) {
          errorMessage += ': Not Found. Check your region and voice name.';
        } else if (apiError.response.status === 429) {
          errorMessage += ': Too Many Requests. You may have exceeded your quota.';
        }
        
        // Try to extract detailed error information
        if (apiError.response.data) {
          try {
            const errorText = new TextDecoder().decode(apiError.response.data);
            console.error('Response error:', errorText);
            if (errorText && errorText.length > 0) {
              errorMessage += ' - ' + errorText;
            }
          } catch (e) {
            console.error('Failed to decode error response');
          }
        }
        
        throw new Error(errorMessage);
      }
      
      throw new Error(`Failed to generate speech: ${apiError.message}`);
    }
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw new Error(`Failed to convert text to speech: ${error.message}`);
  }
};

/**
 * Process long text by breaking it into chunks and converting them in parallel
 * @param {string} text - The full text to convert
 * @param {string} speechKey - API key
 * @param {string} speechRegion - API region
 * @param {string} voiceName - Voice to use
 * @returns {Promise<string>} - URL to the concatenated audio blob
 */
async function processLongTextInChunks(text, speechKey, speechRegion, voiceName) {
  try {
    // Split text into sentences
    const sentences = splitIntoSentences(text);
    console.log(`Processing ${sentences.length} sentences in parallel`);
    
    // Create chunks of sentences (3-5 sentences per chunk)
    const chunks = [];
    let currentChunk = [];
    let currentChunkLength = 0;
    
    for (const sentence of sentences) {
      if (currentChunkLength + sentence.length > 200 || currentChunk.length >= 3) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(''));
          currentChunk = [];
          currentChunkLength = 0;
        }
      }
      
      currentChunk.push(sentence);
      currentChunkLength += sentence.length;
    }
    
    // Add any remaining sentences
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(''));
    }
    
    console.log(`Created ${chunks.length} chunks for parallel processing`);
    
    // Process each chunk in parallel
    const requests = chunks.map(async (chunk) => {
      const escapedChunk = chunk
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK"><voice name="${voiceName}">${escapedChunk}</voice></speak>`;
      
      try {
        const response = await axios({
          method: 'post',
          url: `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
          headers: {
            'Ocp-Apim-Subscription-Key': speechKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'User-Agent': 'patient-simulation-hk'
          },
          data: ssml,
          responseType: 'arraybuffer',
          timeout: 8000 // 8 second timeout
        });
        
        return new Blob([response.data], { type: 'audio/mp3' });
      } catch (error) {
        console.error(`Error processing chunk: ${error.message}`);
        return null;
      }
    });
    
    // Wait for all requests to complete
    const audioBlobs = await Promise.all(requests);
    
    // Filter out any failed requests
    const validBlobs = audioBlobs.filter(blob => blob !== null);
    
    if (validBlobs.length === 0) {
      throw new Error('Failed to process any chunks of text');
    }
    
    console.log(`Successfully processed ${validBlobs.length} of ${chunks.length} chunks`);
    
    // Combine all audio blobs
    const combinedBlob = new Blob(validBlobs, { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(combinedBlob);
    
    // Cache the combined result
    const cacheKey = `speech-${text.slice(0, 100)}`;
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = audioCache.keys().next().value;
      URL.revokeObjectURL(audioCache.get(oldestKey).url);
      audioCache.delete(oldestKey);
    }
    
    audioCache.set(cacheKey, {
      url: audioUrl,
      timestamp: Date.now()
    });
    
    return audioUrl;
  } catch (error) {
    console.error('Error processing text in chunks:', error);
    throw error;
  }
}

/**
 * Split text into sentences
 * @param {string} text - Text to split
 * @returns {Array<string>} - Array of sentences
 */
function splitIntoSentences(text) {
  // Split on common sentence-ending punctuation for Chinese and English
  const sentenceRegex = /([.!?。！？]+\s*)/g;
  const sentences = text.split(sentenceRegex).filter(Boolean);
  
  // Combine punctuation with its preceding sentence
  const result = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i];
    const punctuation = sentences[i + 1] || '';
    result.push(sentence + punctuation);
  }
  
  return result;
}

/**
 * Converts text to speech with viseme data using Azure Speech SDK
 * This creates audio and returns both the audio URL and viseme data for facial animation
 * 
 * @param {string} text - The text to convert to speech
 * @returns {Promise<{audioUrl: string, visemeData: Array, text: string}>} - URL to the audio blob, viseme data, and the original text
 */
export const textToSpeechWithViseme = async (text) => {
  try {
    // Check cache first for exact matches
    const cacheKey = `viseme-${text.slice(0, 100)}`;
    const cachedResult = audioCache.get(cacheKey);
    
    if (cachedResult && 
        cachedResult.visemeData && 
        Date.now() - cachedResult.timestamp < 30 * 60 * 1000) { // 30 min expiry
      console.log('Using cached audio and viseme data');
      return {
        audioUrl: cachedResult.url,
        visemeData: cachedResult.visemeData,
        text: text // Include the original text
      };
    }
    
    // Get API credentials from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const voiceName = import.meta.env.VITE_AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural';

    if (!speechKey || !speechRegion) {
      throw new Error('Missing Speech API credentials');
    }

    // For long text, process in smaller chunks but with viseme data
    if (text.length > 200) {
      return processChunksWithViseme(text, speechKey, speechRegion, voiceName);
    }

    // Escape special XML characters
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    // Generate visemes while waiting for audio response - do this in parallel
    const visemePromise = new Promise(resolve => {
      // Generate visemes immediately without waiting for audio
      const visemes = generateManualVisemes(text.length);
      resolve(visemes);
    });
    
    // Use REST API for audio synthesis
    const audioPromise = axios({
      method: 'post',
      url: `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'patient-simulation-hk'
      },
      data: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK">
        <voice name="${voiceName}">${escapedText}</voice>
      </speak>`,
      responseType: 'arraybuffer',
      timeout: 8000 // Reduced timeout for faster response
    });
    
    // Wait for both promises to complete
    const [audioResponse, visemeData] = await Promise.all([audioPromise, visemePromise]);
    
    // Create audio blob from response
    const audioBlob = new Blob([audioResponse.data], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Cache the result with viseme data
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = audioCache.keys().next().value;
      if (audioCache.get(oldestKey).url) {
        URL.revokeObjectURL(audioCache.get(oldestKey).url);
      }
      audioCache.delete(oldestKey);
    }
    
    audioCache.set(cacheKey, {
      url: audioUrl,
      visemeData: visemeData,
      timestamp: Date.now()
    });
    
    return {
      audioUrl,
      visemeData,
      text: text // Include the original text
    };
  } catch (error) {
    console.error("Error in text-to-speech with viseme:", error);
    throw error;
  }
};

/**
 * Process text in chunks with viseme data
 * @param {string} text - Full text to process
 * @param {string} speechKey - API key
 * @param {string} speechRegion - API region
 * @param {string} voiceName - Voice name
 * @returns {Promise<{audioUrl: string, visemeData: Array, text: string}>} - Audio URL and viseme data
 */
async function processChunksWithViseme(text, speechKey, speechRegion, voiceName) {
  // Check for exact cache match for long text too
  const cacheKey = `viseme-long-${text.slice(0, 150)}`;
  const cachedResult = audioCache.get(cacheKey);
  
  if (cachedResult && 
      cachedResult.visemeData && 
      Date.now() - cachedResult.timestamp < 30 * 60 * 1000) {
    console.log('Using cached long text audio and viseme data');
    return {
      audioUrl: cachedResult.url,
      visemeData: cachedResult.visemeData,
      text: text
    };
  }

  // Split text into sentences and create smaller chunks
  const sentences = splitIntoSentences(text);
  
  // Faster chunking: create balanced chunks, or larger chunks for simpler processing
  // Use a smaller number of larger chunks to reduce API calls
  const maxChunkLength = 250; // Increased from 150
  const chunks = [];
  let currentChunk = [];
  let currentChunkLength = 0;
  
  for (const sentence of sentences) {
    // If adding this sentence exceeds our limit, create a new chunk
    if (currentChunkLength + sentence.length > maxChunkLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(''));
        currentChunk = [];
        currentChunkLength = 0;
      }
    }
    
    currentChunk.push(sentence);
    currentChunkLength += sentence.length;
  }
  
  // Add any remaining sentences
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(''));
  }
  
  console.log(`Processing ${chunks.length} chunks with viseme data`);
  
  // Generate visemes for the entire text immediately
  const fullVisemeData = generateManualVisemes(text.length);
  
  // Process chunks with a concurrency limit to avoid overwhelming the API
  const concurrencyLimit = 3; // Process 3 chunks at a time
  const audioBlobs = [];
  
  for (let i = 0; i < chunks.length; i += concurrencyLimit) {
    const batch = chunks.slice(i, i + concurrencyLimit);
    
    // Process this batch of chunks in parallel
    const batchResults = await Promise.all(batch.map(async (chunk) => {
      try {
        // Escape special XML characters
        const escapedChunk = chunk
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        
        // Generate audio for this chunk
        const response = await axios({
          method: 'post',
          url: `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
          headers: {
            'Ocp-Apim-Subscription-Key': speechKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'User-Agent': 'patient-simulation-hk'
          },
          data: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK">
            <voice name="${voiceName}">${escapedChunk}</voice>
          </speak>`,
          responseType: 'arraybuffer',
          timeout: 8000
        });
        
        return new Blob([response.data], { type: 'audio/mp3' });
      } catch (error) {
        console.error(`Error processing chunk:`, error);
        return null;
      }
    }));
    
    // Add valid blobs to our collection
    audioBlobs.push(...batchResults.filter(Boolean));
  }
  
  if (audioBlobs.length === 0) {
    throw new Error('Failed to generate any audio chunks');
  }
  
  // Combine audio blobs
  const combinedAudioBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(combinedAudioBlob);
  
  // Cache the combined result
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = audioCache.keys().next().value;
    if (audioCache.get(oldestKey).url) {
      URL.revokeObjectURL(audioCache.get(oldestKey).url);
    }
    audioCache.delete(oldestKey);
  }
  
  audioCache.set(cacheKey, {
    url: audioUrl,
    visemeData: fullVisemeData,
    timestamp: Date.now()
  });
  
  return {
    audioUrl,
    visemeData: fullVisemeData,
    text: text
  };
}

/**
 * Generates manual viseme data for animation based on text length
 * @param {number} textLength - Length of text
 * @param {number} startOffset - Starting offset in milliseconds
 * @returns {Array} - Array of viseme data
 */
function generateManualVisemes(textLength, startOffset = 0) {
  const visemeData = [];
  const avgDuration = 25; // Even faster transitions for more responsive animation
  
  // Estimate number of visemes based on text length - increased multiplier for more detailed animation
  const numVisemes = Math.max(60, Math.ceil(textLength * 3.0)); // Increased for more detailed animation
  
  console.log(`Generating ${numVisemes} visemes for text length ${textLength}`);
  
  // Speech patterns - these represent common viseme sequences in natural speech
  // Each pattern is a sequence of visemes that often occur together
  const speechPatterns = [
    // Open-close patterns (very common in speech)
    [2, 11, 4, 1, 0],
    [9, 6, 3, 1, 0],
    [3, 10, 7, 4, 1],
    
    // Common consonant-vowel patterns
    [19, 2, 11, 7], // d/t sounds followed by open vowels
    [21, 9, 4, 8],  // p/b/m followed by open to closed sequence
    [17, 6, 10, 3], // th sound followed by smile and round
    
    // Common closing patterns
    [4, 2, 1, 0],
    [11, 7, 1, 0],
    [10, 8, 0],
    
    // Common opening patterns
    [0, 11, 9],
    [0, 2, 6],
    [0, 3, 10]
  ];
  
  // Add initial viseme sequence for opening mouth
  // Creates a more natural beginning to speech
  const openingSequence = [
    {
      visemeId: 0, // Start closed
      audioOffset: startOffset
    },
    {
      visemeId: 1, // Slight open
      audioOffset: startOffset + avgDuration * 0.5
    },
    {
      visemeId: 2, // Wide open
      audioOffset: startOffset + avgDuration * 1.5
    }
  ];
  
  visemeData.push(...openingSequence);
  
  // Generate natural speech-like viseme sequences
  let currentOffset = startOffset + avgDuration * 3; // Start after opening sequence
  let i = openingSequence.length;
  
  while (i < numVisemes) {
    // Sometimes use a predetermined pattern (65% of the time)
    // This creates more natural sequences
    if (Math.random() < 0.65) {
      // Select a random pattern
      const pattern = speechPatterns[Math.floor(Math.random() * speechPatterns.length)];
      
      // Apply the pattern with slight variations in timing
      for (let j = 0; j < pattern.length && i < numVisemes; j++, i++) {
        // Vary timing slightly (±15% variation for natural rhythm)
        const timingVariation = 1 + (Math.random() * 0.3 - 0.15);
        currentOffset += avgDuration * timingVariation;
        
        visemeData.push({
          visemeId: pattern[j],
          audioOffset: Math.round(currentOffset)
        });
      }
    } else {
      // Generate individual visemes with weighted probabilities
      // Using a Markov-like approach where next viseme depends on previous
      const prevVisemeId = visemeData[i-1]?.visemeId;
      let visemeId;
      
      // Create natural transitions between viseme groups
      if (prevVisemeId <= 5) {
        // From neutral/slight open to more dramatic
        const choices = [2, 3, 6, 9, 11, 4];
        visemeId = choices[Math.floor(Math.random() * choices.length)];
      } else if (prevVisemeId >= 6 && prevVisemeId <= 11) {
        // From dramatic to either closure or consonants
        const random = Math.random();
        if (random < 0.4) {
          // Move toward closure
          visemeId = [4, 1, 5, 8, 10][Math.floor(Math.random() * 5)];
        } else if (random < 0.8) {
          // Move to consonants
          visemeId = [15, 16, 17, 19, 21][Math.floor(Math.random() * 5)];
        } else {
          // Stay dramatic occasionally
          visemeId = [2, 3, 6, 9, 11][Math.floor(Math.random() * 5)];
        }
      } else {
        // From consonants to vowels
        visemeId = [2, 3, 4, 6, 9, 11][Math.floor(Math.random() * 6)];
      }
      
      // Avoid triple repetition of the same viseme
      const prevPrevVisemeId = visemeData[i-2]?.visemeId;
      if (visemeId === prevVisemeId && visemeId === prevPrevVisemeId) {
        // Force a change - choose from opposite end of the viseme range
        if (visemeId < 10) {
          visemeId = 10 + Math.floor(Math.random() * 11);
        } else {
          visemeId = Math.floor(Math.random() * 10);
        }
      }
      
      // Natural variation in timing (±20% variation)
      const timingVariation = 1 + (Math.random() * 0.4 - 0.2);
      currentOffset += avgDuration * timingVariation;
      
      visemeData.push({
        visemeId,
        audioOffset: Math.round(currentOffset)
      });
      
      i++;
    }
    
    // Every so often, insert a brief neutral/closure position (natural speech pause)
    if (Math.random() < 0.08 && i < numVisemes - 5) {
      visemeData.push({
        visemeId: 0,
        audioOffset: Math.round(currentOffset + avgDuration)
      });
      
      currentOffset += avgDuration * 1.2;
      i++;
    }
  }
  
  // Ensure we have a natural closing sequence
  // Replace the last few visemes with a closing pattern
  const closingOffset = visemeData[visemeData.length - 1].audioOffset;
  const closingSequence = [
    {
      visemeId: 4, // Medium open
      audioOffset: closingOffset + avgDuration
    },
    {
      visemeId: 1, // Slight open
      audioOffset: closingOffset + avgDuration * 2
    },
    {
      visemeId: 0, // Closed
      audioOffset: closingOffset + avgDuration * 3
    }
  ];
  
  // Remove last 3 visemes (if we have them) and add the closing sequence
  if (visemeData.length > 5) {
    visemeData.splice(-3);
  }
  visemeData.push(...closingSequence);
  
  // Log some statistics about the generated visemes
  const visemeCounts = {};
  visemeData.forEach(v => {
    visemeCounts[v.visemeId] = (visemeCounts[v.visemeId] || 0) + 1;
  });
  
  console.log("Generated viseme counts:", visemeCounts);
  console.log("First few visemes:", visemeData.slice(0, 5));
  console.log("Last few visemes:", visemeData.slice(-5));
  
  return visemeData;
} 