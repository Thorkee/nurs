import axios from 'axios';

/**
 * Transcribes audio to text using Azure OpenAI Whisper API
 * @param {Blob} audioBlob - The audio blob to transcribe
 * @returns {Promise<string>} - The transcribed text
 */
export const transcribeSpeech = async (audioBlob) => {
  try {
    // Create form data to send audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', 'whisper');
    // You may need to specify language or other parameters based on Azure OpenAI API requirements
    formData.append('language', 'zh'); // Specifying Cantonese/Chinese

    // Get API credentials from environment variables - using Whisper-specific variables if available
    const apiKey = process.env.AZURE_WHISPER_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_WHISPER_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT;
    const apiVersion = process.env.AZURE_WHISPER_API_VERSION || process.env.AZURE_OPENAI_API_VERSION;
    const deploymentId = process.env.AZURE_WHISPER_DEPLOYMENT_ID || 'whisper';

    // Unlike standard OpenAI API, Azure requires endpoint, API version, and deployment name
    const response = await axios.post(
      `${endpoint}/openai/deployments/${deploymentId}/audio/transcriptions?api-version=${apiVersion}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'api-key': apiKey,
        },
      }
    );

    return response.data.text;
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw new Error(`Failed to transcribe speech: ${error.message}`);
  }
}; 