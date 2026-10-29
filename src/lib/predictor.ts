import { getDB } from '../db/sqlite.ts';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface ModelMetrics {
  mae: number;
  rmse: number;
  r2: number;
  trainedAt: string;
  totalRecords: number;
  notes: string;
  processingTime?: number;
}

const METADATA_PATH = path.resolve(process.cwd(), 'model_metadata.json');

// Default starting metrics if no training has occurred
const defaultMetrics: ModelMetrics = {
  mae: 0,
  rmse: 0,
  r2: 0,
  trainedAt: new Date().toISOString(),
  totalRecords: 0,
  notes: "Awaiting Python ML Pipeline execution. Please click Retrain to generate pickled model."
};

// Training state tracking for async background training
export const trainingState: { isTraining: boolean; algorithm: string; error: string | null; progress: number; logs: string[] } = {
  isTraining: false,
  algorithm: 'auto',
  error: null,
  progress: 0,
  logs: [],
};

export function getModelMetrics(): ModelMetrics {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const data = fs.readFileSync(METADATA_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to read model metadata:", error);
  }
  return defaultMetrics;
}

export function saveModelMetrics(metrics: ModelMetrics) {
  try {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(metrics, null, 2), 'utf8');
  } catch (error) {
    console.error("Failed to write model metadata:", error);
  }
}

export function resetModel(): ModelMetrics {
  try {
    if (fs.existsSync(METADATA_PATH)) fs.unlinkSync(METADATA_PATH);
    const modelPath = path.resolve(process.cwd(), 'ml', 'model.pkl');
    const colsPath = path.resolve(process.cwd(), 'ml', 'model_cols.pkl');
    if (fs.existsSync(modelPath)) fs.unlinkSync(modelPath);
    if (fs.existsSync(colsPath)) fs.unlinkSync(colsPath);
  } catch (error) {
    console.error("Failed to delete model files:", error);
  }
  return defaultMetrics;
}

/**
 * Runs a prediction for a route based on date, time, origin, and destination.
 * We invoke the local Python script `ml/predict.py` using Child Process.
 */
export async function predictRidership(
  origin: string,
  destination: string,
  dateStr: string,
  timeStr: string
): Promise<{ predictedRidership: number; demandLevel: 'Low' | 'Medium' | 'High' | 'Very High'; std?: number }> {
  const db = await getDB();

  // 1. Holiday Check
  const isHolidayRecord = await db.get('SELECT id FROM Holidays WHERE date = ?', [dateStr]);
  const isHolidayFlag = isHolidayRecord ? 1 : 0;

  // 2. Invoke Python Inference Script
  let prediction = 150; // Fallback
  let std = 0;
  try {
    const scriptPath = path.resolve(process.cwd(), 'ml', 'predict.py');
    const command = `python "${scriptPath}" "${origin}" "${destination}" "${dateStr}" "${timeStr}" ${isHolidayFlag}`;
    const { stdout } = await execAsync(command);
    
    // Attempt to parse standard output from Python
    const result = JSON.parse(stdout.trim());
    if (result.predictedRidership) {
      prediction = result.predictedRidership;
    }
    if (typeof result.std === 'number') {
      std = result.std;
    }
  } catch (error) {
    console.warn("Python prediction fallback triggered (Model might be missing or Python unavailable):", error);
  }

  prediction = Math.max(1, Math.min(prediction, 650));

  // Determine Demand Level Badge
  let demandLevel: 'Low' | 'Medium' | 'High' | 'Very High' = 'Low';
  if (prediction <= 50) demandLevel = 'Low';
  else if (prediction <= 100) demandLevel = 'Medium';
  else if (prediction <= 250) demandLevel = 'High';
  else demandLevel = 'Very High';

  return { predictedRidership: prediction, demandLevel, std };
}

/**
 * Triggers the full Machine Learning pipeline asynchronously in background.
 * Uses the uploaded CSV from train/ folder. Spawns the Python training script,
 * captures output, saves metrics when done.
 */
