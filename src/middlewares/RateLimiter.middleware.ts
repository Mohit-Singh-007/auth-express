import rateLimit from "express-rate-limit";

// login , register , forgot-password
export const authLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 min window
    max: 15,
    message:{
        message: "Too many requests, please try again in 15 minutes..."
    },
    standardHeaders: true,
    legacyHeaders: false
})


export const passwordResetLimiter = rateLimit({
    windowMs: 60*60*1000, // 1 hr window
    max: 3,
    message:{
        message: "Too many password reset requests, please try again after 1 hour..."
    },
    standardHeaders: true,
    legacyHeaders: false
})

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});