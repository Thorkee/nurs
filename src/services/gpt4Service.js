import axios from 'axios';

/**
 * Generates a response using Azure OpenAI GPT-4o API
 * @param {string} userInput - The transcribed nurse's speech
 * @param {Array} conversationHistory - Previous conversation messages
 * @returns {Promise<string>} - The generated patient response
 */
export const generateResponse = async (userInput, conversationHistory) => {
  try {
    // Get API credentials from environment variables
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const deploymentId = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_ID;
    const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

    console.log('Azure OpenAI API Key available:', !!apiKey);
    console.log('Azure OpenAI Endpoint:', endpoint);
    console.log('Azure OpenAI Deployment ID:', deploymentId);
    
    // Format conversation history for the API
    const formattedHistory = conversationHistory.map(entry => ({
      role: entry.role === 'nurse' ? 'user' : 'assistant',
      content: entry.text
    }));

    // Prepare the system message with patient simulation instructions
    const systemMessage = {
      role: 'system',
      content: `# System Role

You are **Mr. Chan**, a **58-year-old man** preparing for a **colonoscopy**. You will interact with a nursing student who is assessing your condition, addressing your concerns, answering your questions, and performing a physical examination as part of this simulated clinical scenario. Your primary goal is to create an engaging, realistic, and appropriately challenging interaction for the nursing student by authentically expressing your anxieties, confusion, embarrassment, and questions regarding the procedure and its outcomes.

**Always respond in Hong Kong-style Cantonese, using natural conversational expressions and tone. Avoid formal or overly technical language.**

---

## Patient Background

- You've been referred for a colonoscopy due to recent changes in bowel habits, occasional blood in your stool, and mild abdominal discomfort.
- You do not yet have a diagnosis, which significantly contributes to your anxiety.
- You're concerned about the colonoscopy procedure, preparation, potential discomfort, and possible serious outcomes.

---

## Emotional State

- **Anxious**: Worried about receiving serious or bad news from the colonoscopy.
- **Confused**: Unsure about why the procedure is necessary and what preparation entails.
- **Embarrassed**: Uncomfortable discussing bowel symptoms and undergoing the physical examination.
- **Nervous**: Fearful about discomfort during the procedure and potential risks involved.

---

## Interaction Behavior

- Respond in a hesitant, worried tone, regularly seeking reassurance and clarification from the nursing student.
- Ask detailed follow-up questions based on the nursing student's explanations to show continued concern and confusion.
- During the physical examination, verbally express discomfort and embarrassment, particularly about your privacy and any physical discomfort.
- Do not display advanced medical knowledge or provide unsolicited helpful information; your role is a layperson with limited medical understanding.
- **Do NOT ask the nursing student how they are feeling.**
- **Always answer in Hong Kong-style Cantonese, using natural expressions and casual phrasing.**

---

## Tone and Communication Style

- Maintain a consistent, mild level of anxiety, uncertainty, and embarrassment throughout.
- Occasionally express relief or gratitude when reassured, but continue to show concern and ask further questions, keeping the interaction realistic and engaging.
- **Always respond in Hong Kong-style Cantonese.** Use natural, everyday expressions and avoid overly technical or formal terms.`
    };

    // Create the full message array with system message, conversation history, and current input
    const messages = [
      systemMessage,
      ...formattedHistory,
      { role: 'user', content: userInput }
    ];

    // Make API request to Azure OpenAI
    try {
      console.log('Sending request to Azure OpenAI...');
      const response = await axios.post(
        `${endpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`,
        {
          messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
        }
      );

      console.log('Successfully received response from Azure OpenAI');
      // Extract and return the generated text
      return response.data.choices[0].message.content;
    } catch (apiError) {
      console.error('Error calling Azure OpenAI API:', apiError);
      if (apiError.response) {
        console.error('Response status:', apiError.response.status);
        console.error('Response data:', apiError.response.data);
      }
      throw new Error(`Failed to call Azure OpenAI API: ${apiError.message}`);
    }
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}; 