export function startTraining(): void {
  if (trainingState.isTraining) return;

  const trainDir = path.resolve(process.cwd(), 'train');
  if (!fs.existsSync(trainDir)) fs.mkdirSync(trainDir, { recursive: true });

  trainingState.isTraining = true;
  trainingState.error = null;
  trainingState.algorithm = 'rf';
  trainingState.progress = 0;
  trainingState.logs = ['Scanning train/ folder for datasets...'];

  // Collect all multi-year datasets: train/ets_YYYY.csv (2020-2026)
  try {
    const csvFiles = fs.readdirSync(trainDir)
      .filter(f => /^ets_\d{4}\.csv$/i.test(f))
      .sort();

    if (csvFiles.length === 0) {
      trainingState.error = 'No dataset files (ets_YYYY.csv) found in train/ folder.';
      trainingState.isTraining = false;
      return;
    }

    const csvPaths = csvFiles.map(f => path.resolve(trainDir, f));

    let rowCount = 0;
    for (const p of csvPaths) {
      const content = fs.readFileSync(p, 'utf8');
      rowCount += Math.max(0, content.trim().split('\n').length - 1);
    }

    trainingState.logs = [
      `Found ${csvFiles.length} dataset file(s): ${csvFiles.join(', ')}.`,
      `Total ${rowCount} records. Starting training...`
    ];

    const scriptPath = path.resolve(process.cwd(), 'ml', 'train.py');
    const args = csvPaths.map(p => `"${p}"`).join(' ');
    const command = `python "${scriptPath}" ${args}`;
    const progressPath = path.resolve(process.cwd(), 'ml', 'train_progress.json');

    // Write initial progress
    fs.writeFileSync(progressPath, JSON.stringify({ progress: 0, log: 'Training started...' }));

    // Poll the progress file every 1.5s while training
    const progressInterval = setInterval(() => {
      try {
        if (fs.existsSync(progressPath)) {
          const data = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
          trainingState.progress = data.progress || 0;
          if (data.log && !trainingState.logs.includes(data.log)) {
            trainingState.logs = [...trainingState.logs, data.log];
          }
        }
      } catch { /* ignore read errors */ }
    }, 1500);

    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      clearInterval(progressInterval);

      // Clean up progress file
      try { fs.unlinkSync(progressPath); } catch { /* ignore */ }

      if (err) {
        const errMsg = stderr?.trim() || err.message || `Python exited with code ${err.code}`;
        console.error('Python training failed:', errMsg);
        trainingState.error = errMsg;
        trainingState.logs = [...trainingState.logs, 'Error: ' + errMsg];
        trainingState.isTraining = false;
        return;
      }
      try {
        const metrics: ModelMetrics = JSON.parse(stdout.trim());
        saveModelMetrics(metrics);
        trainingState.progress = 100;
        trainingState.logs = [...trainingState.logs, 'Training complete.'];
      } catch (parseErr) {
        console.error('Failed to parse Python output:', stdout?.slice(0, 500), stderr?.slice(0, 500));
        trainingState.error = 'Failed to parse model output from Python. Check Python dependencies.';
        trainingState.logs = [...trainingState.logs, 'Error: Failed to parse Python output.'];
      }
      trainingState.isTraining = false;
    });
  } catch (err: any) {
    trainingState.error = err.message || 'Failed to read uploaded CSV.';
    trainingState.isTraining = false;
  }
}

export function getTrainingReport(): string {
  const metrics = getModelMetrics();
  const lines = [
    '===========================================',
    '   ETS Rider Predict System - Training Report',
    '===========================================',
    '',
    `Date Trained:     ${metrics.trainedAt ? new Date(metrics.trainedAt).toLocaleString() : 'N/A'}`,
    `Total Records:    ${metrics.totalRecords.toLocaleString()}`,
    `Processing Time:  ${metrics.processingTime ? metrics.processingTime + 's' : 'N/A'}`,
    '',
    '--- Model Performance ---',
    `R² Score:         ${metrics.r2}`,
    `MAE (Mean Abs Error): ${metrics.mae}`,
    `RMSE (Root Mean Sq):  ${metrics.rmse}`,
    '',
    `Notes: ${metrics.notes}`,
    '',
    '===========================================',
  ];
  return lines.join('\r\n');
}

