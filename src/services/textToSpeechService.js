import axios from 'axios';
import { SpeechSDK } from 'microsoft-cognitiveservices-speech-sdk';

// Create a cache for recently generated speech audio
// Using Map to preserve insertion order for LRU-like behavior
const MAX_CACHE_SIZE = 25;
const MAX_VISEME_CACHE_SIZE = 15;

// Create caches for audio with and without viseme data
const speechCache = new Map();
const visemeCache = new Map();

/**
 * Converts text to speech using Azure Speech Studio API (REST API version)
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} - URL to the audio blob
 */
export const textToSpeech = async (text) => {
  try {
    // Default Chinese voice - female
    const voice = 'zh-CN-XiaoxiaoNeural';
    
    // Generate cache key based on text
    const cacheKey = `tts_${text}`;
    
    // Check if we have a cached version
    if (speechCache.has(cacheKey)) {
      console.log('Using cached TTS audio for:', text.substring(0, 30) + '...');
      
      // Get cached blob
      const cachedBlob = speechCache.get(cacheKey);
      
      // Always create a new URL for the cached blob to prevent playback issues
      // This is important as the previous URL might have been revoked
      const newUrl = URL.createObjectURL(cachedBlob);
      console.log('Created new URL for cached audio:', newUrl);
      
      return newUrl;
    }
    
    // Not in cache, synthesize new speech
    console.log('Generating new TTS audio for:', text.substring(0, 30) + '...');
    
    // Retrieve API credentials from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    
    // Validate API credentials
    if (!speechKey || !speechRegion) {
      throw new Error('Azure Speech credentials missing. Check your .env file.');
    }
    
    // Escape special characters in SSML
    const ssmlText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    // Create SSML document for speech synthesis
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
        <voice name="${voice}">
          <prosody rate="0.95" pitch="+0Hz">
            ${ssmlText}
          </prosody>
        </voice>
      </speak>
    `;
    
    // Send request to Azure Speech synthesis endpoint
    const url = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const response = await axios.post(url, ssml, {
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'colonoscopy-patient-simulator'
      },
      responseType: 'arraybuffer'
    });
    
    // Verify response is valid
    if (!response.data) {
      throw new Error('No data received from speech service');
    }
    
    // Convert response to blob
    const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
    
    // Cache the audio blob for future use
    speechCache.set(cacheKey, audioBlob);
    
    // Trim cache if it exceeds maximum size
    if (speechCache.size > MAX_CACHE_SIZE) {
      const oldestKey = speechCache.keys().next().value;
      speechCache.delete(oldestKey);
      console.log('Removing oldest TTS cache entry to maintain size limit');
    }
    
    // Create URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('Created new URL for fresh audio:', audioUrl);
    
    return audioUrl;
  } catch (error) {
    console.error('Text-to-speech service error:', error);
    throw new Error(`Text-to-speech failed: ${error.message}`);
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
    if (speechCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = speechCache.keys().next().value;
      URL.revokeObjectURL(speechCache.get(oldestKey).url);
      speechCache.delete(oldestKey);
    }
    
    speechCache.set(cacheKey, {
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
    // Generate cache key based on text
    const cacheKey = `tts_viseme_${text}`;
    
    // Check if we have a cached version
    if (visemeCache.has(cacheKey)) {
      console.log('Using cached viseme data for:', text.substring(0, 30) + '...');
      const cachedData = visemeCache.get(cacheKey);
      
      // Always create a new URL for the cached blob to prevent playback issues
      // This is important as the previous URL might have been revoked
      const newUrl = URL.createObjectURL(cachedData.audioBlob);
      console.log('Created new URL for cached viseme audio:', newUrl);
      
      return {
        audioUrl: newUrl,
        visemeData: cachedData.visemeData
      };
    }
    
    // Default Chinese voice - female
    const voice = 'zh-CN-XiaoxiaoNeural';
    
    // Retrieve API credentials from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    
    // Validate API credentials
    if (!speechKey || !speechRegion) {
      throw new Error('Azure Speech credentials missing. Check your .env file.');
    }
    
    // Escape special characters in SSML
    const ssmlText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    // Create SSML document for speech synthesis with viseme
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
        <voice name="${voice}">
          <prosody rate="0.95" pitch="+0Hz">
            ${ssmlText}
          </prosody>
        </voice>
      </speak>
    `;
    
    // Create speech configuration with viseme feature enabled
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;
    speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceResponse_RequestSentenceBoundary, "true");
    
    // Create speech synthesizer with viseme feature enabled
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
    
    // Array to collect viseme data
    const visemeData = [];
    
    // Listen for viseme events
    synthesizer.visemeReceived = (s, e) => {
      // Map Azure viseme ID to our simplified viseme set
      // Azure uses Microsoft's 21 viseme model, we're using a simplified set
      const mappedVisemeId = mapAzureVisemeToOurModel(e.visemeId);
      
      // Add viseme data with timing information
      visemeData.push({
        visemeId: mappedVisemeId,
        audioOffset: e.audioOffset / 10000  // Convert to milliseconds
      });
    };
    
    // Synthesize speech with viseme
    console.log('Generating new TTS with viseme for:', text.substring(0, 30) + '...');
    
    return new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        result => {
          // Check if synthesis was successful
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            // Get audio data as array buffer
            const audioData = result.audioData;
            
            // Convert array buffer to blob
            const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
            
            // Create URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Created new URL for fresh viseme audio:', audioUrl);
            
            // Sort viseme data by audioOffset
            visemeData.sort((a, b) => a.audioOffset - b.audioOffset);
            
            // Deduplicate consecutive identical visemes
            const processedVisemeData = [];
            let prevViseme = -1;
            
            for (const viseme of visemeData) {
              if (viseme.visemeId !== prevViseme) {
                processedVisemeData.push(viseme);
                prevViseme = viseme.visemeId;
              }
            }
            
            // Add ending viseme if needed
            if (processedVisemeData.length > 0) {
              const lastViseme = processedVisemeData[processedVisemeData.length - 1];
              // Add neutral viseme at the end with a small offset to ensure clean ending
              processedVisemeData.push({
                visemeId: 0,  // Neutral viseme
                audioOffset: lastViseme.audioOffset + 200  // 200ms after last viseme
              });
            }
            
            // Store in cache
            visemeCache.set(cacheKey, {
              audioBlob,
              visemeData: processedVisemeData
            });
            
            // Trim cache if necessary
            if (visemeCache.size > MAX_VISEME_CACHE_SIZE) {
              const oldestKey = visemeCache.keys().next().value;
              visemeCache.delete(oldestKey);
              console.log('Removing oldest viseme cache entry to maintain size limit');
            }
            
            // Resolve with audio URL and viseme data
            resolve({
              audioUrl,
              visemeData: processedVisemeData
            });
          } else {
            // Handle errors
            console.error('Speech synthesis failed:', result.errorDetails);
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
          }
          
          // Clean up synthesizer
          synthesizer.close();
        },
        error => {
          console.error('Error synthesizing speech:', error);
          synthesizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Text-to-speech with viseme error:', error);
    throw new Error(`Text-to-speech with viseme failed: ${error.message}`);
  }
};

