import sys
import re
import pandas as pd
import numpy as np
import joblib
import os
import json


def parse_date(date_str):
    """Parse ISO (YYYY-MM-DD) or day-first (DD/MM/YYYY) dates."""
    s = str(date_str).strip()
    dt = pd.to_datetime(s, format='%Y-%m-%d', errors='coerce')
    if pd.isna(dt):
        dt = pd.to_datetime(s, dayfirst=True, errors='coerce')
    return dt


def parse_hour(time_str):
    """Extract hour from HH:MM, H:MM:SS or HH:MM:SS."""
    m = re.search(r'(\d{1,2}):', str(time_str))
    if not m:
        return 12
    h = int(m.group(1))
    return h if 0 <= h <= 23 else 12


def predict():
    try:
        origin = sys.argv[1]
        destination = sys.argv[2]
        date_str = sys.argv[3]
        time_str = sys.argv[4]
        is_holiday = int(sys.argv[5])

        model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        cols_path = os.path.join(os.path.dirname(__file__), 'model_cols.pkl')

        if not os.path.exists(model_path) or not os.path.exists(cols_path):
            print(json.dumps({"predictedRidership": 1})) # Fallback if untrained
            sys.exit(0)

        model = joblib.load(model_path)
        model_cols = joblib.load(cols_path)

        # Feature extraction
        dt = parse_date(date_str)
        day_of_week = int(dt.dayofweek)
        is_weekend = 1 if day_of_week in [5, 6] else 0
        hour = parse_hour(time_str)

        # Build a single row aligned to the training schema in one pass
        row = {col: 0 for col in model_cols}
        row['day_of_week'] = day_of_week
        row['is_weekend'] = is_weekend
        row['hour'] = hour
        row['is_holiday'] = is_holiday

        origin_col = f'orig_{origin}'
        dest_col = f'dest_{destination}'
        if origin_col in row:
            row[origin_col] = 1
        if dest_col in row:
            row[dest_col] = 1

        df_input = pd.DataFrame([row], columns=model_cols)

        pred = model.predict(df_input)[0]
        # Confidence: standard deviation across individual trees (Random Forest)
        try:
            tree_preds = [float(t.predict(df_input)[0]) for t in model.estimators_]
            std = float(np.std(tree_preds)) if tree_preds else 0.0
        except Exception:
            std = 0.0
        final_prediction = max(10, int(round(pred)))
        print(json.dumps({"predictedRidership": final_prediction, "std": round(std, 2)}))
    except Exception as e:
        # Failsafe
        print(json.dumps({"predictedRidership": 1, "error": str(e)}))

if __name__ == "__main__":
    predict()