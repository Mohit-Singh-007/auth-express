
import { generateSecret, generateURI, OTP, verify } from "otplib";
import { env } from "../config/env";
import QRCode from "qrcode";

const APP_NAME = env.APP_NAME;


// generate TOTP secret
export const generateTOTPSecret = ():string =>{
    return generateSecret();
}


// generate QR code as base64 image
export const generateQRCode = async(email: string,secret: string):Promise<string> =>{
    const uri = generateURI({
        issuer: APP_NAME,
        label: email,
        secret
    })
    return QRCode.toDataURL(uri);
}


// verify 6-digit code [T/F]
export const verifyTOTPCode = async(token: string , secret: string): Promise<boolean> =>{

    try{
        const res =  await verify({secret,token});
        return res.valid;
    }catch{
        return false;
    }

}