import axios from 'axios';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// Cache for storing recently generated speech audio
const audioCache = new Map();
const MAX_CACHE_SIZE = 100;

// Maximum chunk size for Azure TTS (characters)
// Remove the chunking limit entirely - process full text in one request
// const MAX_CHUNK_SIZE = 800; 

/**
 * Expose the audio cache for reference checking
 * This allows components to check if a URL is from the cache
 * @private - Not intended for direct manipulation
 */
export const _getAudioCache = () => audioCache;

// Remove the splitTextIntoChunks function since we're not chunking anymore

/**
 * Converts text to speech using Azure Speech Studio API (REST API version)
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} - URL to the audio blob
 */
export const textToSpeech = async (text) => {
  try {
    // Check cache first
    const cacheKey = `speech-${text}`;
    const cachedAudio = audioCache.get(cacheKey);
    
    if (cachedAudio && Date.now() - cachedAudio.timestamp < 30 * 60 * 1000) { // 30 min expiry
      console.log('Using cached audio for text');
      return cachedAudio.url;
    }
    
    // Get API credentials from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const voiceName = import.meta.env.VITE_AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural';

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
    
    // Process entire text without chunking
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

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
        timeout: 120000 // Increased to 120 seconds for long texts
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
 * Converts text to speech with viseme data using Azure Speech SDK
 * This creates audio and returns both the audio URL and viseme data for facial animation
 * 
 * @param {string} text - The text to convert to speech
 * @returns {Promise<{audioUrl: string, visemeData: Array, text: string}>} - URL to the audio blob, viseme data, and the original text
 */
export const textToSpeechWithViseme = async (text) => {
  // Log the input text length to debug truncation issues
  console.log(`textToSpeechWithViseme called with text of length: ${text.length}`);
  
  // Check cache first
  const cacheKey = `viseme-sdk-${text}`;
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
  const voiceName = import.meta.env.VITE_AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural'; // Default HK male voice

  if (!speechKey || !speechRegion) {
    console.error('Missing Azure Speech API credentials in .env');
    throw new Error('Missing Speech API credentials');
  }

  // --- SDK Implementation ---
  return new Promise((resolve, reject) => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    // Request viseme output
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;
    
    // Use null audio config to get audio data in memory
    const audioConfig = null; 
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    const visemeData = [];

    // Subscribe to viseme events
    synthesizer.visemeReceived = (s, e) => {
      // The audioOffset is in 100-nanosecond ticks, convert to milliseconds
      visemeData.push({
        visemeId: e.visemeId,
        audioOffset: Math.round(e.audioOffset / 10000) 
      });
    };

    // Escape SSML-sensitive characters minimally for the SSML structure
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

    console.log('SSML length for viseme generation:', ssml.length, 'characters');
    console.log('Text length after escaping:', escapedText.length, 'characters');
    
    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        synthesizer.close(); // Close synthesizer once done

        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
          console.log(`Synthesis finished for text [${text.slice(0,30)}...]. Visemes collected: ${visemeData.length}`);
          const audioData = result.audioData; // ArrayBuffer
          const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Sort viseme data just in case it arrives out of order
          visemeData.sort((a, b) => a.audioOffset - b.audioOffset);

          // Add to cache
          if (audioCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = audioCache.keys().next().value;
            if (audioCache.get(oldestKey)?.url) {
              URL.revokeObjectURL(audioCache.get(oldestKey).url);
            }
            audioCache.delete(oldestKey);
          }
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
          console.error(`Speech synthesis failed: ${result.errorDetails}`);
          reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
        }
      },
      err => {
        console.error(`Error during speech synthesis: ${err}`);
        synthesizer.close();
        reject(err);
      }
    );
  });
  // --- End SDK Implementation ---
};

// Note: Ensure the SimpleLRUCache class and MAX_CACHE_SIZE are defined appropriately above.
// The 'splitIntoSentences' function is likely no longer needed by textToSpeechWithViseme.
// Consider removing generateManualVisemes and processChunksWithViseme entirely if they are not used elsewhere. 