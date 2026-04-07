
import { prisma } from "../config/prisma";
import { EmailTokenType } from "../generated/prisma";
import { LoginInput, RegisterInput } from "../schema/authSchema";
import bcrypt from "bcryptjs"
import crypto from 'crypto';
import { ApiError } from "../utils/ApiError";
import { JwtPayload, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { redis } from "../config/redis";
import jwt from "jsonwebtoken"
import { env } from "../config/env";
import { passwordResetEmailTemplate, verificationEmailTemplate } from "../utils/emailTemplate";
import { sendEmail } from "../utils/sendEmail";

export const registerUser = async(data: RegisterInput) =>{
    const{name,email,password} = data;

    // 1. check if email exists
    const existing = await prisma.user.findUnique({where: {email}});

    if(existing) throw new ApiError(409,"Email already in use...");

    // 2. hash password
    const passwordHash = await bcrypt.hash(password,12);

    // 3. create user
    const user = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash
        }
    })

    // 4. email verification token generate kr and hash using crypto
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 5. save token in DB
    await prisma.emailToken.create({
        data:{
            userId: user.id,
            token: tokenHash,
            type: EmailTokenType.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hrs from now
        }
    })

    const { subject, html } = verificationEmailTemplate(name, rawToken);
    await sendEmail({ to: email, subject, html });
    // 6. send email with rawToken [later]
    console.log(`✅ Verification token for ${data.email}: ${rawToken}`);

    return {
        id: user.id,
        name: user.name,
        email: user.email
    }
}



export const loginUser = async(
    data: LoginInput,
    meta: {ip?: string , userAgent?: string}) =>{

        const {email,password} = data;

        // 1. find user
        const user = await prisma.user.findUnique({where:{email}});

        // 2. check if account is locked
        if(user?.lockedUntil && user.lockedUntil > new Date()){
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now())/1000/60);

            throw new ApiError( 429, `Account locked for: ${minutesLeft} min`)
        }

        // 3. generic error if missing field
        if(!user || !user.passwordHash){
            throw new ApiError(401,"Invalid credentials...")
        }

        //4 . compare passwords
        const verify = await bcrypt.compare(password,user.passwordHash);

        if(!verify){
            // failed attempt ++
            const attempts = user.failedLoginAttempts + 1;
            await prisma.user.update({
                where:{id: user.id},
                data:{
                    failedLoginAttempts: attempts,
                    lockedUntil: attempts >= 5 ? new Date(Date.now() + 5 * 60 * 1000) : null
                }
            })

            throw new ApiError(401,"Invalid credentials...")
        }

        // 5. check if email is verified
        if(!user.isVerified){
            throw new ApiError(401,"Email not verified...")
        }

        // [new] check if 2FA is enabled
        if(user.twoFactorEnabled){
            const tempToken = jwt.sign(
                {userId: user.id , purpose:"2fa"},
                env.JWT_ACCESS_SECRET,
                {expiresIn: '5m'}

            )

            // reset failed attempts as password was corrext
              await prisma.user.update({
            where:{id: user.id},
            data:{
                failedLoginAttempts: 0 , lockedUntil: null
            }})

            // early return
            return {
                requiresTwoFactor: true,
                tempToken,
                accessToken: null,
                refreshToken: null,
                user: null
            }
        }
        


        // 6. reset failed attempt on success
        await prisma.user.update({
            where:{id: user.id},
            data:{
                failedLoginAttempts: 0 , lockedUntil: null
            }
        })

        // 7. sign tokens
        const payload = {userId: user.id , email: user.email , role: user.role}

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        // 8. store refresh token in DB + Redis[fast lookup]
        const refreshTokenId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7day


        await Promise.all([
         redis.setex(
            `refresh:${user.id}:${refreshTokenId}`,
            7 * 24 * 60 * 60,
            refreshToken
        ),
        prisma.refreshToken.create({
            data: {
            id: refreshTokenId,
            token: refreshToken,
            userId: user.id,
            ipAddress: meta.ip,
            userAgent: meta.userAgent,
            deviceName: parseDeviceName(meta.userAgent),
            expiresAt,
            },
        }),
        ]);
      
        return {
            accessToken,
            refreshToken,
            user:{
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        }
}



export const verifyEmail = async(rawToken: string) =>{

    // hash incoming token to compare with one in DB
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 2. find it in DB
    const record = await prisma.emailToken.findUnique({where: {token: tokenHash}, include: {user: true} },)

    // 3. validate
    if(!record || record.type != EmailTokenType.EMAIL_VERIFICATION) throw new ApiError(409,"Invalid token")

    if(record.expiresAt < new Date()){
        await prisma.emailToken.delete({where: {id: record.id}})
        throw new ApiError(401,"Token expired...")
    }

    if(record.user.isVerified){
        throw new ApiError(200,"Already verified...")
    }


    // 4. mark user verified and delete used token [tokens are one time use only]
    await Promise.all([
        prisma.user.update({
            where: {
                id: record.userId
            },
            data:{
                isVerified: true
            }
        }),
        prisma.emailToken.delete({where: {
            id: record.id
        }})
    ])

    return {message: "Email verified successfully..."}
}



