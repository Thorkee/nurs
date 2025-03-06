/**
 * Utility functions for file operations
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Saves a conversation history to a text file
 * @param {Array} conversations - Array of conversation entries
 * @returns {Blob} - A blob containing the text file
 */
export const saveConversationToText = (conversations) => {
  let content = "Conversation History\n";
  content += "===================\n\n";
  
  conversations.forEach((entry, index) => {
    const time = new Date(entry.timestamp).toLocaleString();
    const role = entry.role === 'nurse' ? 'Nurse' : 'Patient (Mr. Chan)';
    
    content += `[${time}] ${role}:\n`;
    content += `${entry.text}\n\n`;
  });
  
  return new Blob([content], { type: 'text/plain;charset=utf-8' });
};

/**
 * Creates a zip file with conversation text and audio
 * @param {Array} conversations - Array of conversation entries
 * @param {Array} audioBlobs - Array of audio blobs
 * @returns {Promise<Blob>} - A promise that resolves to a zip file blob
 */
export const createConversationZip = async (conversations, audioBlobs) => {
  try {
    console.log('Creating zip with conversations and audio');
    const zip = new JSZip();
    
    // Add conversation text
    console.log('Adding text file to zip');
    const textBlob = saveConversationToText(conversations);
    zip.file("conversation.txt", textBlob);
    
    // Add conversation audio
    if (audioBlobs && audioBlobs.length > 0) {
      console.log('Adding audio file to zip');
      try {
        // Combine all audio blobs into a single audio file
        const combinedAudioBlob = await combineAudioBlobs(audioBlobs);
        if (combinedAudioBlob) {
          zip.file("conversation_audio.mp3", combinedAudioBlob);
          console.log('Audio added to zip successfully');
        } else {
          console.error('Failed to combine audio blobs');
        }
      } catch (audioError) {
        console.error('Error combining audio:', audioError);
        // Continue without audio
      }
    } else {
      console.log('No audio blobs to add to zip');
    }
    
    // Generate the zip file
    console.log('Generating zip file...');
    const zipBlob = await zip.generateAsync({ type: "blob" });
    console.log('Zip file generated, size:', zipBlob.size, 'bytes');
    return zipBlob;
  } catch (error) {
    console.error('Error creating zip:', error);
    throw error;
  }
};

/**
 * Downloads a zip file containing conversation data
 * @param {Array} conversations - Array of conversation entries
 * @param {Array} audioBlobs - Array of audio blobs
 */
export const downloadConversationZip = async (conversations, audioBlobs) => {
  try {
    console.log('Starting download process');
    
    // Validate parameters
    if (!conversations || !Array.isArray(conversations)) {
      console.error('Invalid conversations parameter:', conversations);
      throw new Error('Conversations must be an array');
    }
    
    if (conversations.length === 0) {
      console.warn('No conversations to save');
    }
    
    // Handle audio blobs validation
    let validAudioBlobs = [];
    if (audioBlobs) {
      if (Array.isArray(audioBlobs)) {
        // Filter out any null or undefined values
        validAudioBlobs = audioBlobs.filter(blob => blob instanceof Blob);
        console.log('Validated audio blobs:', validAudioBlobs.length);
      } else if (audioBlobs instanceof Blob) {
        validAudioBlobs = [audioBlobs];
        console.log('Single audio blob provided');
      }
    }
    
    const zipBlob = await createConversationZip(conversations, validAudioBlobs);
    
    // Generate a filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `conversation_${timestamp}.zip`;
    
    console.log('Saving file as:', filename);
    
    // Download the zip file
    saveAs(zipBlob, filename);
    console.log('Download initiated');
    
    return true;
  } catch (error) {
    console.error('Error downloading conversation zip:', error);
    return false;
  }
};

/**
 * Combines multiple audio blobs into a single audio file
 * @param {Array} audioBlobs - Array of audio blobs
 * @returns {Promise<Blob>} - A promise that resolves to a combined audio blob
 */
export const combineAudioBlobs = async (audioBlobs) => {
  console.log('Combining audio blobs, count:', audioBlobs.length);
  
  // Validate input
  if (!audioBlobs || !Array.isArray(audioBlobs) || audioBlobs.length === 0) {
    console.error('Invalid audio blobs provided:', audioBlobs);
    return null;
  }
  
  // Make sure all blobs are valid
  const validBlobs = audioBlobs.filter(blob => blob instanceof Blob);
  console.log('Valid blobs:', validBlobs.length, 'of', audioBlobs.length);
  
  if (validBlobs.length === 0) {
    console.error('No valid audio blobs found');
    return null;
  }
  
  // If there's only one blob, return it
  if (validBlobs.length === 1) {
    console.log('Only one blob, returning it directly');
    return validBlobs[0];
  }
  
  try {
    // Create a new blob that concatenates all the audio blobs
    // This is a simple concatenation and might not produce a properly
    // playable audio file in all cases, but it's a start
    console.log('Creating concatenated blob');
    const concatenatedBlob = new Blob(validBlobs, { type: 'audio/mp3' });
    console.log('Concatenated blob created, size:', concatenatedBlob.size, 'bytes');
    return concatenatedBlob;
  } catch (error) {
    console.error('Error concatenating blobs:', error);
    // If concatenation fails, return the first blob as fallback
    return validBlobs[0];
  }
}; 