/**
 * Generates manual viseme data for animation based on text length
 * @param {number} textLength - Length of text
 * @param {number} startOffset - Starting offset in milliseconds
 * @returns {Array} - Array of viseme data
 */
function generateManualVisemes(textLength, startOffset = 0) {
  const visemeData = [];
  const avgDuration = 70; // Average duration for each viseme in ms
  
  // Estimate number of visemes based on text length
  const numVisemes = Math.max(20, Math.ceil(textLength * 0.8));
  
  // Generate visemes with appropriate timing
  for (let i = 0; i < numVisemes; i++) {
    // Use a mix of common visemes for natural mouth movement
    // Common visemes: 0 (neutral), 2 (ah), 3 (aa), 5 (ee), 10 (w), etc.
    const visemeId = Math.floor(Math.random() * 12); // 0-11 viseme IDs
    
    // Create animation timing with realistic gaps
    const audioOffset = startOffset + (i * avgDuration);
    
    visemeData.push({
      visemeId,
      audioOffset
    });
  }
  
  return visemeData;
}

/**
 * Maps Azure viseme ID to our simplified viseme set
 * @param {number} azureVisemeId - Azure viseme ID
 * @returns {number} - Simplified viseme ID
 */
function mapAzureVisemeToOurModel(azureVisemeId) {
  // Implement the mapping logic based on your specific requirements
  // This is a placeholder and should be replaced with the actual implementation
  return azureVisemeId;
} 