import { Router } from 'express';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  startTournament,
  completeTournament,
  getTournamentProgress,
  generateNextRound,
  registerPlayer,
  registerMe,
  getRegistrations,
  removeRegistration,
  createRound,
  getRounds,
  getStandings,
  getTournamentAnalytics,
  getTournamentPredictions,
  createTournamentSchema,
  updateTournamentSchema,
  registerPlayerSchema
} from '../controllers/tournamentController.js';
import { authMiddleware, requireRole, requireApproved, requireTournamentAccess } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

// Every route requires an authenticated ACTIVE user
router.use(authMiddleware);

// Public (to active users) queries
router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.get('/:id/progress', getTournamentProgress);
router.get('/:id/registrations', getRegistrations);
router.get('/:id/rounds', getRounds);
router.get('/:id/standings', getStandings);
router.get('/:id/analytics', getTournamentAnalytics);
router.get('/:id/predictions', getTournamentPredictions);

// Player self-registration (PLAYER only, player_id extracted from req.user, requires APPROVED)
router.post('/:id/register-me', requireRole('PLAYER'), requireApproved, registerMe);

// Create tournament: ORGANIZER and ADMIN only (requires APPROVED)
router.post('/', requireRole('ORGANIZER', 'ADMIN'), requireApproved, validateBody(createTournamentSchema), createTournament);

// Tournament status transitions and generation: enforced via requireApproved + requireTournamentAccess
router.post('/:id/start', requireApproved, requireTournamentAccess('tournament'), startTournament);
router.post('/:id/complete', requireApproved, requireTournamentAccess('tournament'), completeTournament);
router.post('/:id/rounds/generate', requireApproved, requireTournamentAccess('tournament'), generateNextRound);

// Tournament modification routes: enforced via requireApproved + requireTournamentAccess
router.put('/:id', requireApproved, requireTournamentAccess('tournament'), validateBody(updateTournamentSchema), updateTournament);
router.post('/:id/register', requireApproved, requireTournamentAccess('tournament'), validateBody(registerPlayerSchema), registerPlayer);
router.delete('/:id/registrations/:playerId', requireApproved, removeRegistration);
router.post('/:id/rounds', requireApproved, requireTournamentAccess('tournament'), createRound);

export default router;
