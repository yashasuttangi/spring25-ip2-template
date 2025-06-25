import express, { Response } from 'express';
import { isValidObjectId } from 'mongoose';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
  ChatUpdatePayload,
  Chat,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean =>
    // TODO: Task 3 - Implement the isCreateChatRequestValid function.
    Array.isArray(req.body.participants) &&
    req.body.participants.length > 0 &&
    Array.isArray(req.body.messages);

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean => {
    // TODO: Task 3 - Implement the isAddMessageRequestValid function.
    const { msg, msgFrom } = req.body;
    return typeof msg === 'string' && msg.trim() !== '' && typeof msgFrom === 'string';
  };

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean =>
    // TODO: Task 3 - Implement the isAddParticipantRequestValid function.
    typeof req.body.participantId === 'string';
  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    // TODO: Task 3 - Implement the createChatRoute function
    // Emit a `chatUpdate` event to share the creation of a new chat

    if (!isCreateChatRequestValid(req) || req.body.participants.length < 2) {
      res.status(400).send('Invalid request body');
      return;
    }

    try {
      const savedChat = await saveChat(req.body);
      if ('error' in savedChat) {
        res.status(500).send(savedChat.error);
        return;
      }

      const populatedChat = (await populateDocument(savedChat._id.toString(), 'chat')) as Chat;
      const payload: ChatUpdatePayload = { chat: populatedChat, type: 'created' };
      socket.emit('chatUpdate', payload);
      res.status(200).json(savedChat);
    } catch (error) {
      res.status(500).send(`Unexpected error during chat creation : ${error}`);
    }

    // res.status(501).send('Not implemented');
  };

  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    // TODO: Task 3 - Implement the addMessageToChatRoute function
    // Emit a `chatUpdate` event to share the updated chat, specifically to
    // the chat room where the message was added (hint: look into socket rooms)
    // NOTE: Make sure to define the message type to be a direct message when creating it.
    if (!isAddMessageRequestValid(req)) {
      res.status(400).send('Invalid request body');
      return;
    }

    const { chatId } = req.params;

    if (!isValidObjectId(chatId)) {
      res.status(400).send('Invalid chat ID');
      return;
    }

    try {
      const message = await createMessage({
        ...req.body,
        type: 'direct',
        msgDateTime: req.body.msgDateTime ?? new Date(),
      });

      if ('error' in message || !message._id) {
        res.status(500).send('Failed to create message');
        return;
      }
      const chat = await addMessageToChat(chatId, message._id?.toString());

      if ('error' in chat || !chat._id) {
        res.status(500).send('Failed to update chat with new message');
        return;
      }

      const populateChat = await populateDocument(chat._id.toString(), 'chat');

      if ('error' in populateChat) {
        res.status(500).send('Failed to populate updated chat');
        return;
      }

      const chatUpdatePayload: ChatUpdatePayload = {
        chat: populateChat as Chat,
        type: 'newMessage',
      };

      socket.to(chatId).emit('chatUpdate', chatUpdatePayload);
      res.status(200).json(chat);
    } catch (error) {
      res.status(500).send('Error in adding message to chat route');
    }

    // res.status(501).send('Not implemented');
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    // TODO: Task 3 - Implement the getChatRoute function
    const { chatId } = req.params;

    if (!chatId) {
      res.status(400).send('Invalid chat ID');
      return;
    }

    try {
      const chat = await getChat(chatId);

      if ('error' in chat) {
        res.status(404).send('Chat not found');
        return;
      }

      const populateChat = await populateDocument(chatId, 'chat');
      res.status(200).json(populateChat);
    } catch (error) {
      res.status(500).send('Error occured while fetching data');
    }
    // res.status(501).send('Not implemented');
  };

  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    // TODO: Task 3 - Implement the getChatsByUserRoute function
    const { username } = req.params;

    if (!username || typeof username !== 'string') {
      res.status(400).send('Invalid username');
      return;
    }

    try {
      const chats = await getChatsByParticipants([username]);

      const populateChats = await Promise.all(
        chats.map(async chat => {
          const populated = await populateDocument(chat._id.toString(), 'chat');
          if ('error' in populated) {
            throw new Error('Failed populating chats');
          }
          return populated as Chat;
        }),
      );

      res.status(200).json(populateChats);
    } catch (error) {
      res.status(500).send(`Unexpected error during chat retrieval: ${error}`);
    }

    // res.status(501).send('Not implemented');
  };

  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    // TODO: Task 3 - Implement the addParticipantToChatRoute function
    const { chatId } = req.params;
    const { participantId } = req.body;
    if (!chatId || !isValidObjectId(chatId)) {
      res.status(400).send('Invalid chat ID');
      return;
    }

    if (!isAddParticipantRequestValid(req)) {
      res.status(400).send('Invalid participant ID');
      return;
    }

    try {
      const chat = await addParticipantToChat(chatId, participantId);

      if ('error' in chat) {
        res.status(500).send(chat.error);
        return;
      }

      res.status(200).json(chat);
    } catch (error) {
      res.status(500).send('Error occured while adding participant to chat route');
    }
    // res.status(501).send('Not implemented');
  };

  socket.on('connection', conn => {
    // TODO: Task 3 - Implement the `joinChat` event listener on `conn`
    // The socket room will be defined to have the chat ID as the room name
    // TODO: Task 3 - Implement the `leaveChat` event listener on `conn`
    // You should only leave the chat if the chat ID is provided/defined
    conn.on('joinChat', (chatId: string) => {
      if (chatId && isValidObjectId(chatId)) {
        conn.join(chatId);
      }
    });

    conn.on('leaveChat', (chatId: string | undefined) => {
      if (chatId && isValidObjectId(chatId)) {
        conn.leave(chatId);
      }
    });
  });

  // Register the routes
  // TODO: Task 3 - Add appropriate HTTP verbs and endpoints to the router
  router.post('/createChat', createChatRoute);
  router.post('/:chatId/addMessage', addMessageToChatRoute);
  router.get('/:chatId', getChatRoute);
  router.get('/getChatsByUser/:username', getChatsByUserRoute);
  router.post('/:chatId/addParticipant', addParticipantToChatRoute);

  return router;
};

export default chatController;
