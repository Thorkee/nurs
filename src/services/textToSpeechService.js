import axios from 'axios';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

/**
 * Converts text to speech using Azure Speech Studio API (REST API version)
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} - URL to the audio blob
 */
export const textToSpeech = async (text) => {
  try {
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
    
    // Check if the text is excessively long, which could cause issues
    if (text.length > 1000) {
      console.warn('Text is quite long (' + text.length + ' chars). Consider breaking into smaller chunks.');
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
      return URL.createObjectURL(audioBlob);
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
 * @returns {Promise<{audioUrl: string, visemeData: Array}>} - URL to the audio blob and viseme data
 */
export const textToSpeechWithViseme = async (text) => {
  try {
    // Get API credentials from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const voiceName = import.meta.env.VITE_AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural';

    if (!speechKey || !speechRegion) {
      throw new Error('Missing Speech API credentials');
    }

    console.log("Creating speech synthesizer with key and region:", speechRegion);

    // Create a speech config object
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    
    // Set the synthesis output format
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;
    
    // Set the voice name
    speechConfig.speechSynthesisVoiceName = voiceName;
    
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
        <voice name="${voiceName}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</voice>
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
 * Helper function to try synthesis using the SpeechSDK
 * @private
 */
async function trySDKSynthesis(speechConfig, text) {
  return new Promise((resolve, reject) => {
    try {
      // Use a push audio output stream to capture audio data without playing it
      const stream = SpeechSDK.PushAudioOutputStream.create();
      const audioConfig = SpeechSDK.AudioConfig.fromStreamOutput(stream);
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
      
      // Collection for viseme data
      const visemeData = [];
      let websocketOpened = false;
      
      // Set up connection opened event to track connection state
      synthesizer.connectionOpened = (s, e) => {
        console.log("SpeechSDK websocket connection opened successfully");
        websocketOpened = true;
      };
      
      // Set up viseme event handler
      synthesizer.visemeReceived = function (s, e) {
        console.log(`Viseme ${e.visemeId} received at ${e.audioOffset / 10000}ms`);
        visemeData.push({
          visemeId: e.visemeId,
          audioOffset: e.audioOffset,
          animation: e.animation
        });
      };
      
      // Escape special XML characters to prevent SSML parsing errors
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      // Create SSML
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK">
        <voice name="${speechConfig.speechSynthesisVoiceName}">
          <prosody rate="1.05">${escapedText}</prosody>
        </voice>
      </speak>`;
      
      console.log("Starting speech synthesis with SDK...");
      
      // Set a timeout to catch hanging connections
      const connectionTimeout = setTimeout(() => {
        if (!websocketOpened) {
          console.error("Connection timeout - the websocket took too long to establish");
          try {
            synthesizer.close();
          } catch (e) {
            console.warn("Error closing synthesizer after timeout:", e);
          }
          
          // Resolve with manual visemes since the connection failed
          const manualVisemeData = generateManualVisemes(text.length);
          
          // Try one more time with the REST API
          axios({
            method: 'post',
            url: `https://${speechConfig.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
            headers: {
              'Ocp-Apim-Subscription-Key': speechConfig.getProperty(SpeechSDK.PropertyId.SpeechServiceConnection_Key),
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
              'User-Agent': 'patient-simulation-hk'
            },
            data: ssml,
            responseType: 'arraybuffer',
            timeout: 10000
          }).then(response => {
            const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            resolve({
              audioUrl,
              visemeData: manualVisemeData
            });
          }).catch(err => {
            reject(new Error("Both websocket and REST API failed: " + err.message));
          });
        }
      }, 5000);
      
      synthesizer.speakSsmlAsync(
        ssml,
        result => {
          clearTimeout(connectionTimeout);
          synthesizer.close();
          
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            try {
              const audioBlob = new Blob([result.audioData], { type: 'audio/mp3' });
              const audioUrl = URL.createObjectURL(audioBlob);
              
              console.log(`Synthesis complete. Audio size: ${result.audioData.byteLength} bytes, Visemes: ${visemeData.length}`);
              
              if (visemeData.length === 0) {
                console.warn("No viseme data received. Using manual visemes.");
                const manualVisemeData = generateManualVisemes(text.length);
                resolve({
                  audioUrl,
                  visemeData: manualVisemeData
                });
              } else {
                const sortedVisemes = [...visemeData].sort((a, b) => a.audioOffset - b.audioOffset);
                resolve({
                  audioUrl,
                  visemeData: sortedVisemes
                });
              }
            } catch (processingError) {
              console.error("Error processing audio data:", processingError);
              
              // Still attempt to provide a result with manual visemes on error
              const manualVisemeData = generateManualVisemes(text.length);
              resolve({
                audioUrl,
                visemeData: manualVisemeData
              });
            }
          } else {
            console.error("Speech synthesis failed:", result.errorDetails);
            
            // If we have a specific error about websocket
            if (result.errorDetails && result.errorDetails.includes('websocket')) {
              console.log("Detected websocket error, falling back to manual visemes");
              const manualVisemeData = generateManualVisemes(text.length);
              
              // Try REST API as fallback for audio
              tryRestApiForAudio(speechConfig, ssml)
                .then(audioUrl => {
                  resolve({
                    audioUrl,
                    visemeData: manualVisemeData
                  });
                })
                .catch(e => {
                  reject(new Error(`Websocket error and REST API fallback failed: ${e.message}`));
                });
            } else {
              reject(new Error(`Speech synthesis failed: ${result.errorDetails || 'Unknown error'}`));
            }
          }
        },
        error => {
          clearTimeout(connectionTimeout);
          console.error("Error in speech synthesis:", error);
          synthesizer.close();
          
          // Try REST API as fallback for audio on error
          const manualVisemeData = generateManualVisemes(text.length);
          
          tryRestApiForAudio(speechConfig, ssml)
            .then(audioUrl => {
              resolve({
                audioUrl,
                visemeData: manualVisemeData
              });
            })
            .catch(e => {
              reject(error);
            });
        }
      );
    } catch (sdkError) {
      console.error("Critical error in speech synthesis:", sdkError);
      reject(sdkError);
    }
  });
}

