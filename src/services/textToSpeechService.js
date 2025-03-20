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
 * @returns {Promise<{audioUrl: string, visemeData: Array}>} - URL to the audio blob and viseme data
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
        visemeData: cachedResult.visemeData
      };
    }
    
    // Get API credentials from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const voiceName = import.meta.env.VITE_AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural';

    if (!speechKey || !speechRegion) {
      throw new Error('Missing Speech API credentials');
    }

    console.log("Creating speech synthesizer with key and region:", speechRegion);

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
    
    // Use only one approach to generate audio to prevent duplicate sounds
    console.log("Using REST API for audio synthesis...");
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
        <voice name="${voiceName}">${escapedText}</voice>
      </speak>`,
      responseType: 'arraybuffer',
      timeout: 10000 // 10 second timeout
    });
    
    // Create audio blob from response
    const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log("Successfully generated audio using REST API");
    
    // Generate visemes for animation
    const visemeData = generateManualVisemes(text.length);
    console.log(`Generated ${visemeData.length} manual visemes for animation`);
    
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
      visemeData
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
 * @returns {Promise<{audioUrl: string, visemeData: Array}>} - Audio URL and viseme data
 */
async function processChunksWithViseme(text, speechKey, speechRegion, voiceName) {
  // Split text into sentences
  const sentences = splitIntoSentences(text);
  
  // Create chunks of 2-3 sentences
  const chunks = [];
  let currentChunk = [];
  let currentChunkLength = 0;
  
  for (const sentence of sentences) {
    if (currentChunkLength + sentence.length > 150 || currentChunk.length >= 2) {
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
  
  // Process each chunk
  const results = await Promise.all(chunks.map(async (chunk, index) => {
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
      
      // Generate viseme data for this chunk
      // Calculate offset based on previous chunks
      const startOffset = index * 5000; // Assume 5 seconds per chunk
      const chunkVisemes = generateManualVisemes(chunk.length, startOffset);
      
      return {
        audioBlob: new Blob([response.data], { type: 'audio/mp3' }),
        visemeData: chunkVisemes
      };
    } catch (error) {
      console.error(`Error processing chunk ${index}:`, error);
      return {
        audioBlob: null,
        visemeData: []
      };
    }
  }));
  
  // Combine audio blobs
  const audioBlobs = results.map(r => r.audioBlob).filter(Boolean);
  if (audioBlobs.length === 0) {
    throw new Error('Failed to generate any audio chunks');
  }
  
  const combinedAudioBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(combinedAudioBlob);
  
  // Combine viseme data
  const combinedVisemeData = results.flatMap(r => r.visemeData);
  
  // Cache the combined result
  const cacheKey = `viseme-${text.slice(0, 100)}`;
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = audioCache.keys().next().value;
    if (audioCache.get(oldestKey).url) {
      URL.revokeObjectURL(audioCache.get(oldestKey).url);
    }
    audioCache.delete(oldestKey);
  }
  
  audioCache.set(cacheKey, {
    url: audioUrl,
    visemeData: combinedVisemeData,
    timestamp: Date.now()
  });
  
  return {
    audioUrl,
    visemeData: combinedVisemeData
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
  const avgDuration = 30; // Further decreased from 40 to 30ms for more frequent and noticeable updates
  
  // Estimate number of visemes based on text length - increased for more animation points
  const numVisemes = Math.max(50, Math.ceil(textLength * 2.5)); // Increased multiplier from 2.0 to 2.5
  
  console.log(`Generating ${numVisemes} visemes for text length ${textLength}`);
  
  // Add initial neutral viseme
  visemeData.push({
    visemeId: 0,
    audioOffset: startOffset
  });
  
  // Add a dramatic first viseme for obvious opening
  visemeData.push({
    visemeId: 2, // Very open mouth
    audioOffset: startOffset + avgDuration
  });
  
  // Generate visemes with appropriate timing
  // Start from 2 since we manually added the first two visemes
  for (let i = 2; i < numVisemes; i++) {
    // Use a pattern of visemes rather than completely random ones
    // This creates more natural sequences of mouth movements
    let visemeId;
    
    // Create realistic viseme sequences that mimic natural speech patterns
    // Avoid staying on viseme 0 (neutral/closed) for too long
    const prevVisemeId = visemeData[i-1]?.visemeId;
    const prevPrevVisemeId = visemeData[i-2]?.visemeId;
    
    // Avoid repeating the same viseme more than twice in a row
    // This ensures more visible animation
    if (prevVisemeId === prevPrevVisemeId) {
      // Force a change to a different viseme group
      if (prevVisemeId >= 0 && prevVisemeId <= 5) {
        // If previous was in the 0-5 range, choose from 6-11
        visemeId = 6 + Math.floor(Math.random() * 6);
      } else if (prevVisemeId >= 6 && prevVisemeId <= 11) {
        // If previous was in the 6-11 range, choose from either 0-5 or 12-16
        const group = Math.random() < 0.7 ? 0 : 12;
        visemeId = group + Math.floor(Math.random() * 5);
      } else {
        // If previous was 12+, choose from 0-11
        visemeId = Math.floor(Math.random() * 12);
      }
    } else if (prevVisemeId === 0) {
      // If previous was neutral/closed, always open mouth with dramatic viseme
      // Choose from the most visually distinct open mouth visemes
      visemeId = [2, 3, 6, 9, 11][Math.floor(Math.random() * 5)];
    } else if (i % 12 === 0) {
      // Much less frequently return to neutral position (viseme 0) 
      // Changed from every 10th to every 12th viseme
      visemeId = 0;
    } else {
      // Normal viseme selection with weighted distribution
      // More common visemes get higher probability
      // Focusing on the most visually distinct mouth shapes
      const dramaticVisemes = [2, 3, 6, 9, 11]; // Very distinct shapes
      const commonVisemes = [1, 4, 7, 8, 10]; // Common but less dramatic
      const lessCommonVisemes = [5, 12, 13, 14, 19]; // Less common
      const rareVisemes = [15, 16, 17, 18, 20, 21]; // Rarely used
      
      const random = Math.random();
      if (random < 0.5) { // Increased dramatic visemes from ~30% to 50%
        // 50% chance of highly dramatic viseme
        visemeId = dramaticVisemes[Math.floor(Math.random() * dramaticVisemes.length)];
      } else if (random < 0.75) { // 25% chance of common viseme
        visemeId = commonVisemes[Math.floor(Math.random() * commonVisemes.length)];
      } else if (random < 0.9) { // 15% chance of less common viseme
        visemeId = lessCommonVisemes[Math.floor(Math.random() * lessCommonVisemes.length)];
      } else { // 10% chance of rare viseme
        visemeId = rareVisemes[Math.floor(Math.random() * rareVisemes.length)];
      }
    }
    
    // Create animation timing with realistic gaps
    const audioOffset = startOffset + (i * avgDuration);
    
    visemeData.push({
      visemeId,
      audioOffset
    });
  }
  
  // Make sure we're not ending with viseme 0 in case that was the last randomly chosen one
  if (visemeData[visemeData.length - 1].visemeId === 0) {
    // Replace with a more visible closing viseme
    visemeData[visemeData.length - 1].visemeId = 9; // Wide open, very noticeable
  }
  
  // Add a final wide viseme before closing
  visemeData.push({
    visemeId: 2, // Dramatic open
    audioOffset: startOffset + (numVisemes * avgDuration)
  });
  
  // Then add final neutral viseme 0 at the end
  visemeData.push({
    visemeId: 0, 
    audioOffset: startOffset + (numVisemes * avgDuration) + avgDuration
  });
  
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