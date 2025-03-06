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
    const apiKey = import.meta.env.VITE_AZURE_WHISPER_API_KEY || import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const endpoint = import.meta.env.VITE_AZURE_WHISPER_ENDPOINT || import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const apiVersion = import.meta.env.VITE_AZURE_WHISPER_API_VERSION || import.meta.env.VITE_AZURE_OPENAI_API_VERSION;
    const deploymentId = import.meta.env.VITE_AZURE_WHISPER_DEPLOYMENT_ID || 'whisper';

    console.log('Azure Whisper API Key available:', !!apiKey);
    console.log('Azure Whisper Endpoint:', endpoint);
    console.log('Azure Whisper Deployment ID:', deploymentId);
    console.log('Audio blob size:', audioBlob.size, 'bytes');

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
        }
      );

      console.log('Successfully received transcription from Azure Whisper');
      return response.data.text;
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