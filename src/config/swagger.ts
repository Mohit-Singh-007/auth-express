import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth API',
      version: '1.0.0',
      description: 'Production-grade Node.js authentication system',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Mohit Singh' },
            email: { type: 'string', example: 'mohit@example.com' },
            password: { type: 'string', example: 'Test@1234' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'mohit@example.com' },
            password: { type: 'string', example: 'Test@1234' },
          },
        },
        TokenInput: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', example: 'a3f9bc2e...' },
          },
        },
        PasswordResetInput: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', example: 'a3f9bc2e...' },
            password: { type: 'string', example: 'NewPass@1234' },
          },
        },
        TwoFAInput: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', example: '123456' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            accessToken: { type: 'string' },
            user: { $ref: '#/components/schemas/UserResponse' },
          },
        },
      },
    },
  },
  apis: ['./src/docs/*.ts'], // ← we'll put docs here
};

export const swaggerSpec = swaggerJsdoc(options);