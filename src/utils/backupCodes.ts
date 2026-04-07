import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// generate 8 backup codes like: a1b2-c3d4
export const generateBackupCodes = (): string[] => {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').match(/.{1,4}/g)!.join('-')
  );
};

// hash all backup codes before storing
export const hashBackupCodes = async (codes: string[]): Promise<string[]> => {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
};

// check if incoming code matches any stored hash
export const verifyBackupCode = async (
  incomingCode: string,
  hashedCodes: string[]
): Promise<number> => {
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(incomingCode, hashedCodes[i]);
    if (match) return i; // return index of matched code
  }
  return -1; // not found
};