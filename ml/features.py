import pandas as pd
from db import get_connection

FEATURES_SQL = """
WITH player_game_scores AS (
    SELECT
        rh.history_id,
        rh.game_id,
        rh.player_id,
        IF(g.white_player_id = rh.player_id, g.black_player_id, g.white_player_id) AS opponent_id,
        IF(g.white_player_id = rh.player_id, 1, 0) AS is_white,
        rh.old_rating,
        opp_rh.old_rating AS opp_old_rating,
        (rh.old_rating - opp_rh.old_rating) AS rating_diff,
        CASE
            WHEN (g.white_player_id = rh.player_id AND r.outcome = 'WHITE')
              OR (g.black_player_id = rh.player_id AND r.outcome = 'BLACK') THEN 'win'
            WHEN r.outcome = 'DRAW' THEN 'draw'
            ELSE 'loss'
        END AS target,
        CASE
            WHEN (g.white_player_id = rh.player_id AND r.outcome = 'WHITE')
              OR (g.black_player_id = rh.player_id AND r.outcome = 'BLACK') THEN 1.0
            WHEN r.outcome = 'DRAW' THEN 0.5
            ELSE 0.0
        END AS score,
        rh.recorded_at
    FROM rating_history rh
    JOIN game g ON g.game_id = rh.game_id
    JOIN result r ON r.game_id = rh.game_id
    JOIN rating_history opp_rh ON opp_rh.game_id = rh.game_id AND opp_rh.player_id <> rh.player_id
)
SELECT
    history_id,
    game_id,
    player_id,
    opponent_id,
    is_white,
    old_rating,
    opp_old_rating,
    rating_diff,
    COALESCE(
        COUNT(*) OVER (
            PARTITION BY player_id
            ORDER BY history_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0
    ) AS games_played_before,
    COALESCE(
        AVG(score) OVER (
            PARTITION BY player_id
            ORDER BY history_id
            ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING
        ), 0.5
    ) AS form_5,
    target,
    score,
    recorded_at
FROM player_game_scores
ORDER BY history_id ASC;
"""

FEATURE_COLUMNS = [
    'old_rating',
    'opp_old_rating',
    'rating_diff',
    'form_5',
    'games_played_before',
    'is_white'
]


def extract_features(conn=None):
    """
    Extracts chronological, leakage-free feature table from chess_db.
    One row per (player, game) from that player's perspective.
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True

    try:
        df = pd.read_sql(FEATURES_SQL, conn)
        # Ensure correct datatypes
        df['old_rating'] = df['old_rating'].astype(float)
        df['opp_old_rating'] = df['opp_old_rating'].astype(float)
        df['rating_diff'] = df['rating_diff'].astype(float)
        df['form_5'] = df['form_5'].astype(float)
        df['games_played_before'] = df['games_played_before'].astype(int)
        df['is_white'] = df['is_white'].astype(int)
        df['score'] = df['score'].astype(float)
        return df
    finally:
        if should_close:
            conn.close()


if __name__ == '__main__':
    print("Extracting features from chess_db...")
    df = extract_features()
    print(f"Extracted {len(df)} samples across {df['game_id'].nunique()} unique games.")
    print("\nFeature preview:")
    print(df[['game_id', 'player_id', 'is_white', 'old_rating', 'opp_old_rating', 'rating_diff', 'form_5', 'games_played_before', 'target']].head(10))
    print("\nTarget distribution:")
    print(df['target'].value_counts(normalize=True).round(3))
