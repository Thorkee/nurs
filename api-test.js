// Simple Azure Speech Service API test script
// Run this with: node api-test.js

const axios = require('axios');

// Replace these with your actual credentials from .env.local
const speechKey = 'ErE5jYDMvDkaAPCSi0o0WJ8rX10uVzaH2C00UjzoNqG9qiwrc2foJQQJ99BCACHYHv6XJ3w3AAAYACOGJHDe';
const speechRegion = 'eastus2';
const voiceName = 'zh-HK-WanLungNeural';

async function testSpeechService() {
  console.log('Testing Azure Speech Service API...');
  console.log('Speech Key Length:', speechKey.length);
  console.log('Speech Region:', speechRegion);
  console.log('Voice Name:', voiceName);

  try {
    // Test 1: Try to get a token first (this is a common authentication method)
    console.log('\n1. Testing token endpoint...');
    try {
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
      
      console.log('✅ Successfully obtained token!');
      const token = tokenResponse.data;
      console.log(`Token starts with: ${token.substring(0, 10)}...`);
    } catch (error) {
      console.log('❌ Token endpoint failed:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.message);
      if (error.response?.data) {
        console.log('Response:', error.response.data);
      }
    }

    // Test 2: Try direct text-to-speech with API key
    console.log('\n2. Testing direct speech synthesis with API key...');
    
    // Simple SSML for testing
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-HK"><voice name="${voiceName}">你好，測試。</voice></speak>`;
    
    try {
      const response = await axios({
        method: 'post',
        url: `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'api-test-script'
        },
        data: ssml,
        responseType: 'arraybuffer'
      });
      
      console.log('✅ Successfully received speech response!');
      console.log('Response size:', response.data.byteLength, 'bytes');
      console.log('This indicates your API key and configuration are working correctly.');
    } catch (error) {
      console.log('❌ Speech synthesis failed:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.message);
      
      if (error.response?.data) {
        try {
          // Try to decode the error response if it's text
          const errorText = Buffer.from(error.response.data).toString();
          console.log('Response:', errorText);
        } catch (e) {
          console.log('Response: [Failed to decode error data]');
        }
      }
    }
    
    // Test 3: List available voices (this can help verify if the selected voice exists)
    console.log('\n3. Testing voices list endpoint...');
    try {
      const voicesResponse = await axios.get(
        `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': speechKey
          }
        }
      );
      
      console.log('✅ Successfully retrieved voices list!');
      console.log('Number of voices available:', voicesResponse.data.length);
      
      // Check if the specified voice exists
      const targetVoice = voicesResponse.data.find(v => v.ShortName === voiceName);
      if (targetVoice) {
        console.log(`Voice "${voiceName}" exists and is available.`);
        console.log('Voice details:', targetVoice);
      } else {
        console.log(`❌ Voice "${voiceName}" not found in available voices!`);
        console.log('Available Chinese (HK) voices:');
        voicesResponse.data
          .filter(v => v.Locale.includes('zh-HK'))
          .forEach(v => console.log(`- ${v.ShortName}: ${v.DisplayName}`));
      }
    } catch (error) {
      console.log('❌ Voices list endpoint failed:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.message);
      if (error.response?.data) {
        console.log('Response:', error.response.data);
      }
    }

  } catch (error) {
    console.log('Test failed with unexpected error:', error.message);
  }
}

testSpeechService(); 