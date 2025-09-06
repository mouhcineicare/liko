// lib/utils/conversation.ts
export function generateConversationId(user1Id: string, user2Id: string, user1Role: string) {
  // Always put patient ID first
  if (user1Role === 'therapist') {
    return `${user2Id}_${user1Id}`;
  }
  return `${user1Id}_${user2Id}`;
}

export function normalizeConversationId(conversationId: string, currentUserId: string, currentUserRole: string) {
  const [id1, id2] = conversationId.split('_');
  
  // If current user is therapist and their ID comes first, reverse the order
  if (currentUserRole === 'therapist' && id1 === currentUserId) {
    return `${id2}_${id1}`;
  }
  
  return conversationId;
}