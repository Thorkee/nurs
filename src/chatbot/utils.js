/**
 * Format timestamp to human-readable format
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format the date for file naming
 * @returns {string} Formatted date string for filenames
 */
export const getFormattedDate = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10) + '_' + 
    now.getHours().toString().padStart(2, '0') + 
    now.getMinutes().toString().padStart(2, '0') + 
    now.getSeconds().toString().padStart(2, '0');
};

/**
 * Export conversation history as a text file
 * @param {Array} messages - The conversation messages
 */
export const exportChatAsText = (messages) => {
  if (!messages || messages.length === 0) return;

  // Format each message
  const formattedChat = messages.map(msg => {
    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    const timestamp = msg.timestamp ? `[${new Date(msg.timestamp).toLocaleString()}] ` : '';
    return `${timestamp}${roleLabel}: ${msg.content}`;
  }).join('\n\n');

  // Add a header with timestamp
  const header = `Chat Conversation - Exported ${new Date().toLocaleString()}\n\n`;
  const fileContent = header + formattedChat;

  // Create file and trigger download
  const blob = new Blob([fileContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat_export_${getFormattedDate()}.txt`;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}; 