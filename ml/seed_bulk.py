import random
import numpy as np
from datetime import date, timedelta
from db import get_connection

# Fixed random seed for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

FIRST_NAMES = [
  "Aarav", "Elena", "Viktor", "Mateo", "Siddharth", "Zoe", "Dmitry", "Chloe",
  "Lucas", "Amina", "Kenji", "Fatima", "Gabriel", "Lars", "Sofia", "Marcus",
  "Ananya", "Nikolai", "Liam", "Mei", "Hugo", "Nadia", "Carlos", "Sora",
  "Dev", "Freja", "Tariq", "Ingrid", "Pavel", "Yuki", "Kavya", "Leo",
  "Astrid", "Milan", "Maya", "Stefan", "Zara", "Johan", "Mira", "Alexei"
]

LAST_NAMES = [
  "Ivanov", "Sharma", "Petrov", "Muller", "Dubois", "Nakamura", "Al-Mansoor",
  "Larsson", "Garcia", "Tanaka", "Schneider", "Kowalski", "Santos", "Fischer",
  "Verhoeven", "Popov", "Lindqvist", "Patel", "Rossi", "Borges"
]

COUNTRIES = [
  "Norway", "India", "USA", "Uzbekistan", "France", "China", "Germany",
  "Netherlands", "Spain", "Poland", "Sweden", "Armenia", "Japan", "Brazil"
]


def generate_round_robin_schedule(player_ids):
    """
    Standard round-robin circle algorithm.
    Returns list of rounds, where each round is a list of (white_player_id, black_player_id).
    """
    n = len(player_ids)
    players = list(player_ids)
    if n % 2 != 0:
        players.append(None)
        n += 1

    schedule = []
    num_rounds = n - 1
    half = n // 2

    for r in range(num_rounds):
        round_pairings = []
        for i in range(half):
            p1 = players[i]
            p2 = players[n - 1 - i]
            if p1 is not None and p2 is not None:
                # Alternate colors based on round to balance white/black
                if (r + i) % 2 == 0:
                    round_pairings.append((p1, p2))
                else:
                    round_pairings.append((p2, p1))
        schedule.append(round_pairings)
        # Rotate players, keeping player[0] fixed
        players = [players[0]] + [players[-1]] + players[1:-1]

    return schedule


def simulate_game_outcome(white_true_strength, black_true_strength):
    """
    Simulates outcome based on true hidden Elo strength.
    Expected score Ew = 1 / (1 + 10^((Sb - Sw)/400)).
    Draw probability ~12% (10-15%).
    """
    diff = black_true_strength - white_true_strength
    ew = 1.0 / (1.0 + 10.0 ** (diff / 400.0))

    # Base draw probability ~12%, slightly higher when players are evenly matched
    p_draw = 0.12 * (1.0 - abs(ew - 0.5)) + 0.06
    p_draw = min(0.15, max(0.10, p_draw))

    p_remaining = 1.0 - p_draw
    p_white = p_remaining * ew
    p_black = p_remaining * (1.0 - ew)

    # Normalize just in case of float rounding
    total = p_white + p_draw + p_black
    p_white /= total
    p_draw /= total
    p_black /= total

    return np.random.choice(['WHITE', 'DRAW', 'BLACK'], p=[p_white, p_draw, p_black])


