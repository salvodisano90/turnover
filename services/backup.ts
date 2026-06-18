// services/backup.ts — Backup/Ripristino cifrato (.turnover). Offline, Expo-safe.
// Cifratura autenticata: PBKDF2(SHA-256) → AES-256-CBC → HMAC-SHA256 (encrypt-then-MAC).
// Nota: AES-GCM non è affidabilmente disponibile in Expo senza moduli nativi; CBC+HMAC (EtM)
// è la costruzione autenticata standard equivalente e completamente JS/Expo-safe.
// La password NON è salvata né recuperabile (PBKDF2 a senso unico). Il file contiene solo dati cifrati.
import CryptoJS from 'crypto-js';

export const BACKUP_VERSION = 3 as const;
export const BACKUP_ALGO = 'AES-256-CBC+HMAC-SHA256' as const;
const PBKDF2_ITER = 150000;
const KEY_SIZE = 256 / 32; // parole da 32 bit → 256 bit
const MAC_SIZE = 256 / 32;

export interface BackupFile {
  version: number;
  encrypted: true;
  algorithm: string;
  hint?: string;
  data: string; // base64(salt[16] | iv[16] | mac[32] | ciphertext)
}

function deriveKey(password: string, salt: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, salt, { keySize: KEY_SIZE, iterations: PBKDF2_ITER, hasher: CryptoJS.algo.SHA256 });
}

/** Serializza e cifra lo snapshot dello store in un BackupFile. */
export function createBackup(snapshot: unknown, password: string, hint?: string): BackupFile {
  const plaintext = JSON.stringify(snapshot);
  const salt = CryptoJS.lib.WordArray.random(16);
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = deriveKey(password, salt);
  const ct = CryptoJS.AES.encrypt(plaintext, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).ciphertext;
  // MAC su (iv | ciphertext) con la stessa chiave derivata → integrità + rilevamento password errata
  const mac = CryptoJS.HmacSHA256(iv.clone().concat(ct), key);
  const packed = salt.clone().concat(iv).concat(mac).concat(ct);
  return { version: BACKUP_VERSION, encrypted: true, algorithm: BACKUP_ALGO, hint: hint || undefined, data: CryptoJS.enc.Base64.stringify(packed) };
}

export class BackupError extends Error {}

/** Decifra un BackupFile. Lancia BackupError se password errata o file corrotto (nessun dato esposto). */
export function restoreBackup<T = unknown>(file: BackupFile, password: string): T {
  if (!file || file.encrypted !== true || !file.data) throw new BackupError('File di backup non valido.');
  if (typeof file.version !== 'number') throw new BackupError('Formato di backup non riconosciuto.');
  let words: CryptoJS.lib.WordArray;
  try { words = CryptoJS.enc.Base64.parse(file.data); } catch { throw new BackupError('File di backup corrotto.'); }
  const all = words.words.slice();
  const sigBytes = words.sigBytes;
  if (sigBytes < (16 + 16 + 32)) throw new BackupError('File di backup corrotto.');
  const salt = CryptoJS.lib.WordArray.create(all.slice(0, 4), 16);
  const iv = CryptoJS.lib.WordArray.create(all.slice(4, 8), 16);
  const mac = CryptoJS.lib.WordArray.create(all.slice(8, 8 + MAC_SIZE), 32);
  const ct = CryptoJS.lib.WordArray.create(all.slice(8 + MAC_SIZE), sigBytes - 16 - 16 - 32);
  const key = deriveKey(password, salt);
  const expected = CryptoJS.HmacSHA256(iv.clone().concat(ct), key);
  // confronto costante (stringhe hex) → password errata o file manomesso
  if (CryptoJS.enc.Hex.stringify(expected) !== CryptoJS.enc.Hex.stringify(mac)) {
    throw new BackupError('Password errata o file non integro.');
  }
  let plaintext: string;
  try {
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ct } as any, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  } catch { throw new BackupError('Impossibile decifrare il backup.'); }
  if (!plaintext) throw new BackupError('Password errata o file non integro.');
  try { return JSON.parse(plaintext) as T; } catch { throw new BackupError('Contenuto del backup non valido.'); }
}

/** Nome file standard: turnover_backup_YYYY_MM_DD.turnover */
export function backupFileName(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `turnover_backup_${d.getFullYear()}_${p(d.getMonth() + 1)}_${p(d.getDate())}.turnover`;
}
