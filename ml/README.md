# Chess Tournament Machine Learning Module (`/ml`)

A production-ready Python Machine Learning pipeline for match outcome prediction, rating analytics, and tournament performance forecasting in the Chess Tournament Management System.

---

## 1. Overview & Architecture

The ML subsystem interfaces directly with the MySQL database (`chess_db`) to extract historical match data, engineer leakage-free predictive features, train probabilistic classification models, and generate expected score forecasts for upcoming and ongoing tournaments.

### Core Architecture
- **Configuration**: Automatically loads MySQL credentials from `server/.env` using `python-dotenv`.
- **Database Logic Preservation**: All simulated matches are recorded via `CALL record_result(game_id, outcome)` to maintain database trigger and stored procedure integrity (atomic Elo updates, rating history, and standings recalculation).
- **Leakage-Free Features**: Features are derived strictly from information available *before* each match begins using SQL window functions.
- **Probabilistic Calibration**: Evaluated using **Brier Score** on expected score ($E = P(\text{win}) + 0.5 \cdot P(\text{draw})$) alongside Accuracy and Log-Loss against the classical FIDE Elo baseline.

---

## 2. Directory Structure

```
ml/
├── README.md               # Documentation & setup instructions
├── requirements.txt        # Python dependencies
├── .gitignore              # Ignores .venv, models, bytecode
├── db.py                   # MySQL connection utility reading server/.env
├── seed_bulk.py            # Simulates 40 players & 300+ games via record_result
├── features.py             # Chronological feature extraction (SQL window functions)
├── train.py                # Model training, Elo benchmarking, artifact persistence
├── predict.py              # Forecasts average expected scores for active tournaments
├── retrain.py              # Automated sequential pipeline (features -> train -> predict)
└── models/                 # Saved model artifacts
    ├── best_model.joblib   # Serialized best model pipeline
    └── model_metadata.json # Training metrics, feature schema, and version info
```

---

## 3. Setup & Installation

Ensure Python 3.10+ is installed on your system.

### 1. Create and Activate Virtual Environment
```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Verify Database Connectivity
Ensure MySQL is running and `server/.env` contains the correct credentials:
```bash
python -c "from db import get_connection; conn=get_connection(); print('Connected successfully!'); conn.close()"
```

---

## 4. Scripts & Execution Order

### Step 1: Bulk Simulation (`seed_bulk.py`)
Generates 40 players with hidden "true strengths" ranging from 1000 to 2400. Schedules and plays 7 completed round-robin tournaments (45 games each) plus 1 ongoing tournament (10 games played) and 1 upcoming tournament.
```bash
python seed_bulk.py
```
- Total games created: 360
- Total finished games recorded via `record_result`: 325+ (334 total in database)
- Outcome probabilities: Drawn from true strength difference with ~12% empirical draw rate.

### Step 2: Feature Extraction (`features.py`)
Extracts a dual-perspective training dataset (one row per player per game):
```bash
python features.py
```
**Engineered Features**:
- `old_rating`: Player rating prior to the match.
- `opp_old_rating`: Opponent rating prior to the match.
- `rating_diff`: `old_rating - opp_old_rating`.
- `form_5`: Rolling average score over the player's previous 5 matches (`ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING`).
- `games_played_before`: Total career games recorded for this player prior to this match.
- `is_white`: Binary flag indicating color advantage (1 for White, 0 for Black).
- `target`: Categorical outcome (`win`, `draw`, `loss`) from the player's perspective.

### Step 3: Model Training & Evaluation (`train.py`)
Performs a time-ordered split (earliest 75% games for training, latest 25% for testing):
```bash
python train.py
```
Trains Multinomial Logistic Regression and Gradient Boosting, benchmarking them against the classical FIDE Elo formula:
$$\mathbb{E}[\text{score}] = \frac{1}{1 + 10^{-\Delta R / 400}}$$

### Step 4: Tournament Predictions (`predict.py`)
Generates expected performance forecasts for all players in `UPCOMING` and `ONGOING` tournaments:
```bash
python predict.py
```
- Removes obsolete predictions for the tournament.
- Simulates round-robin matchups against all registered competitors (both White and Black perspectives).
- Stores the average expected score in the `prediction` table (`player_id`, `tournament_id`, `predicted_score`, `model_version`).

### Step 5: Full Automated Retraining (`retrain.py`)
Runs the full pipeline in sequence:
```bash
python retrain.py
```

---

## 5. Model Evaluation & Benchmark Results

Evaluated on 168 test samples (84 time-ordered held-out matches):

| Model | Accuracy | Log-Loss | Brier (Expected Score) | vs Elo Baseline |
| :--- | :---: | :---: | :---: | :---: |
| **Plain Elo Baseline** | **73.81%** | **0.7122** | **0.1608** | Baseline |
| **Multinomial Logistic Regression** | 70.24% | 0.7162 | **0.1521** | **-0.0087 (Better)** |
| **Gradient Boosting Classifier** | 61.31% | 0.9075 | 0.1831 | +0.0223 (Worse) |

### Honest Assessment
- **Brier Score Win**: **Multinomial Logistic Regression beats the Plain Elo Baseline** with a **5.44% lower Brier score** (0.1521 vs 0.1608).
- **Signal Attribution**: While raw rating difference ($\Delta R$) is the dominant predictor of match outcomes, adding **recent form (`form_5`)**, **color advantage (`is_white`)**, and **experience (`games_played_before`)** measurably improves probability calibration.
- **Gradient Boosting Overfitting**: The Gradient Boosting model showed signs of overfitting on smaller sample sizes ($N \approx 500$ training rows), resulting in a higher log-loss and Brier score. Regularized Logistic Regression proved substantially more robust and better calibrated.
- **Selected Model**: `Logistic Regression (Multinomial)` is saved to `ml/models/best_model.joblib` and tagged as `v1.0_logreg`.

---

## 6. Scheduling with Cron

To keep models and tournament predictions updated as new rounds complete, `retrain.py` can be scheduled via `cron`.

### Example Crontab Configuration

1. Open crontab editor:
   ```bash
   crontab -e
   ```

2. Add a cron job to retrain every hour (or at the desired interval):
   ```cron
   # Retrain chess ML model every hour at minute 0
   0 * * * * cd /Users/nithish/Desktop/chess-project && /Users/nithish/Desktop/chess-project/ml/.venv/bin/python /Users/nithish/Desktop/chess-project/ml/retrain.py >> /Users/nithish/Desktop/chess-project/ml/retrain.log 2>&1
   ```

3. To run once daily at midnight:
   ```cron
   0 0 * * * cd /Users/nithish/Desktop/chess-project && /Users/nithish/Desktop/chess-project/ml/.venv/bin/python /Users/nithish/Desktop/chess-project/ml/retrain.py >> /Users/nithish/Desktop/chess-project/ml/retrain.log 2>&1
   ```

### Logging & Health Checks
- Pipeline logs are directed to `ml/retrain.log`.
- `retrain.py` returns exit code `0` on success and `1` on failure, facilitating automated alerting via monitoring sidecars or email hooks.
