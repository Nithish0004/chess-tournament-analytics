import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from db import get_connection
from features import FEATURE_COLUMNS

MODELS_DIR = Path(__file__).resolve().parent / 'models'


def get_player_form_and_experience(cursor, player_id):
    """
    Retrieves current games played and recent 5-game form for a player.
    """
    # Total career games played
    cursor.execute(
        """
        SELECT COUNT(*) AS total_games
        FROM game g
        JOIN result r ON r.game_id = g.game_id
        WHERE g.white_player_id = %s OR g.black_player_id = %s
        """,
        (player_id, player_id)
    )
    total_games = cursor.fetchone()['total_games']
    if total_games == 0:
        return 0, 0.5

    # Recent 5 games average score
    cursor.execute(
        """
        SELECT
            AVG(CASE
                WHEN (g.white_player_id = %s AND r.outcome = 'WHITE')
                  OR (g.black_player_id = %s AND r.outcome = 'BLACK') THEN 1.0
                WHEN r.outcome = 'DRAW' THEN 0.5
                ELSE 0.0
            END) AS recent_form
        FROM (
            SELECT g.game_id, g.white_player_id, g.black_player_id
            FROM game g
            JOIN result r ON r.game_id = g.game_id
            WHERE g.white_player_id = %s OR g.black_player_id = %s
            ORDER BY g.game_id DESC
            LIMIT 5
        ) g
        JOIN result r ON r.game_id = g.game_id
        """,
        (player_id, player_id, player_id, player_id)
    )
    row = cursor.fetchone()
    recent_form = float(row['recent_form']) if row and row['recent_form'] is not None else 0.5
    return total_games, recent_form


def predict():
    print("=== Generating Tournament Winner & Performance Predictions ===")
    model_path = MODELS_DIR / 'best_model.joblib'
    meta_path = MODELS_DIR / 'model_metadata.json'

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}. Please run train.py first.")

    model = joblib.load(model_path)
    model_version = "v1.0_ml_model"
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
            model_version = meta.get('model_version', model_version)[:30]

    classes = list(model.classes_)
    win_idx = classes.index('win')
    draw_idx = classes.index('draw')

    conn = get_connection(autocommit=False)
    cursor = conn.cursor()

    try:
        # 1. Fetch tournaments with status UPCOMING or ONGOING
        cursor.execute(
            """
            SELECT tournament_id, name, status, format
            FROM tournament
            WHERE status IN ('UPCOMING', 'ONGOING')
            ORDER BY tournament_id ASC
            """
        )
        tournaments = cursor.fetchall()

        if not tournaments:
            print("No UPCOMING or ONGOING tournaments found in chess_db.")
            return

        total_predictions_inserted = 0

        for t in tournaments:
            t_id = t['tournament_id']
            t_name = t['name']
            t_status = t['status']

            print(f"\nProcessing Tournament: '{t_name}' (ID: {t_id}, Status: {t_status})")

            # 2. Delete older predictions for this tournament
            cursor.execute("DELETE FROM prediction WHERE tournament_id = %s", (t_id,))
            deleted_count = cursor.rowcount
            if deleted_count > 0:
                print(f"  Cleaned {deleted_count} existing predictions for tournament {t_id}.")

            # 3. Fetch registered players with their current ratings
            cursor.execute(
                """
                SELECT r.player_id, p.name, p.current_rating
                FROM registration r
                JOIN player p ON p.player_id = r.player_id
                WHERE r.tournament_id = %s
                ORDER BY p.current_rating DESC
                """,
                (t_id,)
            )
            registered = cursor.fetchall()

            if len(registered) < 2:
                print(f"  Only {len(registered)} players registered. Minimum 2 required to simulate matchups.")
                continue

            print(f"  Predicting for {len(registered)} registered players against all opponent pairs...")

            # Pre-fetch form and experience for registered players
            player_stats = {}
            for p in registered:
                pid = p['player_id']
                games_count, form = get_player_form_and_experience(cursor, pid)
                player_stats[pid] = {
                    'games_count': games_count,
                    'form': form,
                    'rating': float(p['current_rating'])
                }

            # 4. For each player, simulate matchups against all other players
            # Average expected score against all opponents over both White and Black perspectives
            predictions_to_insert = []

            for p in registered:
                p_id = p['player_id']
                p_name = p['name']
                p_stat = player_stats[p_id]

                matchup_features = []
                for opp in registered:
                    if opp['player_id'] == p_id:
                        continue
                    opp_id = opp['player_id']
                    opp_stat = player_stats[opp_id]

                    # Feature row as White
                    matchup_features.append({
                        'old_rating': p_stat['rating'],
                        'opp_old_rating': opp_stat['rating'],
                        'rating_diff': p_stat['rating'] - opp_stat['rating'],
                        'form_5': p_stat['form'],
                        'games_played_before': p_stat['games_count'],
                        'is_white': 1
                    })
                    # Feature row as Black
                    matchup_features.append({
                        'old_rating': p_stat['rating'],
                        'opp_old_rating': opp_stat['rating'],
                        'rating_diff': p_stat['rating'] - opp_stat['rating'],
                        'form_5': p_stat['form'],
                        'games_played_before': p_stat['games_count'],
                        'is_white': 0
                    })

                X_matchups = pd.DataFrame(matchup_features)[FEATURE_COLUMNS]
                probs = model.predict_proba(X_matchups)
                expected_scores = probs[:, win_idx] + 0.5 * probs[:, draw_idx]

                avg_expected_score = float(np.mean(expected_scores))
                # Bound to valid range and round to 2 decimal places for DECIMAL(4,2)
                predicted_score = round(min(1.0, max(0.0, avg_expected_score)), 2)

                predictions_to_insert.append((p_id, t_id, predicted_score, model_version, p_name, p['current_rating']))

            # 5. Insert into prediction table
            for p_id, tournament_id, score, ver, p_name, rating in predictions_to_insert:
                cursor.execute(
                    """
                    INSERT INTO prediction (player_id, tournament_id, predicted_score, model_version)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (p_id, tournament_id, score, ver)
                )
                total_predictions_inserted += 1

            conn.commit()

            # Display leaderboard preview of predictions
            predictions_to_insert.sort(key=lambda x: x[2], reverse=True)
            print("  Top Predicted Performers:")
            for rank, (_, _, score, _, name, rating) in enumerate(predictions_to_insert[:5], start=1):
                win_pct_est = score * 100
                print(f"    #{rank} {name} ({rating} Elo) -> Predicted Average Score: {score:.2f} (~{win_pct_est:.1f}%)")

        print(f"\nSuccessfully generated and saved {total_predictions_inserted} predictions across active tournaments.")

    except Exception as e:
        conn.rollback()
        print(f"Error during prediction: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    predict()
