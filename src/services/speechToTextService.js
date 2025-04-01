import axios from 'axios';

// Add a simple cache for frequently transcribed phrases
const transcriptionCache = new Map();
const MAX_CACHE_SIZE = 50; // Limit cache size

/**
 * Compresses audio blob before sending to API
 * @param {Blob} audioBlob - The audio blob to compress
 * @returns {Promise<Blob>} - Compressed audio blob
 */
const compressAudioBlob = async (audioBlob) => {
  try {
    // Check if the blob is already small enough
    if (audioBlob.size <= 100 * 1024) { // 100KB
      console.log('Audio already small enough, skipping compression');
      return audioBlob;
    }

    // Create audio context for processing
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      1, // mono
      audioBuffer.length * 0.5, // downsample by 50%
      audioBuffer.sampleRate / 2 // reduce sample rate
    );
    
    // Create buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect source to destination
    source.connect(offlineContext.destination);
    
    // Start source
    source.start(0);
    
    // Render audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert buffer to wave format
    const wavBlob = bufferToWave(renderedBuffer, offlineContext.length);
    
    console.log(`Compressed audio from ${audioBlob.size} to ${wavBlob.size} bytes (${Math.round(wavBlob.size / audioBlob.size * 100)}%)`);
    
    return wavBlob;
  } catch (error) {
    console.error('Audio compression failed:', error);
    // Return original blob if compression fails
    return audioBlob;
  }
};

/**
 * Converts AudioBuffer to WAV format
 * @param {AudioBuffer} buffer - Audio buffer to convert
 * @param {number} numFrames - Number of frames
 * @returns {Blob} - WAV blob
 */
const bufferToWave = (buffer, numFrames) => {
  const numChannels = 1; // Mono
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // Data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write audio data
  const samples = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

/**
 * Helper to write string to DataView
 */
const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Generate a cache key from audio blob
 * @param {Blob} audioBlob - The audio blob
 * @returns {string} - Cache key
 */
const generateCacheKey = (audioBlob) => {
  return `audio-${audioBlob.size}-${Date.now().toString().substr(-6)}`;
};

/**
 * Transcribes audio to text using Azure OpenAI Whisper API
 * @param {Blob} audioBlob - The audio blob to transcribe
 * @returns {Promise<string>} - The transcribed text
 */
export const transcribeSpeech = async (audioBlob) => {
  try {
    // Check cache by generating a key based on blob size (simple heuristic)
    const cacheKey = generateCacheKey(audioBlob);
    
    // If we have a cache hit and it's recent (< 5 minutes old), use it
    const cachedResult = transcriptionCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp < 5 * 60 * 1000)) {
      console.log('Using cached transcription for similar audio');
      return cachedResult.text;
    }
    
    // Compress audio before sending to API
    const compressedAudio = await compressAudioBlob(audioBlob);
    
    // Create form data to send audio file
    const formData = new FormData();
    formData.append('file', compressedAudio, 'recording.wav');
    formData.append('model', 'whisper');
    // You may need to specify language or other parameters based on Azure OpenAI API requirements
    formData.append('language', 'zh'); // Specifying Chinese (Whisper doesn't accept 'yue' for Cantonese)
    // Add prompt to ensure Hong Kong style Cantonese transcription for a nurse
    formData.append('prompt', 'IMPORTANT: This is a Cantonese (NOT Mandarin) transcription for a Hong Kong based nurse discussing medical procedures. The speaker is using Cantonese. Transcribe in Hong Kong style Cantonese using Traditional Chinese characters. Always use Cantonese pronunciation characters and Hong Kong written style (e.g., 係 not 是, 唔係 not 不是, 嚟 not 來, 喺 not 在, 俾 not 給). Include Hong Kong specific Cantonese particles like 嘅, 啦, 喎, 咩, 囉, 喇, 咗, 嗰, 嘢, 哋, 嗱. Common medical terms in this context include: 大腸內窺鏡 (colonoscopy), 腸胃科 (gastroenterology), 瀉藥 (laxative), 腸道準備 (bowel preparation), 麻醉 (anesthesia), 檢查 (examination), 風險 (risks), 副作用 (side effects), etc. Always output Cantonese, never Mandarin.');

    // Get API credentials from environment variables - using Whisper-specific variables if available
    const apiKey = import.meta.env.VITE_AZURE_WHISPER_API_KEY || import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const endpoint = import.meta.env.VITE_AZURE_WHISPER_ENDPOINT || import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const apiVersion = import.meta.env.VITE_AZURE_WHISPER_API_VERSION || import.meta.env.VITE_AZURE_OPENAI_API_VERSION;
    const deploymentId = import.meta.env.VITE_AZURE_WHISPER_DEPLOYMENT_ID || 'whisper';

    console.log('Azure Whisper API Key available:', !!apiKey);
    console.log('Azure Whisper Endpoint:', endpoint);
    console.log('Azure Whisper Deployment ID:', deploymentId);
    console.log('Audio blob size:', compressedAudio.size, 'bytes');
    console.log('Using language:', formData.get('language'));
    console.log('Prompt configured for HK Cantonese transcription');

    try {
      // Unlike standard OpenAI API, Azure requires endpoint, API version, and deployment name
      console.log('Sending audio to Azure Whisper API...');
      const response = await axios.post(
        `${endpoint}/openai/deployments/${deploymentId}/audio/transcriptions?api-version=${apiVersion}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'api-key': apiKey,
          },
          // Add timeout and signal for cancellation
          timeout: 15000, // 15 seconds timeout
        }
      );

      console.log('Successfully received transcription from Azure Whisper');
      const text = response.data.text;
      
      // Add to cache
      if (transcriptionCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const oldestKey = transcriptionCache.keys().next().value;
        transcriptionCache.delete(oldestKey);
      }
      
      transcriptionCache.set(cacheKey, {
        text,
        timestamp: Date.now()
      });
      
      return text;
    } catch (apiError) {
      console.error('Error calling Azure Whisper API:', apiError);
      if (apiError.response) {
        console.error('Response status:', apiError.response.status);
        console.error('Response data:', apiError.response.data);
      }
      throw new Error(`Failed to call Azure Whisper API: ${apiError.message}`);
    }
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw new Error(`Failed to transcribe speech: ${error.message}`);
  }
};