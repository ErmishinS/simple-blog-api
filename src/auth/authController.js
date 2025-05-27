import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const register = async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: error.details[0].message
            });
        }

        const { email, password } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                status: 'error',
                message: 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword
            },
            select: {
                id: true,
                email: true,
                createdAt: true
            }
        });

        res.status(201).json({
            status: 'success',
            data: { user },
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};

export const login = async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: error.details[0].message
            });
        }

        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user.id);

        res.json({
            status: 'success',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email
                }
            },
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
