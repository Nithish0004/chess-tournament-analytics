import { pool } from '../config/db.js';

export const getDashboardData = async (req, res, next) => {
  try {
    // 1. Top 10 by rating
    const [topPlayers] = await pool.query(
      `SELECT player_id, name, country, date_of_birth, current_rating, created_at
       FROM player
       ORDER BY current_rating DESC, player_id ASC
       LIMIT 10`
    );

    // 2. Outcome distribution
    const [outcomeRows] = await pool.query(
      `SELECT outcome, COUNT(*) AS count
       FROM result
       GROUP BY outcome`
    );

    const outcomeDistribution = {
      WHITE: 0,
      BLACK: 0,
      DRAW: 0,
      total: 0
    };

    for (const row of outcomeRows) {
      if (outcomeDistribution[row.outcome] !== undefined) {
        const count = Number(row.count);
        outcomeDistribution[row.outcome] = count;
        outcomeDistribution.total += count;
      }
    }

    // 3. Total upsets
    const [upsetCountRows] = await pool.query(
      'SELECT COUNT(*) AS total_upsets FROM v_upsets'
    );
    const totalUpsets = Number(upsetCountRows[0]?.total_upsets || 0);

    // 4. Recent upsets (latest 5)
    const [recentUpsets] = await pool.query(
      `SELECT tournament_id, game_id, winner, winner_rating, loser, loser_rating, rating_gap
       FROM v_upsets
       ORDER BY game_id DESC
       LIMIT 5`
    );

    // 5. Rating progression for the top 5 players
    const top5Ids = topPlayers.slice(0, 5).map(p => p.player_id);
    let topPlayersProgression = [];

    if (top5Ids.length > 0) {
      const placeholders = top5Ids.map(() => '?').join(', ');
      const [progRows] = await pool.query(
        `SELECT player_id, name, game_id, recorded_at, old_rating, new_rating, rating_change, game_no, moving_avg_5
         FROM v_rating_progression
         WHERE player_id IN (${placeholders})
         ORDER BY player_id ASC, game_no ASC`,
        top5Ids
      );
      topPlayersProgression = progRows;
    }

    return res.json({
      top_players: topPlayers,
      outcome_distribution: outcomeDistribution,
      total_upsets: totalUpsets,
      recent_upsets: recentUpsets,
      rating_progression_top5: topPlayersProgression
    });
  } catch (err) {
    next(err);
  }
};
