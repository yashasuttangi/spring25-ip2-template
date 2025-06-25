import ChatModel from '../models/chat.model';
import MessageModel from '../models/messages.model';
import UserModel from '../models/users.model';
import { Chat, ChatResponse, CreateChatPayload } from '../types/chat';
import { Message, MessageResponse } from '../types/message';

/**
 * Creates and saves a new chat document in the database, saving messages dynamically.
 *
 * @param chat - The chat object to be saved, including full message objects.
 * @returns {Promise<ChatResponse>} - Resolves with the saved chat or an error message.
 */
export const saveChat = async (chatPayload: CreateChatPayload): Promise<ChatResponse> => {
  // TODO: Task 3 - Implement the saveChat function. Refer to other service files for guidance.
  const { participants, messages } = chatPayload;

  if (!participants || participants.length < 2) {
    throw new Error('Atleast two participants are required to create a chat');
  }

  try {
    const savedMessages = await Promise.all(
      messages.map(async msg => {
        const newMessage = new MessageModel(msg);
        return newMessage.save();
      }),
    );

    console.log('participants', participants);

    const newChat = new ChatModel({
      participants,
      messages: savedMessages.map(msg => msg._id),
    });

    console.log('new chat', newChat);

    const savedChat = newChat.save();

    return savedChat;
  } catch (error) {
    return { error: 'Failed to save chat' };
  }
};
// ({ error: 'Not implemented' });

/**
 * Creates and saves a new message document in the database.
 * @param messageData - The message data to be created.
 * @returns {Promise<MessageResponse>} - Resolves with the created message or an error message.
 */
export const createMessage = async (messageData: Message): Promise<MessageResponse> => {
  // TODO: Task 3 - Implement the createMessage function. Refer to other service files for guidance.
  try {
    const user = await UserModel.findOne({ username: messageData.msgFrom });
    if (!user) {
      throw new Error('User not found');
    }

    const result = await MessageModel.create(messageData);

    if (!result) {
      throw new Error('Unexpected error occured');
    }

    return result;
  } catch (error) {
    return { error: `Failed to create message - ${error}` };
  }
};
// ({ error: 'Not implemented' });

/**
 * Adds a message ID to an existing chat.
 * @param chatId - The ID of the chat to update.
 * @param messageId - The ID of the message to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addMessageToChat = async (
  chatId: string,
  messageId: string,
): Promise<ChatResponse> => {
  // TODO: Task 3 - Implement the addMessageToChat function. Refer to other service files for guidance.
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: messageId } },
      { new: true },
    ).populate('messages');

    if (!updatedChat) {
      throw new Error('Chat not found');
    }

    return updatedChat;
  } catch (error) {
    return { error: `Error occured when adding message to chat: ${error}` };
  }
};
// ({ error: 'Not implemented' });

/**
 * Retrieves a chat document by its ID.
 * @param chatId - The ID of the chat to retrieve.
 * @returns {Promise<ChatResponse>} - Resolves with the found chat object or an error message.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> => {
  // TODO: Task 3 - Implement the getChat function. Refer to other service files for guidance.
  try {
    const chat = await ChatModel.findById(chatId).populate('messages');

    if (!chat) {
      throw new Error('Chat not found');
    }

    return chat;
  } catch (error) {
    return { error: `Error occured when fetching chat: ${error}` };
  }
};
// ({ error: 'Not implemented' });

/**
 * Retrieves chats that include all the provided participants.
 * @param p An array of participant usernames to match in the chat's participants.
 * @returns {Promise<Chat[]>} A promise that resolves to an array of chats where the participants match.
 * If no chats are found or an error occurs, the promise resolves to an empty array.
 */
export const getChatsByParticipants = async (p: string[]): Promise<Chat[]> => {
  // TODO: Task 3 - Implement the getChatsByParticipants function. Refer to other service files for guidance.
  try {
    const chats = await ChatModel.find({
      participants: { $in: p },
    }).lean();

    if (!chats || chats.length === 0) {
      return [];
    }
    return chats;
  } catch (error) {
    return [];
  }
};

/**
 * Adds a participant to an existing chat.
 *
 * @param chatId - The ID of the chat to update.
 * @param userId - The ID of the user to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addParticipantToChat = async (
  chatId: string,
  userId: string,
): Promise<ChatResponse> => {
  // TODO: Task 3 - Implement the addParticipantToChat function. Refer to other service files for guidance.
  try {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $addToSet: { participants: userId } },
      { new: true },
    );

    if (!updatedChat) {
      throw new Error('Chat not found');
    }

    return updatedChat;
  } catch (error) {
    if (error) {
      return { error: `${error}` };
    }
    return { error: `Error occured while adding participant` };
  }
};
// ({ error: 'Not implemented' });