export const resendVerificationEmail = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // always return success — don't reveal if email exists
  if (!user || user.isVerified) return;

  // delete any existing verification tokens for this user
  await prisma.emailToken.deleteMany({
    where: {
      userId: user.id,
      type: EmailTokenType.EMAIL_VERIFICATION,
    },
  });

  // create new token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await prisma.emailToken.create({
    data: {
      userId: user.id,
      token: tokenHash,
      type: EmailTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const { subject, html } = verificationEmailTemplate(user.name, rawToken);
await sendEmail({ to: email, subject, html });

  // TODO: send email with rawToken (Step 8 — mailer)
  console.log(`Verification token for ${email}: ${rawToken}`);
};




export const refreshToken = async(incomingToken: string) =>{

    // 1. verify refresh token signature [payload]

    let payload: JwtPayload;
    try {
        payload = verifyRefreshToken(incomingToken);
    } catch  {
        throw new ApiError(401,"Invalid refresh token");
    }

    // 1. check redis first -> if not then DB
    const redisKey = await redis.keys(`refresh:${payload.userId}:*`)
    let found = false;
    for(const key of redisKey){
        const val = await redis.get(key);
            if(val === incomingToken){
                found=true;
                await redis.del(key); // delete old token from redis
                break;
            }
    }
    
    // 2. also check if token in DB [not revoked yet]
    const storedToken = await prisma.refreshToken.findUnique({
        where:{token: incomingToken}
    })

    if(!storedToken && !found){
        // revoke all -> possible reuse attack
        await Promise.all([
 await prisma.refreshToken.deleteMany({
            where:{
                userId: payload.userId
            }
        }),
        redis.del(...(await redis.keys(`refresh:${payload.userId}:*`)))
        ])
       
         throw new ApiError(401, 'Refresh token reuse detected');
    }


    // 3. check expiry of token
    if(storedToken && storedToken.expiresAt < new Date()){
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new ApiError(401, 'Refresh token expired');
    }


    // 4. get fresh data from DB
    const user = await prisma.user.findUnique({
        where:{
            id: payload.userId
        }
    })
    if (!user || !user.isVerified) {
    throw new ApiError(401, 'User not found or not verified');
     }


  // 5. delete old refresh token (rotation — one time use)
  if(storedToken) await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  // 6. sign new tokens
  const newPayload = { userId: user.id, email: user.email, role: user.role };
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);
  const newRefreshTokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 7. save new refresh token to DB
  await Promise.all([
    redis.setex(
      `refresh:${user.id}:${newRefreshToken}`,
      7 * 24 * 60 * 60,
      newRefreshToken
    ),
    prisma.refreshToken.create({
      data: {
        id: newRefreshTokenId,
        token: newRefreshToken,
        userId: user.id,
        ipAddress: storedToken?.ipAddress,
        userAgent: storedToken?.userAgent,
        deviceName: storedToken?.deviceName,
        lastUsedAt: new Date(),
        expiresAt
      },
    }),
  ]);


  return { newAccessToken, newRefreshToken };
};




export const forgotPassword = async (email: string) =>{
    const user = await prisma.user.findUnique({where:{email}});

    // always return success , no need to reveal mail
    if(!user) return;

    // delete token for user [if any]
    await prisma.emailToken.deleteMany({
        where:{
            userId: user.id,
            type: EmailTokenType.PASSWORD_RESET
        }
    })

    // generate token
    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // save to DB with less time [than verify-email]
    await prisma.emailToken.create({
       data:{
        userId: user.id,
        token: tokenHash,
        type: EmailTokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 15*60*1000)
       }
    })

    const { subject, html } = passwordResetEmailTemplate(user.name, rawToken);
await sendEmail({ to: email, subject, html });

    // TODO - real email here
    console.log(`RESET token for email ${email}: ${rawToken}`)
}



export const resetPassword = async (rawToken: string, newPassword: string) =>{
 // hash incoming token to compare with DB one
 const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

 // find token in DB
 const record = await prisma.emailToken.findUnique({
    where:{token: tokenHash},
    include: {user: true}
 })

 // validate it
  if (!record || record.type !== EmailTokenType.PASSWORD_RESET) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

   if (record.expiresAt < new Date()) {
    await prisma.emailToken.delete({ where: { id: record.id } });
    throw new ApiError(400, 'Reset token has expired. Please request a new one');
  }


  // hash new password
  const passwordHash = await bcrypt.hash(newPassword,12);

  // update pass + delete token + revoke all sessions
  await Promise.all([
    prisma.user.update({
        where:{id: record.user.id},
        data:{
            passwordHash,
            failedLoginAttempts:0,
            lockedUntil: null
        }
    }),
    prisma.emailToken.delete({where:{id: record.id}}),
    prisma.refreshToken.deleteMany({where:{userId: record.userId}})
  ])

   return { message: 'Password reset successful. Please login with your new password.' };

}



export const logoutUser = async (refreshToken: string) => {

  const payload = verifyRefreshToken(refreshToken);

  // del from redis
  const keys = await redis.keys(`refresh:${payload.userId}:*`)
  if(keys.length > 0) await redis.del(...keys);

  // delete from DB as well — token is now invalid
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
};



const parseDeviceName = (userAgent?: string): string => {
  if (!userAgent) return 'Unknown device';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Postman')) return 'Postman';
  return 'Unknown device';
};