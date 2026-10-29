import sqlite3
import pandas as pd
import numpy as np
import json
import joblib
import os
import re
import sys
import glob
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

PROGRESS_PATH = os.path.join(os.path.dirname(__file__), 'train_progress.json')

COLUMNS = ['date', 'time', 'origin', 'destination', 'ridership_count']


def write_progress(percent, message):
    with open(PROGRESS_PATH, 'w') as f:
        json.dump({'progress': percent, 'log': message}, f)


def resolve_csv_paths(args):
    """Accept a directory (globbed for ets_YYYY.csv) and/or explicit CSV files."""
    paths = []
    for a in args:
        if os.path.isdir(a):
            matched = sorted(glob.glob(os.path.join(a, 'ets_[0-9][0-9][0-9][0-9].csv')))
            if not matched:
                matched = sorted(glob.glob(os.path.join(a, '*.csv')))
            paths.extend(matched)
        elif os.path.isfile(a):
            paths.append(a)

    # De-duplicate while preserving order
    seen = set()
    unique = []
    for p in paths:
        key = os.path.abspath(p)
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def parse_dates(series):
    """Parse ISO (YYYY-MM-DD) and day-first (DD/MM/YYYY) dates into a datetime series."""
    s = series.astype(str).str.strip()
    out = pd.to_datetime(s, format='%Y-%m-%d', errors='coerce')
    mask = out.isna()
    if mask.any():
        fallback = pd.to_datetime(s[mask], dayfirst=True, errors='coerce')
        out.loc[mask] = fallback
    return out


def parse_hours(series):
    """Extract the hour from HH:MM, H:MM:SS or HH:MM:SS strings. Defaults to 12."""
    def hour_from(value):
        m = re.search(r'(\d{1,2}):', str(value))
        if not m:
            return 12
        h = int(m.group(1))
        return h if 0 <= h <= 23 else 12
    return series.map(hour_from).astype(int)


def train_model():
    start_time = pd.Timestamp.now()

    csv_paths = resolve_csv_paths(sys.argv[1:])

    if not csv_paths:
        print(json.dumps({"error": "No CSV dataset file(s) found."}))
        sys.exit(1)

    write_progress(5, f"Loading {len(csv_paths)} dataset file(s)...")

    frames = []
    for p in csv_paths:
        part = pd.read_csv(p, header=0, names=COLUMNS)
        frames.append(part)

    df = pd.concat(frames, ignore_index=True)
    df = df.drop_duplicates().reset_index(drop=True)

    total_records = len(df)
    if total_records == 0:
        print(json.dumps({"error": "Dataset is empty."}))
        sys.exit(1)

    write_progress(10, f"Loaded {total_records} records from {len(csv_paths)} file(s).")

    df_train = df.copy()

    db_path = os.path.join(os.path.dirname(__file__), '..', 'ets_system.db')
    holiday_dates = set()
    try:
        conn = sqlite3.connect(db_path)
        holidays_df = pd.read_sql_query("SELECT date FROM Holidays", conn)
        holiday_dates = set(holidays_df['date'].tolist())
        conn.close()
    except Exception:
        pass

    write_progress(20, "Engineering features...")

    parsed_dates = parse_dates(df_train['date'])
    df_train['day_of_week'] = parsed_dates.dt.dayofweek
    df_train['is_weekend'] = df_train['day_of_week'].isin([5, 6]).astype(int)
    df_train['hour'] = parse_hours(df_train['time'])
    df_train['is_holiday'] = parsed_dates.dt.strftime('%Y-%m-%d').isin(holiday_dates).astype(int)

    df_train['origin'] = df_train['origin'].astype(str).str.strip()
    df_train['destination'] = df_train['destination'].astype(str).str.strip()

    features = ['day_of_week', 'is_weekend', 'hour', 'is_holiday']
    X = df_train[features].copy()
    X_origin = pd.get_dummies(df_train['origin'], prefix='orig')
    X_dest = pd.get_dummies(df_train['destination'], prefix='dest')
    X = pd.concat([X, X_origin, X_dest], axis=1)
    y = df_train['ridership_count']

    # Drop rows with an unusable target or missing core features
    valid = parsed_dates.notna() & y.notna()
    X = X[valid]
    y = y[valid]
    df_train = df_train[valid]

    # Time-aware ordering: sort by date so the test set is the most recent 20%
    order = parsed_dates[valid].argsort().values
    X = X.iloc[order].reset_index(drop=True)
    y = y.iloc[order].reset_index(drop=True)
    df_train = df_train.iloc[order].reset_index(drop=True)

    write_progress(30, f"Feature matrix: {X.shape[0]} x {X.shape[1]}. Splitting...")

    split_idx = int(len(X) * 0.8)
    X_train = X.iloc[:split_idx]
    X_test = X.iloc[split_idx:]
    y_train = y.iloc[:split_idx]
    y_test = y.iloc[split_idx:]

    write_progress(50, "Training Random Forest...")
    model = RandomForestRegressor(n_estimators=20, n_jobs=-1, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))

    write_progress(90, "Saving model...")

    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    cols_path = os.path.join(os.path.dirname(__file__), 'model_cols.pkl')
    joblib.dump(model, model_path)
    joblib.dump(list(X.columns), cols_path)

    files_label = f"{len(csv_paths)} CSV file(s)"
    notes = f"Random Forest trained on {len(df_train)} records from {files_label} (time-aware 80:20 split)."
    end_time = pd.Timestamp.now()
    processing_time_sec = (end_time - start_time).total_seconds()

    metrics = {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 2),
        "trainedAt": pd.Timestamp.now().isoformat(),
        "totalRecords": total_records,
        "processingTime": round(processing_time_sec, 2),
        "notes": notes
    }

    meta_path = os.path.join(os.path.dirname(__file__), '..', 'model_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metrics, f)

    write_progress(100, "Training complete.")
    print(json.dumps(metrics), flush=True)


if __name__ == "__main__":
    train_model()
