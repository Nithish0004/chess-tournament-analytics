import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
from tabulate import tabulate
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, log_loss, mean_squared_error

from features import extract_features, FEATURE_COLUMNS

MODELS_DIR = Path(__file__).resolve().parent / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def calculate_expected_score(probs, classes):
    """
    Computes expected score: P(win) + 0.5 * P(draw).
    """
    class_list = list(classes)
    win_idx = class_list.index('win')
    draw_idx = class_list.index('draw')

    p_win = probs[:, win_idx]
    p_draw = probs[:, draw_idx]
    return p_win + 0.5 * p_draw


def evaluate_model(name, model, X_test, y_test, actual_scores):
    """
    Evaluates classifier on accuracy, log-loss, and Brier score of expected score.
    """
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)

    acc = accuracy_score(y_test, preds)
    loss = log_loss(y_test, probs, labels=model.classes_)
    expected_scores = calculate_expected_score(probs, model.classes_)
    brier = mean_squared_error(actual_scores, expected_scores)

    return {
        'name': name,
        'model': model,
        'accuracy': acc,
        'log_loss': loss,
        'brier': brier,
        'probs': probs,
        'expected_scores': expected_scores
    }


def evaluate_elo_baseline(test_df):
    """
    Evaluates the standard FIDE Elo expected score baseline.
    Ew = 1 / (1 + 10^(-rating_diff / 400))
    """
    rating_diff = test_df['rating_diff'].values
    actual_scores = test_df['score'].values
    y_test = test_df['target'].values

    # Classical Elo expected score
    elo_expected = 1.0 / (1.0 + 10.0 ** (-rating_diff / 400.0))
    brier = mean_squared_error(actual_scores, elo_expected)

    # Convert Elo expected score to win/draw/loss probabilities using empirical draw rate
    p_draw = 0.12
    p_win = (1.0 - p_draw) * elo_expected
    p_loss = (1.0 - p_draw) * (1.0 - elo_expected)

    classes = ['draw', 'loss', 'win']
    p_draw_arr = np.full_like(p_win, p_draw)
    probs = np.column_stack([p_draw_arr, p_loss, p_win])
    probs = probs / probs.sum(axis=1, keepdims=True)

    preds = []
    for pw, pd_val, pl in zip(p_win, [p_draw]*len(p_win), p_loss):
        if pw >= pd_val and pw >= pl:
            preds.append('win')
        elif pl >= pd_val and pl >= pw:
            preds.append('loss')
        else:
            preds.append('draw')

    acc = accuracy_score(y_test, preds)
    loss = log_loss(y_test, probs, labels=classes)

    return {
        'name': 'Plain Elo Baseline',
        'accuracy': acc,
        'log_loss': loss,
        'brier': brier,
        'expected_scores': elo_expected
    }


def train():
    print("=== Training ML Chess Match Outcome Models ===")
    df = extract_features()

    total_samples = len(df)
    unique_games = df.groupby('game_id')['history_id'].min().sort_values().index.tolist()
    total_games = len(unique_games)

    print(f"Total dataset: {total_samples} perspective rows across {total_games} unique games.")

    if total_games < 10:
        raise ValueError("Insufficient games to train (minimum 10 required). Run seed_bulk.py first.")

    # Time-ordered split: earliest 75% games for training, latest 25% for test
    split_point = int(np.floor(0.75 * total_games))
    train_game_ids = set(unique_games[:split_point])
    test_game_ids = set(unique_games[split_point:])

    train_df = df[df['game_id'].isin(train_game_ids)].copy()
    test_df = df[df['game_id'].isin(test_game_ids)].copy()

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df['target']

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df['target']
    actual_test_scores = test_df['score'].values

    print(f"Train set: {len(train_df)} rows ({len(train_game_ids)} games, 75%)")
    print(f"Test set:  {len(test_df)} rows ({len(test_game_ids)} games, 25%)\n")

    # 1. Elo Baseline
    elo_res = evaluate_elo_baseline(test_df)

    # 2. Multinomial Logistic Regression with feature scaling
    print("Training Multinomial Logistic Regression...")
    lr_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(
            solver='lbfgs',
            max_iter=1000,
            C=1.0,
            random_state=42
        ))
    ])
    lr_pipeline.fit(X_train, y_train)
    lr_res = evaluate_model('Logistic Regression (Multinomial)', lr_pipeline, X_test, y_test, actual_test_scores)

    # 3. Gradient Boosting Classifier
    print("Training Gradient Boosting Classifier...")
    gb_clf = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=3,
        subsample=0.9,
        random_state=42
    )
    gb_clf.fit(X_train, y_train)
    gb_res = evaluate_model('Gradient Boosting', gb_clf, X_test, y_test, actual_test_scores)

    # Results Comparison Table
    results = [elo_res, lr_res, gb_res]

    table_data = []
    base_brier = elo_res['brier']
    for r in results:
        brier_diff = r['brier'] - base_brier
        diff_str = "Baseline" if r['name'] == 'Plain Elo Baseline' else f"{brier_diff:+.4f} ({('Better' if brier_diff < 0 else 'Worse')})"
        table_data.append([
            r['name'],
            f"{r['accuracy']:.4f} ({r['accuracy']*100:.1f}%)",
            f"{r['log_loss']:.4f}",
            f"{r['brier']:.4f}",
            diff_str
        ])

    headers = ["Model", "Accuracy", "Log-Loss", "Brier (Expected Score)", "vs Elo Baseline"]
    print("\n" + tabulate(table_data, headers=headers, tablefmt="grid"))

    # Honest assessment reporting
    ml_models = [lr_res, gb_res]
    best_ml = min(ml_models, key=lambda m: m['brier'])

    print("\n=== Performance vs Elo Baseline Assessment ===")
    if best_ml['brier'] < elo_res['brier']:
        improvement = (elo_res['brier'] - best_ml['brier']) / elo_res['brier'] * 100.0
        print(f"SUCCESS: {best_ml['name']} beats the plain Elo baseline with {improvement:.2f}% lower Brier score!")
        print(f"Additional signals (form, color/white advantage, experience) provide measurable predictive gain.")
    else:
        diff_pct = (best_ml['brier'] - elo_res['brier']) / elo_res['brier'] * 100.0
        print(f"HONEST REPORT: {best_ml['name']} did not beat the pure Elo baseline (Brier is {diff_pct:+.2f}% higher).")
        print(f"Elo rating difference is the dominant predictor; small sample or draw noise limits ML feature gains.")

    # Save best overall ML model
    model_save_path = MODELS_DIR / 'best_model.joblib'
    joblib.dump(best_ml['model'], model_save_path)
    print(f"\nSaved best model ({best_ml['name']}) to {model_save_path}")

    # Save metadata (model_version must fit in VARCHAR(30))
    short_slug = "gradboost" if "gradient" in best_ml['name'].lower() else "logreg"
    meta = {
        'best_model_name': best_ml['name'],
        'model_version': f"v1.0_{short_slug}",
        'classes': list(best_ml['model'].classes_),
        'feature_columns': FEATURE_COLUMNS,
        'metrics': {
            'accuracy': float(best_ml['accuracy']),
            'log_loss': float(best_ml['log_loss']),
            'brier': float(best_ml['brier']),
            'elo_baseline_brier': float(elo_res['brier'])
        },
        'train_samples': len(train_df),
        'test_samples': len(test_df),
        'total_games': total_games
    }

    meta_save_path = MODELS_DIR / 'model_metadata.json'
    with open(meta_save_path, 'w') as f:
        json.dump(meta, f, indent=2)

    return meta


if __name__ == '__main__':
    train()
