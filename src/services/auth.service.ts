
import { prisma } from "../config/prisma";
import { EmailTokenType } from "../generated/prisma";
import { RegisterInput } from "../schema/authSchema";
import bcrypt from "bcryptjs"
import crypto from 'crypto';

export const registerUser = async(data: RegisterInput) =>{

    const{name,email,password} = data;

    // 1. check if email exists
    const existing = await prisma.user.findUnique({where: {email}});

    if(existing) throw new Error("EMAIL_TAKEN");

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
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 60 * 1000), // 24 hrs from now
        }
    })

    // 6. send email with rawToken [later]

    return {
        id: user.id,
        name: user.name,
        email: user.email
    }
}