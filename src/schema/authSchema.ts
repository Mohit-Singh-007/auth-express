import z from "zod";

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2,"Name must be at least 2 characters long..."),
        email: z.email("Invalid email address..."),
        password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.email("Invalid email address..."),
        password: z.string().min(1,"Password is required...")
    })
})

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.email("Invalid email address...")
    })
})


export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});

export const refreshTokenSchema = z.object({
  cookies: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});


export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];