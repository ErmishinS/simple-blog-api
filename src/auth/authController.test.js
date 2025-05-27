import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { register, login } from './authController.js';
import prisma from '../config/database.js';
import { registerSchema, loginSchema } from '../utils/validation.js';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../config/database.js', () => ({
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
}));
jest.mock('../utils/validation.js', () => ({
    registerSchema: {
        validate: jest.fn(),
    },
    loginSchema: {
        validate: jest.fn(),
    },
}));

describe('Auth Controller', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();

        process.env.JWT_SECRET = 'test-secret';
    });

    describe('register', () => {
        const validUserData = {
            email: 'test@example.com',
            password: 'password123',
        };

        const mockUser = {
            id: 'user-id-123',
            email: 'test@example.com',
            createdAt: new Date('2024-01-01'),
        };

        it('should register a new user successfully', async () => {
            mockReq.body = validUserData;

            registerSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed-password');
            prisma.user.create.mockResolvedValue(mockUser);

            await register(mockReq, mockRes);

            expect(registerSchema.validate).toHaveBeenCalledWith(validUserData);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: validUserData.email },
            });
            expect(bcrypt.hash).toHaveBeenCalledWith(validUserData.password, 10);
            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: validUserData.email,
                    password: 'hashed-password',
                },
                select: {
                    id: true,
                    email: true,
                    createdAt: true,
                },
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { user: mockUser },
                message: 'User registered successfully',
            });
        });

        it('should return validation error for invalid input', async () => {
            const invalidData = { email: 'invalid-email', password: '123' };
            mockReq.body = invalidData;

            const validationError = {
                details: [{ message: 'Email must be valid' }],
            };
            registerSchema.validate.mockReturnValue({ error: validationError });

            await register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Email must be valid',
            });
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });

        it('should return error if email already exists', async () => {
            mockReq.body = validUserData;

            registerSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockResolvedValue(mockUser);

            await register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Email already registered',
            });
            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(prisma.user.create).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            mockReq.body = validUserData;

            registerSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await register(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Registration error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });

            consoleSpy.mockRestore();
        });

        it('should handle bcrypt hashing errors', async () => {
            mockReq.body = validUserData;

            registerSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockResolvedValue(null);
            bcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await register(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Registration error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });

            consoleSpy.mockRestore();
        });
    });

    describe('login', () => {
        const loginData = {
            email: 'test@example.com',
            password: 'password123',
        };

        const mockUser = {
            id: 'user-id-123',
            email: 'test@example.com',
            password: 'hashed-password',
        };

        const mockToken = 'jwt-token-123';

        it('should login user successfully with valid credentials', async () => {
            mockReq.body = loginData;

            loginSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue(mockToken);

            await login(mockReq, mockRes);

            expect(loginSchema.validate).toHaveBeenCalledWith(loginData);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: loginData.email },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: mockUser.id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    token: mockToken,
                    user: {
                        id: mockUser.id,
                        email: mockUser.email,
                    },
                },
                message: 'Login successful',
            });
        });

        it('should return validation error for invalid input', async () => {
            const invalidData = { email: 'invalid-email' };
            mockReq.body = invalidData;

            const validationError = {
                details: [{ message: 'Password is required' }],
            };
            loginSchema.validate.mockReturnValue({ error: validationError });

            await login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Password is required',
            });
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });

        it('should return error for non-existent user', async () => {
            mockReq.body = loginData;

            loginSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockResolvedValue(null);

            await login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Invalid email or password',
            });
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should return error for invalid password', async () => {
            mockReq.body = loginData;

            loginSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await login(mockReq, mockRes);

            expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Invalid email or password',
            });
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            mockReq.body = loginData;

            loginSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await login(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });

            consoleSpy.mockRestore();
        });

        it('should handle bcrypt comparison errors', async () => {
            mockReq.body = loginData;

            loginSchema.validate.mockReturnValue({ error: null });
            prisma.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await login(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });

            consoleSpy.mockRestore();
        });
    });
});