/**
 * Helper function to try the REST API for audio only
 * @private
 */
async function tryRestApiForAudio(speechConfig, ssml) {
  try {
    const response = await axios({
      method: 'post',
      url: `https://${speechConfig.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      headers: {
        'Ocp-Apim-Subscription-Key': speechConfig.getProperty(SpeechSDK.PropertyId.SpeechServiceConnection_Key),
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'patient-simulation-hk'
      },
      data: ssml,
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error("REST API fallback failed:", error);
    throw error;
  }
}

/**
 * Generate manual viseme data for testing purposes
 * This creates a sequence of visemes with timing that can be used
 * when the real viseme data isn't available
 */
function generateManualVisemes(textLength) {
  // Adjust duration based on text length - longer text needs more time
  const baseDuration = 2000; // 2 second base (increased from 1.5s)
  const charDuration = 100; // 100ms per character - increased for slower pacing
  
  // Calculate total estimated audio duration in milliseconds
  // Cantonese speech requires more time, so we increase the duration estimate
  const estimatedDuration = baseDuration + (textLength * charDuration);
  
  // Apply 1.05 speed adjustment factor to match speech playback rate
  const speedAdjustmentFactor = 1.05;
  const adjustedDuration = estimatedDuration / speedAdjustmentFactor;
  
  // Make sure the total duration is sufficient for longer text (up to 30 seconds)
  const totalDuration = Math.min(adjustedDuration * 1.3, 30000); // 30% buffer, max 30 seconds
  
  console.log(`Generated viseme animation for estimated ${totalDuration}ms duration (${textLength} chars) with 1.05x speed adjustment`);
  
  const visemeData = [];
  const visemesPerSecond = 8; // Increased from 5 to ensure more frequent viseme updates
  const totalVisemes = Math.max(30, Math.floor((totalDuration / 1000) * visemesPerSecond)); // Ensure at least 30 visemes
  
  // Common viseme sequence for speech with more natural transitions
  const visemeSequence = [1, 2, 6, 15, 18, 4, 8, 21, 19, 7, 3, 10, 5, 14, 9];
  
  // Add visemes distributed throughout the audio with variance for more natural movement
  for (let i = 0; i < totalVisemes; i++) {
    // Apply a more even distribution curve for more consistent animation
    const progress = i / totalVisemes;
    
    // Create a slightly non-linear distribution to match speech rhythm
    let adjustedProgress;
    if (progress < 0.1) {
      // Slower at the beginning (opening mouth)
      adjustedProgress = progress * 0.8;
    } else if (progress > 0.9) {
      // Slower at the end (finishing)
      adjustedProgress = 0.9 + (progress - 0.9) * 0.8;
    } else {
      // Normal pace in the middle
      adjustedProgress = 0.08 + (progress - 0.1) * (0.82 / 0.8);
    }
    
    const timeMs = totalDuration * adjustedProgress;
    const timeTicks = timeMs * 10000; // Convert ms to ticks (100ns)
    
    // Use each viseme for a consistent period to create smoother transitions
    const cyclePosition = Math.floor((i / 2) % visemeSequence.length);
    let visemeId = visemeSequence[cyclePosition];
    
    // Add some natural variance to the viseme selection (reduced randomness)
    if (Math.random() < 0.2) { // 20% chance to pick a different viseme
      visemeId = visemeSequence[Math.floor(Math.random() * visemeSequence.length)];
    }
    
    // For consecutive visemes, avoid too many of the same in a row
    if (visemeData.length > 0) {
      const lastViseme = visemeData[visemeData.length - 1].visemeId;
      if (visemeId === lastViseme && Math.random() < 0.7) {
        // 70% chance to change if we would repeat the same viseme
        const offset = Math.floor(Math.random() * 3) + 1; // 1-3 positions away
        visemeId = visemeSequence[(cyclePosition + offset) % visemeSequence.length];
      }
    }
    
    visemeData.push({
      visemeId,
      audioOffset: timeTicks,
      animation: null
    });
  }
  
  // Ensure a proper ending by adding a rest/silence viseme at the end
  visemeData.push({
    visemeId: 0, // Silence/rest
    audioOffset: totalDuration * 10000,
    animation: null
  });
  
  return visemeData;
} 