import { Router } from 'express';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  registerPlayer,
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
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.get('/', getTournaments);
router.post('/', requireAuth, validateBody(createTournamentSchema), createTournament);

router.get('/:id', getTournamentById);
router.put('/:id', requireAuth, validateBody(updateTournamentSchema), updateTournament);

router.post('/:id/register', requireAuth, validateBody(registerPlayerSchema), registerPlayer);
router.get('/:id/registrations', getRegistrations);

router.post('/:id/rounds', requireAuth, createRound);
router.get('/:id/rounds', getRounds);

router.get('/:id/standings', getStandings);
router.get('/:id/analytics', getTournamentAnalytics);
router.get('/:id/predictions', getTournamentPredictions);

export default router;
