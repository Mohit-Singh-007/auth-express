import z from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development","production","test"]).default("development"),
    PORT: z.coerce.number().default(8000),

    DATABASE_URL: z.string().min(1),

    REDIS_URL: z.string().min(1),
    REDIS_PASSWORD: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    CLIENT_URL: z.string().url(),
    APP_NAME: z.string().min(1)
});

const parsedEnvSchema = envSchema.safeParse(process.env);

if(!parsedEnvSchema.success){
    console.error("Invalid env variables");
    console.error(JSON.stringify(parsedEnvSchema.error.flatten().fieldErrors, null, 2));
    process.exit(1);
}

export const env = parsedEnvSchema.data;