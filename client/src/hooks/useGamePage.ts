import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { GameErrorPayload, GameInstance, GameUpdatePayload } from '../types';
import { joinGame, leaveGame } from '../services/gamesService';

/**
 * Custom hook to manage the state and logic for the game page, including joining, leaving the game, and handling game updates.
 * @returns An object containing the following:
 * - `gameState`: The current state of the game, or null if no game is joined.
 * - `error`: A string containing any error messages related to the game, or null if no errors exist.
 * - `handleLeaveGame`: A function to leave the current game and navigate back to the game list.
 */
const useGamePage = () => {
  const { user, socket } = useUserContext();
  const { gameID } = useParams();
  const navigate = useNavigate();

  // TODO: Task 2 - Define the state variables:
  // - `gameState` to store the current game state or null if no game is joined.
  // - `joinedGameID` to store the ID of the joined game.
  // - `error` to display any error messages related to the game, or null if no error message.
  const [gameState, setGameState] = useState<GameInstance | null>(null);
  const [joinedGameID, setJoinedGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLeaveGame = async () => {
    // TODO: Task 2 - Implement the logic to leave the current game.
    // - If a game is joined and not over, make the appropriate API call to leave the game, and
    // emit a 'leaveGame' event to the server using the socket.
    if(joinedGameID && gameState?.state.status !== 'OVER') {
      try {
        await leaveGame(joinedGameID, user.username);
        socket.emit('leaveGame', joinedGameID);
      } catch (error) {
        console.error('Error leaving game: ', error);
      } finally { 
        // Always navigate back to the games page
        navigate('/games');
      }
    }
  };

  useEffect(() => {
    const handleJoinGame = async (id: string) => {
      // TODO: Task 2 - Implement the logic to join the game with the provided ID,
      // making an API call, emitting a 'joinGame' event to the server using the socket,
      // and setting apporoiate state variables.
      try {
        const joinedGame = await joinGame(id, user.username);
        setGameState(joinedGame);
        setJoinedGameId(joinedGameID);
        socket.emit('joinGame', id);
      } catch (error) {
        console.error('Error joining game: ', error);
      }
    };

    if (gameID) {
      handleJoinGame(gameID);
    }

    const handleGameUpdate = (updatedState: GameUpdatePayload) => {
      // TODO: Task 2 - Update the game state based on the received update
      setGameState(updatedState.gameState);
    };

    const handleGameError = (gameError: GameErrorPayload) => {
      // TODO: Task 2 - Display the error if this user caused the error
      if(gameError.player === user.username) {
        setError(gameError.error);
      }
    };

    // TODO: Task 2 - Register socket listeners for 'gameUpdate' and 'gameError' events
    socket.on('gameUpdate', handleGameUpdate);
    socket.on('gameError', handleGameError);

    return () => {
      // TODO: Task 2 -  Unsubscribe from the socket event on cleanup
      socket.off('gameUpdate', handleGameUpdate);
      socket.off('gameError', handleGameError);
    };
  }, [gameID, socket, user.username]);

  return {
    gameState,
    error,
    handleLeaveGame,
  };
};

export default useGamePage;
