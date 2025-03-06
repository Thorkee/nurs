import axios from 'axios';

/**
 * Converts text to speech using Azure Speech Studio API
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} - URL to the audio blob
 */
export const textToSpeech = async (text) => {
  try {
    // Get API credentials from environment variables
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    const voiceName = process.env.AZURE_SPEECH_VOICE_NAME || 'zh-HK-WanLungNeural';

    // First, get an authorization token
    const tokenResponse = await axios.post(
      `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      null,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    const accessToken = tokenResponse.data;

    // Prepare SSML (Speech Synthesis Markup Language)
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK">
        <voice name="${voiceName}">
          <prosody rate="0.9" pitch="-0.2">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    // Make request to speech synthesis endpoint
    const response = await axios({
      method: 'post',
      url: `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'patient-simulation-hk'
      },
      data: ssml,
      responseType: 'arraybuffer'
    });

    // Convert the audio data to a blob and create a URL
    const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw new Error(`Failed to convert text to speech: ${error.message}`);
  }
}; 