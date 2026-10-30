import { Router } from 'express';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  registerPlayer,
  registerMe,
  getRegistrations,
  createRound,
  getRounds,
  getStandings,
  getTournamentAnalytics,
  getTournamentPredictions,
  createTournamentSchema,
  updateTournamentSchema,
  registerPlayerSchema
} from '../controllers/tournamentController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

// Every route requires an authenticated ACTIVE user
router.use(authMiddleware);

// Public (to active users) queries
router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.get('/:id/registrations', getRegistrations);
router.get('/:id/rounds', getRounds);
router.get('/:id/standings', getStandings);
router.get('/:id/analytics', getTournamentAnalytics);
router.get('/:id/predictions', getTournamentPredictions);

// Player self-registration (player_id extracted from req.user)
router.post('/:id/register-me', registerMe);

// Management routes: ORGANIZER and ADMIN only
router.post('/', requireRole('ORGANIZER', 'ADMIN'), validateBody(createTournamentSchema), createTournament);
router.put('/:id', requireRole('ORGANIZER', 'ADMIN'), validateBody(updateTournamentSchema), updateTournament);
router.post('/:id/register', requireRole('ORGANIZER', 'ADMIN'), validateBody(registerPlayerSchema), registerPlayer);
router.post('/:id/rounds', requireRole('ORGANIZER', 'ADMIN'), createRound);

export default router;
