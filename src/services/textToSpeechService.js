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
  // Check cache first
  const cacheKey = `viseme-sdk-${text.slice(0, 100)}`; // Use a different prefix for SDK results
  const cachedResult = audioCache.get(cacheKey);
  if (cachedResult && cachedResult.visemeData && Date.now() - cachedResult.timestamp < 30 * 60 * 1000) {
    console.log('Using cached SDK audio and viseme data');
    return {
      audioUrl: cachedResult.url,
      visemeData: cachedResult.visemeData,
      text: text
    };
  }

  // Get API credentials
  const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
  const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
  const voiceName = import.meta.env.VITE_AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural';

  // Enhanced validation
  if (!speechKey) {
    console.error('Missing Azure Speech API Key in .env');
    throw new Error('Missing Speech API Key');
  }

  if (!speechRegion) {
    console.error('Missing Azure Speech Region in .env');
    throw new Error('Missing Speech Region');
  }

  console.log('Azure Speech Configuration:');
  console.log('- Key Length:', speechKey.length);
  console.log('- Region:', speechRegion);
  console.log('- Voice:', voiceName);
  console.log('- Text Length:', text.length);

  // --- SDK Implementation ---
  return new Promise((resolve, reject) => {
    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
      
      // Configure speech synthesis
      speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;
      speechConfig.speechSynthesisVoiceName = voiceName;
      
      // Use null audio config to get audio data in memory
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

      const visemeData = [];

      // Subscribe to viseme events
      synthesizer.visemeReceived = (s, e) => {
        console.log(`Viseme received: ID=${e.visemeId}, Offset=${e.audioOffset / 10000}ms`);
        visemeData.push({
          visemeId: e.visemeId,
          audioOffset: Math.round(e.audioOffset / 10000)
        });
      };

      // Subscribe to synthesis events for better debugging
      synthesizer.synthesizing = (s, e) => {
        console.log('Synthesis in progress:', e.result.reason);
      };

      // Escape SSML-sensitive characters
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
        
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-HK">
                      <voice name="${voiceName}">
                        <mstts:viseme type="redlips_front"/> 
                        <prosody pitch="-2%" rate="-10%">
                          ${escapedText}
                        </prosody>
                      </voice>
                    </speak>`;

      console.log('Starting speech synthesis with SSML:', ssml);

      synthesizer.speakSsmlAsync(
        ssml,
        result => {
          console.log('Speech synthesis result:', result.reason);
          
          synthesizer.close();
          console.log('Synthesizer closed');

          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log(`Synthesis finished for text [${text.slice(0,30)}...]. Visemes collected: ${visemeData.length}`);
            
            if (!result.audioData || result.audioData.byteLength === 0) {
              console.error('No audio data received');
              reject(new Error('No audio data received from synthesis'));
              return;
            }

            console.log('Audio data size:', result.audioData.byteLength, 'bytes');
            
            const audioBlob = new Blob([result.audioData], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Sort viseme data
            visemeData.sort((a, b) => a.audioOffset - b.audioOffset);

            // Cache management
            if (audioCache.size >= MAX_CACHE_SIZE) {
              const oldestKey = audioCache.keys().next().value;
              if (audioCache.get(oldestKey)?.url) {
                URL.revokeObjectURL(audioCache.get(oldestKey).url);
              }
              audioCache.delete(oldestKey);
            }

            // Store in cache
            audioCache.set(cacheKey, {
              url: audioUrl,
              visemeData: visemeData,
              timestamp: Date.now()
            });

            resolve({
              audioUrl,
              visemeData,
              text: text
            });
          } else {
            console.error('Speech synthesis failed:', result.errorDetails);
            reject(new Error(`Speech synthesis failed: ${result.errorDetails || 'Unknown error'}`));
          }
        },
        error => {
          console.error('Error during speech synthesis:', error);
          synthesizer.close();
          reject(error);
        }
      );
    } catch (error) {
      console.error('Error setting up speech synthesis:', error);
      reject(error);
    }
  });
};

// Utility function to split text into sentences (Keep if needed, otherwise remove)
// ... (keep existing splitIntoSentences if still used elsewhere, otherwise can be removed) ...

// Export other functions if they exist
// ...

// Note: Ensure the SimpleLRUCache class and MAX_CACHE_SIZE are defined appropriately above.
// The 'splitIntoSentences' function is likely no longer needed by textToSpeechWithViseme.
// Consider removing generateManualVisemes and processChunksWithViseme entirely if they are not used elsewhere. 