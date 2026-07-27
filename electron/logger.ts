import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Logger pour capturer tous les logs Electron et les sauvegarder dans un fichier
 */

const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

let logStream: fs.WriteStream | null = null;

/**
 * Initialiser le logger
 */
export function initLogger() {
  try {
    // Créer le répertoire logs s'il n'existe pas
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Ouvrir le stream de log
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf-8' });

    // Écrire un séparateur au démarrage
    writeLog('═'.repeat(80));
    writeLog(`Application started at ${new Date().toISOString()}`);
    writeLog('═'.repeat(80));

    // Capturer console.log, console.warn, console.error
    captureConsole();

    console.log(`[Logger] Initialized. Logs will be saved to: ${LOG_FILE}`);
  } catch (error) {
    console.error('[Logger] Failed to initialize logger:', error);
  }
}

/**
 * Capturer les outputs de console
 */
function captureConsole() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  console.log = (...args: any[]) => {
    writeLog(`[LOG] ${formatArgs(args)}`);
    originalLog.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    writeLog(`[WARN] ${formatArgs(args)}`);
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    writeLog(`[ERROR] ${formatArgs(args)}`);
    originalError.apply(console, args);
  };

  console.info = (...args: any[]) => {
    writeLog(`[INFO] ${formatArgs(args)}`);
    originalInfo.apply(console, args);
  };
}

/**
 * Formatter les arguments console
 */
function formatArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Écrire dans le fichier log
 */
function writeLog(message: string) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    if (logStream && !logStream.closed) {
      logStream.write(logMessage, (error) => {
        if (error) {
          console.error('[Logger] Failed to write to log file:', error);
        }
      });
    } else {
      // Fallback si le stream est fermé
      fs.appendFileSync(LOG_FILE, logMessage, { encoding: 'utf-8' });
    }

    // Vérifier la taille du fichier et faire une rotation si nécessaire
    checkAndRotateLog();
  } catch (error) {
    console.error('[Logger] Error writing log:', error);
  }
}

/**
 * Vérifier et faire une rotation du fichier log s'il est trop gros
 */
function checkAndRotateLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const timestamp = new Date().getTime();
        const backupFile = path.join(LOG_DIR, `app-${timestamp}.log`);
        fs.renameSync(LOG_FILE, backupFile);
        
        // Fermer et rouvrir le stream
        if (logStream) {
          logStream.destroy();
        }
        logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf-8' });
        
        writeLog(`Log rotated. Previous log: ${backupFile}`);
      }
    }
  } catch (error) {
    console.error('[Logger] Error rotating log:', error);
  }
}

/**
 * Récupérer le contenu du fichier log
 */
export function getLogContent(): string {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return fs.readFileSync(LOG_FILE, 'utf-8');
    }
    return 'No log file found';
  } catch (error) {
    return `Error reading log file: ${error}`;
  }
}

/**
 * Récupérer le chemin du fichier log
 */
export function getLogFilePath(): string {
  return LOG_FILE;
}

/**
 * Récupérer la liste de tous les fichiers log (y compris les archives)
 */
export function getLogFiles(): string[] {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      return [];
    }
    const files = fs.readdirSync(LOG_DIR)
      .filter((file) => file.endsWith('.log'))
      .map((file) => path.join(LOG_DIR, file));
    return files;
  } catch (error) {
    console.error('[Logger] Error getting log files:', error);
    return [];
  }
}

/**
 * Effacer les logs
 */
export function clearLogs() {
  try {
    if (logStream) {
      logStream.destroy();
    }
    
    const files = getLogFiles();
    for (const file of files) {
      fs.unlinkSync(file);
    }
    
    // Rouvrir le stream
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf-8' });
    writeLog('Logs cleared');
    
    console.log('[Logger] Logs cleared');
  } catch (error) {
    console.error('[Logger] Error clearing logs:', error);
  }
}

/**
 * Fermer le logger (à appeler à l'arrêt de l'application)
 */
export function closeLogger() {
  try {
    if (logStream && !logStream.closed) {
      writeLog(`Application closed at ${new Date().toISOString()}`);
      logStream.end();
    }
  } catch (error) {
    console.error('[Logger] Error closing logger:', error);
  }
}
