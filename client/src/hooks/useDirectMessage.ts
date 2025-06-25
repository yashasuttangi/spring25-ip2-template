import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, Message, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [error, setError] = useState<string>(''); // Adding another state just to handle errors throughout and avoid lint errors for console.error / empty return statements.

  const handleJoinChat = (chatID: string) => {
    // TODO: Task 3 - Emit a 'joinChat' event to the socket with the chat ID function argument.
    socket.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    // TODO: Task 3 - Implement the send message handler function.
    // Whitespace-only messages should not be sent, and the current chat to send this message to
    // should be defined. Use the appropriate service function to make an API call, and update the
    // states accordingly.
    if (!newMessage.trim() || !selectedChat || !user._id) {
      setError('Invalid - Empty message / missing chat or user');
      return;
    }

    const msg: Message = {
      msg: newMessage.trim(),
      msgFrom: user.username.toString(),
      msgDateTime: new Date(),
      type: 'direct',
    };

    try {
      const updatedChat = await sendMessage(msg, selectedChat._id!.toString());

      setSelectedChat(updatedChat);
      setNewMessage('');
      setError('');
    } catch (err) {
      setError('Error occured while sending message');
    }
  };

  const handleChatSelect = async (chatID: string | undefined) => {
    // TODO: Task 3 - Implement the chat selection handler function.
    // If the chat ID is defined, fetch the chat details using the appropriate service function,
    // and update the appropriate state variables. Make sure the client emits a socket event to
    // subscribe to the chat room.
    if (!chatID) {
      setError('Invalid chat ID');
      return;
    }
    try {
      const chat = await getChatById(chatID);
      if ('error' in chat) {
        throw new Error('Unexpected error occured while fetching the chat');
      }

      setSelectedChat(chat);
      handleJoinChat(chatID);
      setError('');
    } catch (err) {
      setError('Failed to load chat');
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    // TODO: Task 3 - Implement the create chat handler function.
    // If the username to create a chat is defined, use the appropriate service function to create a new chat
    // between the current user and the chosen user. Update the appropriate state variables and emit a socket
    // event to join the chat room. Hide the create panel after creating the chat.
    if (!chatToCreate || !user.username || chatToCreate === user.username) {
      return;
    }

    try {
      const chat = await createChat([user.username, chatToCreate]);

      if ('error' in chat) {
        throw new Error('Unexpected error occured');
      }

      setChats(prev => [...prev, chat]);
      setSelectedChat(chat);
      handleJoinChat(chat._id.toString());
      setShowCreatePanel(false);
      setChatToCreate('');
      setError('');
    } catch (err) {
      setError('Failed to create chat');
    }
  };

  useEffect(() => {
    const fetchChats = async () => {
      // TODO: Task 3 - Fetch all the chats with the current user and update the state variable.
      if (!user.username) {
        return;
      }

      try {
        const chatsData = await getChatsByUser(user.username);
        if ('error' in chatsData) {
          throw new Error('Unexpected error occured');
        }
        setChats(chatsData);
        setError('');
      } catch (err) {
        setError('Failed to fetch chats');
      }
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      // TODO: Task 3 - Implement the chat update handler function.
      // This function is responsible for updating the state variables based on the
      // socket events received. The function should handle the following cases:
      // - A new chat is created (add the chat to the current list of chats)
      // - A new message is received (update the selected chat with the new message)
      // - Throw an error for an invalid chatUpdate type
      // NOTE: For new messages, the user will only receive the update if they are
      // currently subscribed to the chat room.
      if (!chatUpdate || !chatUpdate.chat) {
        return;
      }

      switch (chatUpdate.type) {
        case 'created':
          setChats(prev => [...prev, chatUpdate.chat]);
          break;
        case 'newMessage':
          if (selectedChat && selectedChat._id?.toString() === chatUpdate.chat._id?.toString()) {
            setSelectedChat(chatUpdate.chat);
          }
          break;
        default:
          break;
      }
    };

    fetchChats();

    // TODO: Task 3 - Register the 'chatUpdate' event listener
    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      // TODO: Task 3 - Unsubscribe from the socket event
      // TODO: Task 3 - Emit a socket event to leave the particular chat room
      // they are currently in when the component unmounts.
      socket.off('chatUpdate', handleChatUpdate);
      if (selectedChat?._id) {
        socket.emit('leaveChat', selectedChat._id.toString());
      }
    };
  }, [user.username, socket, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
    error,
  };
};

export default useDirectMessage;
