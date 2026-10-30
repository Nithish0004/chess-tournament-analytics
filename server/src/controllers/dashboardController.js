import { pool } from '../config/db.js';

export const getDashboardData = async (req, res, next) => {
  try {
    // 1. Total players
    const [totalPlayersRows] = await pool.query('SELECT COUNT(*) AS total FROM player');
    const totalPlayers = Number(totalPlayersRows[0]?.total || 0);

    // 2. Active tournaments split (ongoing vs upcoming)
    const [tournamentStatusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM tournament
       WHERE status IN ('ONGOING', 'UPCOMING')
       GROUP BY status`
    );
    const activeTournaments = {
      ongoing: 0,
      upcoming: 0
    };
    for (const row of tournamentStatusRows) {
      if (row.status === 'ONGOING') activeTournaments.ongoing = Number(row.count);
      if (row.status === 'UPCOMING') activeTournaments.upcoming = Number(row.count);
    }

    // Active tournaments list for dashboard preview
    const [activeTournamentsList] = await pool.query(
      `SELECT t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status,
              COUNT(DISTINCT r.player_id) AS player_count,
              COUNT(DISTINCT tr.round_id) AS rounds_count
       FROM tournament t
       LEFT JOIN registration r ON r.tournament_id = t.tournament_id
       LEFT JOIN tournament_round tr ON tr.tournament_id = t.tournament_id
       WHERE t.status IN ('ONGOING', 'UPCOMING')
       GROUP BY t.tournament_id, t.name, t.format, t.start_date, t.end_date, t.status
       ORDER BY (t.status = 'ONGOING') DESC, t.start_date ASC
       LIMIT 6`
    );

    // 3. Top 10 by rating joined with performance (wins, draws, losses, avg_opponent_rating)
    const [topPlayersRaw] = await pool.query(
      `SELECT p.player_id, p.name, p.country, p.date_of_birth, p.current_rating, p.created_at,
              COALESCE(vp.wins, 0) AS wins,
              COALESCE(vp.draws, 0) AS draws,
              COALESCE(vp.losses, 0) AS losses,
              COALESCE(vp.avg_opponent_rating, 0) AS avg_opponent_rating,
              COALESCE(vp.games_played, 0) AS games_played,
              (COALESCE(vp.wins, 0) * 1.0 + COALESCE(vp.draws, 0) * 0.5) AS points
       FROM player p
       LEFT JOIN v_player_performance vp ON vp.player_id = p.player_id
       ORDER BY p.current_rating DESC, p.player_id ASC
       LIMIT 10`
    );

    const topPlayers = topPlayersRaw.map(p => ({
      ...p,
      current_rating: Number(p.current_rating),
      wins: Number(p.wins),
      draws: Number(p.draws),
      losses: Number(p.losses),
      avg_opponent_rating: Number(p.avg_opponent_rating),
      games_played: Number(p.games_played),
      points: Number(p.points)
    }));

    // 4. Outcome distribution
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

    const whiteWinPct = outcomeDistribution.total > 0
      ? Math.round((outcomeDistribution.WHITE / outcomeDistribution.total) * 1000) / 10
      : 0;
    const drawPct = outcomeDistribution.total > 0
      ? Math.round((outcomeDistribution.DRAW / outcomeDistribution.total) * 1000) / 10
      : 0;

    // 5. Total upsets
    const [upsetCountRows] = await pool.query(
      'SELECT COUNT(*) AS total_upsets FROM v_upsets'
    );
    const totalUpsets = Number(upsetCountRows[0]?.total_upsets || 0);

    // 6. Recent upsets (latest 5)
    const [recentUpsets] = await pool.query(
      `SELECT tournament_id, game_id, winner, winner_rating, loser, loser_rating, rating_gap
       FROM v_upsets
       ORDER BY game_id DESC
       LIMIT 5`
    );

    // 7. Recent matches (last 5 finished games)
    const [recentMatchesRaw] = await pool.query(
      `SELECT g.game_id, tr.round_no, g.board_no,
              pw.player_id AS white_player_id, pw.name AS white_player, pw.country AS white_country,
              pb.player_id AS black_player_id, pb.name AS black_player, pb.country AS black_country,
              COALESCE(rw.old_rating, pw.current_rating) AS white_rating,
              COALESCE(rb.old_rating, pb.current_rating) AS black_rating,
              r.outcome, g.status
       FROM game g
       JOIN tournament_round tr ON tr.round_id = g.round_id
       JOIN result r ON r.game_id = g.game_id
       JOIN player pw ON pw.player_id = g.white_player_id
       JOIN player pb ON pb.player_id = g.black_player_id
       LEFT JOIN rating_history rw ON rw.game_id = g.game_id AND rw.player_id = g.white_player_id
       LEFT JOIN rating_history rb ON rb.game_id = g.game_id AND rb.player_id = g.black_player_id
       WHERE g.status = 'FINISHED'
       ORDER BY g.game_id DESC
       LIMIT 5`
    );

    const recentMatches = recentMatchesRaw.map(m => ({
      game_id: m.game_id,
      round_no: Number(m.round_no),
      board_no: Number(m.board_no),
      white_player_id: m.white_player_id,
      white_player: m.white_player,
      white_country: m.white_country,
      black_player_id: m.black_player_id,
      black_player: m.black_player,
      black_country: m.black_country,
      white_rating: Number(m.white_rating),
      black_rating: Number(m.black_rating),
      outcome: m.outcome,
      status: m.status
    }));

    // 8. Most improved player
    const [mostImprovedRows] = await pool.query(
      `SELECT name, net_rating_change
       FROM v_player_performance
       ORDER BY net_rating_change DESC, player_id ASC
       LIMIT 1`
    );
    const mostImproved = mostImprovedRows[0]
      ? {
          name: mostImprovedRows[0].name,
          net_rating_change: Number(mostImprovedRows[0].net_rating_change || 0)
        }
      : {
          name: 'N/A',
          net_rating_change: 0
        };

    // 9. Rating progression for the top 5 players
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
      total_players: totalPlayers,
      active_tournaments: activeTournaments,
      active_tournaments_list: activeTournamentsList.map(t => ({
        ...t,
        player_count: Number(t.player_count),
        rounds_count: Number(t.rounds_count)
      })),
      recent_matches: recentMatches,
      top_players: topPlayers,
      white_win_pct: whiteWinPct,
      draw_pct: drawPct,
      most_improved: mostImproved,
      outcome_distribution: outcomeDistribution,
      total_upsets: totalUpsets,
      recent_upsets: recentUpsets,
      rating_progression_top5: topPlayersProgression
    });
  } catch (err) {
    next(err);
  }
};
