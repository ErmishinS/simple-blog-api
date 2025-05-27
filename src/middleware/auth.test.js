import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './auth.js';
import prisma from '../config/database.js';

jest.mock('jsonwebtoken');
jest.mock('../config/database.js', () => ({
    user: {
        findUnique: jest.fn(),
    },
}));

describe('Authentication Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            headers: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();

        jest.clearAllMocks();

        process.env.JWT_SECRET = 'test-secret';
    });

    it('should authenticate valid token successfully', async () => {
        const mockUser = {
            id: 'user-id-123',
            email: 'test@example.com',
        };
        const mockToken = 'Bearer valid-jwt-token';
        const mockDecoded = { userId: 'user-id-123' };

        mockReq.headers['authorization'] = mockToken;
        jwt.verify.mockReturnValue(mockDecoded);
        prisma.user.findUnique.mockResolvedValue(mockUser);

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: mockDecoded.userId },
            select: { id: true, email: true },
        });
        expect(mockReq.user).toEqual(mockUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return error when no authorization header is provided', async () => {
        await authenticateToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Access token required',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return error when authorization header has no token', async () => {
        mockReq.headers['authorization'] = 'Bearer ';

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Access token required',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return error when authorization header format is invalid', async () => {
        mockReq.headers['authorization'] = 'invalid-format-token';

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Access token required',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return error when JWT verification fails', async () => {
        mockReq.headers['authorization'] = 'Bearer invalid-token';
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(jwt.verify).toHaveBeenCalledWith('invalid-token', process.env.JWT_SECRET);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Invalid or expired token',
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return error when user is not found in database', async () => {
        const mockToken = 'Bearer valid-jwt-token';
        const mockDecoded = { userId: 'non-existent-user-id' };

        mockReq.headers['authorization'] = mockToken;
        jwt.verify.mockReturnValue(mockDecoded);
        prisma.user.findUnique.mockResolvedValue(null);

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: mockDecoded.userId },
            select: { id: true, email: true },
        });
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Invalid token',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
        const mockToken = 'Bearer valid-jwt-token';
        const mockDecoded = { userId: 'user-id-123' };

        mockReq.headers['authorization'] = mockToken;
        jwt.verify.mockReturnValue(mockDecoded);
        prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Invalid or expired token',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle JWT expired token error', async () => {
        mockReq.headers['authorization'] = 'Bearer expired-token';
        jwt.verify.mockImplementation(() => {
            const error = new Error('jwt expired');
            error.name = 'TokenExpiredError';
            throw error;
        });

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Invalid or expired token',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed JWT token error', async () => {
        mockReq.headers['authorization'] = 'Bearer malformed-token';
        jwt.verify.mockImplementation(() => {
            const error = new Error('jwt malformed');
            error.name = 'JsonWebTokenError';
            throw error;
        });

        await authenticateToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Invalid or expired token',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
});