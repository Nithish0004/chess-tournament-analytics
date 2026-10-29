import sys
from datetime import datetime
from features import extract_features
from train import train
from predict import predict


def run_pipeline():
    start_time = datetime.now()
    print(f"==================================================")
    print(f"Starting ML Retraining Pipeline at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"==================================================")

    # Step 1: Feature Extraction
    print("\n--- Step 1: Feature Extraction ---")
    df = extract_features()
    print(f"Extracted {len(df)} rows across {df['game_id'].nunique()} finished games.")

    # Step 2: Model Training & Evaluation
    print("\n--- Step 2: Model Training & Evaluation ---")
    meta = train()

    # Step 3: Tournament Outcome Prediction
    print("\n--- Step 3: Generating Tournament Predictions ---")
    predict()

    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n==================================================")
    print(f"Retraining Pipeline Completed Successfully in {elapsed:.2f}s!")
    print(f"Best Model: {meta['best_model_name']} (Brier: {meta['metrics']['brier']:.4f})")
    print(f"==================================================")


if __name__ == '__main__':
    try:
        run_pipeline()
    except Exception as e:
        print(f"\nPipeline execution failed: {e}", file=sys.stderr)
        sys.exit(1)
