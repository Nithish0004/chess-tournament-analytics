import api from './axios';

// Auth
export const loginApi = async (username, password) => {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
};

// Players
export const getPlayersApi = async (q = '') => {
  const url = q ? `/players?q=${encodeURIComponent(q)}` : '/players';
  const { data } = await api.get(url);
  return data;
};

export const getPlayerByIdApi = async (id) => {
  const { data } = await api.get(`/players/${id}`);
  return data;
};

export const createPlayerApi = async (playerData) => {
  const { data } = await api.post('/players', playerData);
  return data;
};

export const updatePlayerApi = async (id, playerData) => {
  const { data } = await api.put(`/players/${id}`, playerData);
  return data;
};

export const getPlayerAnalyticsApi = async (id) => {
  const { data } = await api.get(`/players/${id}/analytics`);
  return data;
};

// Tournaments
export const getTournamentsApi = async () => {
  const { data } = await api.get('/tournaments');
  return data;
};

export const getTournamentByIdApi = async (id) => {
  const { data } = await api.get(`/tournaments/${id}`);
  return data;
};

export const createTournamentApi = async (tournamentData) => {
  const { data } = await api.post('/tournaments', tournamentData);
  return data;
};

export const updateTournamentApi = async (id, tournamentData) => {
  const { data } = await api.put(`/tournaments/${id}`, tournamentData);
  return data;
};

export const registerPlayerApi = async (tournamentId, playerId) => {
  const { data } = await api.post(`/tournaments/${tournamentId}/register`, {
    player_id: Number(playerId)
  });
  return data;
};

export const getRegistrationsApi = async (tournamentId) => {
  const { data } = await api.get(`/tournaments/${tournamentId}/registrations`);
  return data;
};

export const createRoundApi = async (tournamentId) => {
  const { data } = await api.post(`/tournaments/${tournamentId}/rounds`);
  return data;
};

export const getRoundsApi = async (tournamentId) => {
  const { data } = await api.get(`/tournaments/${tournamentId}/rounds`);
  return data;
};

export const getStandingsApi = async (tournamentId) => {
  const { data } = await api.get(`/tournaments/${tournamentId}/standings`);
  return data;
};

export const getTournamentAnalyticsApi = async (tournamentId) => {
  const { data } = await api.get(`/tournaments/${tournamentId}/analytics`);
  return data;
};

export const getTournamentPredictionsApi = async (tournamentId) => {
  const { data } = await api.get(`/tournaments/${tournamentId}/predictions`);
  return data;
};

// Rounds & Games
export const getGamesByRoundApi = async (roundId) => {
  const { data } = await api.get(`/rounds/${roundId}/games`);
  return data;
};

export const createGameApi = async (roundId, gameData) => {
  const { data } = await api.post(`/rounds/${roundId}/games`, gameData);
  return data;
};

export const recordResultApi = async (gameId, outcome) => {
  const { data } = await api.post(`/games/${gameId}/result`, { outcome });
  return data;
};

export const getRecentResultsApi = async () => {
  const { data } = await api.get('/games/recent');
  return data;
};

// Dashboard
export const getDashboardApi = async () => {
  const { data } = await api.get('/dashboard');
  return data;
};
