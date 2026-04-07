import  authenticator  from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { tr } from 'zod/v4/locales';
import { generateQRCode, generateTOTPSecret, verifyTOTPCode } from '../utils/TOTP';
import { generateBackupCodes, hashBackupCodes, verifyBackupCode } from '../utils/backupCodes';

// Step 1 — generate secret + QR code (call when user wants to enable 2FA)
export const generate2FASecret = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');

  if (user.twoFactorEnabled) {
    throw new ApiError(400, '2FA is already enabled');
  }

  // generate secret
  const secret =generateTOTPSecret();
  const qrCode = await generateQRCode(user.email,secret)

  // save secret to DB (not enabled yet — user must verify first)
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  return {
    secret,   // show this as backup code
    qrCode,   // base64 image — render as <img src={qrCode} />
  };

};


// 2. verify code and enable 2fa after user scans QR
export const enable2FA = async (userId: string , code: string) =>{

    const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.twoFactorSecret) throw new ApiError(400, 'Generate 2FA secret first');
  if (user.twoFactorEnabled) throw new ApiError(400, '2FA already enabled');


  // verify code -> against secret
  const isValid = verifyTOTPCode(code , user.twoFactorSecret);
  if (!isValid) throw new ApiError(400, 'Invalid 2FA code');


  // generate backup codes 
  const rawBackupCodes = generateBackupCodes();
  const hashedBackupCodes = await hashBackupCodes(rawBackupCodes);

  // mark as enabled and also store backup codes
  await prisma.user.update({
    where:{
        id: user.id
    },data:{
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes
    }
  })

  return { message: '2FA enabled successfully...\nPlease save backup codes in case your device is lost...',
    backupCodes: rawBackupCodes };

}



// Step 3 — disable 2FA
export const disable2FA = async (userId: string, code: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.twoFactorEnabled) throw new ApiError(400, '2FA is not enabled');

  const isValid = verifyTOTPCode(code,user.twoFactorSecret!)
  if (!isValid) throw new ApiError(400, 'Invalid 2FA code');

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false,
       twoFactorSecret: null,
      twoFactorBackupCodes: [] },
  });

  return { message: '2FA disabled successfully' };
};




// Step 4 — verify 2FA code on login
export const verify2FACode = async (userId: string, code: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new ApiError(400, '2FA is not enabled');
  }

  // try TOTP first
  const isValid = await verifyTOTPCode(code,user.twoFactorSecret)
  if(isValid) return true;

  // try backup codes
  const backupIndex = await verifyBackupCode(code,user.twoFactorBackupCodes)
   if (backupIndex !== -1) {
    // remove used backup code — each can only be used once
    const updatedCodes = [...user.twoFactorBackupCodes];
    updatedCodes.splice(backupIndex, 1);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: updatedCodes },
    });

    return true;
  }
   throw new ApiError(400, 'Invalid 2FA code');
};