def run():
    print("=== Bulk Simulation Seeder ===")
    conn = get_connection(autocommit=False)
    cursor = conn.cursor()

    try:
        # 1. Ensure 40 players with hidden true strength (1000 - 2400)
        strengths = np.linspace(1020, 2380, 40)
        np.random.shuffle(strengths)

        cursor.execute("SELECT player_id, name, email FROM player WHERE email LIKE 'bulk_%' ORDER BY player_id ASC")
        existing_bulk = cursor.fetchall()

        created_players = []

        if len(existing_bulk) >= 40:
            print(f"Reusing {len(existing_bulk[:40])} existing bulk players from database...")
            for i, p in enumerate(existing_bulk[:40]):
                created_players.append({
                    'player_id': p['player_id'],
                    'name': p['name'],
                    'true_strength': float(strengths[i])
                })
        else:
            print("Generating 40 players with hidden true strength (1000 - 2400)...")
            base_timestamp = date(1985, 1, 1)

            for i in range(40):
                fn = FIRST_NAMES[i % len(FIRST_NAMES)]
                ln = LAST_NAMES[(i * 3 + 7) % len(LAST_NAMES)]
                full_name = f"{fn} {ln}"
                email = f"bulk_{i+1}_{fn.lower()}.{ln.lower()}@chessbulk.org"
                country = COUNTRIES[i % len(COUNTRIES)]
                dob = base_timestamp + timedelta(days=int(i * 180 + np.random.randint(0, 100)))
                true_strength = float(strengths[i])
                initial_rating = 1200  # Default official starting rating

                # Plain INSERT into player
                cursor.execute(
                    """
                    INSERT INTO player (name, email, country, date_of_birth, current_rating)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (full_name, email, country, dob, initial_rating)
                )
                player_id = cursor.lastrowid
                created_players.append({
                    'player_id': player_id,
                    'name': full_name,
                    'true_strength': true_strength
                })

            conn.commit()

        print(f"Configured 40 players (IDs {created_players[0]['player_id']} to {created_players[-1]['player_id']}).")

        # 2. Tournaments to create:
        # 7 completed round-robin tournaments of 10 players each (7 x 45 = 315 finished games)
        # 1 ongoing tournament (10 players, 2 rounds played = 10 games, 7 rounds scheduled)
        # 1 upcoming tournament (10 players registered, 0 games played yet)
        # Total games recorded via CALL record_result = 325 games (meets requirement of 300+ games)
        tournament_configs = [
            {"name": "Grand Prix Invitational 2026", "type": "COMPLETED", "rounds_to_play": 9},
            {"name": "Continental Masters Open 2026", "type": "COMPLETED", "rounds_to_play": 9},
            {"name": "Nordic Classical Championship 2026", "type": "COMPLETED", "rounds_to_play": 9},
            {"name": "Pacific Rim Swiss League 2026", "type": "COMPLETED", "rounds_to_play": 9},
            {"name": "Iberian Autumn Trophy 2026", "type": "COMPLETED", "rounds_to_play": 9},
            {"name": "Danube Rapid & Classical 2026", "type": "COMPLETED", "rounds_to_play": 9},
            {"name": "Challengers Super League 2026", "type": "COMPLETED", "rounds_to_play": 9},
            {"name": "Masters Crown Cup 2026", "type": "ONGOING", "rounds_to_play": 2},
            {"name": "Future Stars Invitational 2026", "type": "UPCOMING", "rounds_to_play": 0}
        ]

        total_games_created = 0
        total_results_recorded = 0

        player_dict = {p['player_id']: p for p in created_players}
        all_pids = [p['player_id'] for p in created_players]

        start_base_date = date(2025, 1, 1)

        for t_idx, t_cfg in enumerate(tournament_configs):
            t_name = t_cfg["name"]
            target_status = t_cfg["type"]
            rounds_to_play = t_cfg["rounds_to_play"]

            # Check if tournament with this name already exists
            cursor.execute("SELECT tournament_id, status FROM tournament WHERE name = %s", (t_name,))
            existing_t = cursor.fetchone()
            if existing_t:
                print(f"Tournament '{t_name}' already exists (ID: {existing_t['tournament_id']}), skipping creation.")
                continue

            t_start = start_base_date + timedelta(days=t_idx * 40)
            t_end = t_start + timedelta(days=14)

            # Important: Always create as ONGOING or UPCOMING so registrations are permitted by trg_registration_bi
            initial_status = 'UPCOMING' if target_status == 'UPCOMING' else 'ONGOING'

            cursor.execute(
                """
                INSERT INTO tournament (name, format, start_date, end_date, status)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (t_name, 'ROUND_ROBIN', t_start, t_end, initial_status)
            )
            tournament_id = cursor.lastrowid

            # Select 10 players for this tournament
            selected_pids = np.random.choice(all_pids, size=10, replace=False).tolist()

            # Register players (plain INSERT into registration)
            for pid in selected_pids:
                cursor.execute(
                    "INSERT INTO registration (tournament_id, player_id) VALUES (%s, %s)",
                    (tournament_id, pid)
                )
            conn.commit()

            if rounds_to_play == 0:
                print(f"Tournament {t_idx+1}: '{t_name}' (ID: {tournament_id}) created as UPCOMING with 10 registrations.")
                continue

            # Generate Round-Robin schedule (9 rounds, 5 games each)
            schedule = generate_round_robin_schedule(selected_pids)

            for round_no, pairings in enumerate(schedule, start=1):
                cursor.execute(
                    "INSERT INTO tournament_round (tournament_id, round_no, status) VALUES (%s, %s, %s)",
                    (tournament_id, round_no, 'SCHEDULED')
                )
                round_id = cursor.lastrowid

                round_game_ids = []
                for board_no, (w_id, b_id) in enumerate(pairings, start=1):
                    cursor.execute(
                        """
                        INSERT INTO game (round_id, board_no, white_player_id, black_player_id, status)
                        VALUES (%s, %s, %s, %s, 'SCHEDULED')
                        """,
                        (round_id, board_no, w_id, b_id)
                    )
                    game_id = cursor.lastrowid
                    round_game_ids.append((game_id, w_id, b_id))
                    total_games_created += 1

                conn.commit()

                # If this round should be played, record results via CALL record_result(game_id, outcome)
                if round_no <= rounds_to_play:
                    for game_id, w_id, b_id in round_game_ids:
                        w_strength = player_dict[w_id]['true_strength']
                        b_strength = player_dict[b_id]['true_strength']
                        outcome = simulate_game_outcome(w_strength, b_strength)

                        cursor.execute("CALL record_result(%s, %s)", (game_id, outcome))
                        conn.commit()
                        total_results_recorded += 1

            # If the tournament is finished, update status to COMPLETED
            if target_status == 'COMPLETED':
                cursor.execute(
                    "UPDATE tournament SET status = 'COMPLETED' WHERE tournament_id = %s",
                    (tournament_id,)
                )
                conn.commit()
                print(f"Tournament {t_idx+1}: '{t_name}' (ID: {tournament_id}, COMPLETED) played and recorded 45 games.")
            else:
                print(f"Tournament {t_idx+1}: '{t_name}' (ID: {tournament_id}, ONGOING) played {rounds_to_play * 5} games.")

        print("\n=== Bulk Seeding Complete ===")
        print(f"Bulk players: {len(created_players)}")
        print(f"New games created: {total_games_created}")
        print(f"New games recorded via record_result: {total_results_recorded}")
        cursor.execute("SELECT COUNT(*) AS total FROM game WHERE status = 'FINISHED'")
        finished_cnt = cursor.fetchone()['total']
        print(f"Total finished games in chess_db: {finished_cnt}")

    except Exception as e:
        conn.rollback()
        print(f"Error during bulk seeding: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    run()
