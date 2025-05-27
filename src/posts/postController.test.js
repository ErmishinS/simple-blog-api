import { jest } from '@jest/globals';
import {
    getAllPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost
} from './postController.js';
import prisma from '../config/database.js';
import { postSchema, updatePostSchema } from '../utils/validation.js';

jest.mock('../config/database.js', () => ({
    posts: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('../utils/validation.js', () => ({
    postSchema: {
        validate: jest.fn(),
    },
    updatePostSchema: {
        validate: jest.fn(),
    },
}));

describe('Posts Controller', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            user: { id: 'user-123', email: 'test@example.com' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();
    });

    describe('getAllPosts', () => {
        const mockPosts = [
            {
                id: 'post-1',
                title: 'First Post',
                content: 'Content of first post',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                authorId: 'user-123',
                author: {
                    id: 'user-123',
                    email: 'test@example.com'
                }
            },
            {
                id: 'post-2',
                title: 'Second Post',
                content: 'Content of second post',
                createdAt: new Date('2024-01-02'),
                updatedAt: new Date('2024-01-02'),
                authorId: 'user-456',
                author: {
                    id: 'user-456',
                    email: 'author2@example.com'
                }
            }
        ];

        it('should get all posts successfully', async () => {
            prisma.posts.findMany.mockResolvedValue(mockPosts);

            await getAllPosts(mockReq, mockRes);

            expect(prisma.posts.findMany).toHaveBeenCalledWith({
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { posts: mockPosts }
            });
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return empty array when no posts exist', async () => {
            prisma.posts.findMany.mockResolvedValue([]);

            await getAllPosts(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { posts: [] }
            });
        });

        it('should handle database errors gracefully', async () => {
            prisma.posts.findMany.mockRejectedValue(new Error('Database connection failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await getAllPosts(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Get posts error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });
    });

    describe('getPostById', () => {
        const mockPost = {
            id: 'post-123',
            title: 'Test Post',
            content: 'Test content',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            authorId: 'user-123',
            author: {
                id: 'user-123',
                email: 'test@example.com'
            }
        };

        it('should get post by id successfully', async () => {
            mockReq.params.id = 'post-123';
            prisma.posts.findUnique.mockResolvedValue(mockPost);

            await getPostById(mockReq, mockRes);

            expect(prisma.posts.findUnique).toHaveBeenCalledWith({
                where: { id: 'post-123' },
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            });
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { post: mockPost }
            });
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 404 when post not found', async () => {
            mockReq.params.id = 'non-existent-post';
            prisma.posts.findUnique.mockResolvedValue(null);

            await getPostById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Post not found'
            });
        });

        it('should handle database errors gracefully', async () => {
            mockReq.params.id = 'post-123';
            prisma.posts.findUnique.mockRejectedValue(new Error('Database error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await getPostById(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Get post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });
    });

    describe('createPost', () => {
        const validPostData = {
            title: 'New Post Title',
            content: 'New post content'
        };

        const createdPost = {
            id: 'post-new',
            title: 'New Post Title',
            content: 'New post content',
            authorId: 'user-123',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            author: {
                id: 'user-123',
                email: 'test@example.com'
            }
        };

        it('should create post successfully with valid data', async () => {
            mockReq.body = validPostData;
            postSchema.validate.mockReturnValue({ error: null });
            prisma.posts.create.mockResolvedValue(createdPost);

            await createPost(mockReq, mockRes);

            expect(postSchema.validate).toHaveBeenCalledWith(validPostData);
            expect(prisma.posts.create).toHaveBeenCalledWith({
                data: {
                    title: validPostData.title,
                    content: validPostData.content,
                    authorId: 'user-123'
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { post: createdPost },
                message: 'Post created successfully'
            });
        });

        it('should create post with empty content when content is not provided', async () => {
            mockReq.body = { title: 'Title Only' };
            postSchema.validate.mockReturnValue({ error: null });

            const postWithEmptyContent = {
                ...createdPost,
                title: 'Title Only',
                content: ''
            };
            prisma.posts.create.mockResolvedValue(postWithEmptyContent);

            await createPost(mockReq, mockRes);

            expect(prisma.posts.create).toHaveBeenCalledWith({
                data: {
                    title: 'Title Only',
                    content: '',
                    authorId: 'user-123'
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            });
        });

        it('should return validation error for invalid data', async () => {
            const invalidData = { title: '' };
            mockReq.body = invalidData;

            const validationError = {
                details: [{ message: 'Title is required' }]
            };
            postSchema.validate.mockReturnValue({ error: validationError });

            await createPost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Title is required'
            });
            expect(prisma.posts.create).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            mockReq.body = validPostData;
            postSchema.validate.mockReturnValue({ error: null });
            prisma.posts.create.mockRejectedValue(new Error('Database error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await createPost(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Create post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });

        it('should handle missing user in request', async () => {
            mockReq.user = undefined;
            mockReq.body = validPostData;
            postSchema.validate.mockReturnValue({ error: null });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await createPost(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Create post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });
    });

    describe('updatePost', () => {
        const updateData = {
            title: 'Updated Title',
            content: 'Updated content'
        };

        const existingPost = {
            id: 'post-123',
            title: 'Original Title',
            content: 'Original content',
            authorId: 'user-123',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
        };

        const updatedPost = {
            ...existingPost,
            ...updateData,
            updatedAt: new Date('2024-01-02'),
            author: {
                id: 'user-123',
                email: 'test@example.com'
            }
        };

        it('should update post successfully when user is the author', async () => {
            mockReq.params.id = 'post-123';
            mockReq.body = updateData;
            updatePostSchema.validate.mockReturnValue({ error: null });
            prisma.posts.findUnique.mockResolvedValue(existingPost);
            prisma.posts.update.mockResolvedValue(updatedPost);

            await updatePost(mockReq, mockRes);

            expect(updatePostSchema.validate).toHaveBeenCalledWith(updateData);
            expect(prisma.posts.findUnique).toHaveBeenCalledWith({
                where: { id: 'post-123' }
            });
            expect(prisma.posts.update).toHaveBeenCalledWith({
                where: { id: 'post-123' },
                data: updateData,
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            });
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data: { post: updatedPost },
                message: 'Post updated successfully'
            });
        });

        it('should return validation error for invalid data', async () => {
            const invalidData = { title: '' };
            mockReq.params.id = 'post-123';
            mockReq.body = invalidData;

            const validationError = {
                details: [{ message: 'Title cannot be empty' }]
            };
            updatePostSchema.validate.mockReturnValue({ error: validationError });

            await updatePost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Title cannot be empty'
            });
            expect(prisma.posts.findUnique).not.toHaveBeenCalled();
        });

        it('should return 404 when post not found', async () => {
            mockReq.params.id = 'non-existent-post';
            mockReq.body = updateData;
            updatePostSchema.validate.mockReturnValue({ error: null });
            prisma.posts.findUnique.mockResolvedValue(null);

            await updatePost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Post not found'
            });
            expect(prisma.posts.update).not.toHaveBeenCalled();
        });

        it('should return 403 when user is not the author', async () => {
            const otherUserPost = { ...existingPost, authorId: 'other-user' };
            mockReq.params.id = 'post-123';
            mockReq.body = updateData;
            updatePostSchema.validate.mockReturnValue({ error: null });
            prisma.posts.findUnique.mockResolvedValue(otherUserPost);

            await updatePost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'You can only update your own posts'
            });
            expect(prisma.posts.update).not.toHaveBeenCalled();
        });

        it('should handle database errors during findUnique', async () => {
            mockReq.params.id = 'post-123';
            mockReq.body = updateData;
            updatePostSchema.validate.mockReturnValue({ error: null });
            prisma.posts.findUnique.mockRejectedValue(new Error('Database error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await updatePost(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Update post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });

        it('should handle database errors during update', async () => {
            mockReq.params.id = 'post-123';
            mockReq.body = updateData;
            updatePostSchema.validate.mockReturnValue({ error: null });
            prisma.posts.findUnique.mockResolvedValue(existingPost);
            prisma.posts.update.mockRejectedValue(new Error('Update failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await updatePost(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Update post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });
    });

    describe('deletePost', () => {
        const existingPost = {
            id: 'post-123',
            title: 'Post to Delete',
            content: 'Content to delete',
            authorId: 'user-123',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
        };

        it('should delete post successfully when user is the author', async () => {
            mockReq.params.id = 'post-123';
            prisma.posts.findUnique.mockResolvedValue(existingPost);
            prisma.posts.delete.mockResolvedValue(existingPost);

            await deletePost(mockReq, mockRes);

            expect(prisma.posts.findUnique).toHaveBeenCalledWith({
                where: { id: 'post-123' }
            });
            expect(prisma.posts.delete).toHaveBeenCalledWith({
                where: { id: 'post-123' }
            });
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Post deleted successfully'
            });
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 404 when post not found', async () => {
            mockReq.params.id = 'non-existent-post';
            prisma.posts.findUnique.mockResolvedValue(null);

            await deletePost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Post not found'
            });
            expect(prisma.posts.delete).not.toHaveBeenCalled();
        });

        it('should return 403 when user is not the author', async () => {
            const otherUserPost = { ...existingPost, authorId: 'other-user' };
            mockReq.params.id = 'post-123';
            prisma.posts.findUnique.mockResolvedValue(otherUserPost);

            await deletePost(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'You can only delete your own posts'
            });
            expect(prisma.posts.delete).not.toHaveBeenCalled();
        });

        it('should handle database errors during findUnique', async () => {
            mockReq.params.id = 'post-123';
            prisma.posts.findUnique.mockRejectedValue(new Error('Database error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await deletePost(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Delete post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });

        it('should handle database errors during delete', async () => {
            mockReq.params.id = 'post-123';
            prisma.posts.findUnique.mockResolvedValue(existingPost);
            prisma.posts.delete.mockRejectedValue(new Error('Delete failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await deletePost(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Delete post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });

        it('should handle missing user in request', async () => {
            mockReq.user = undefined;
            mockReq.params.id = 'post-123';
            prisma.posts.findUnique.mockResolvedValue(existingPost);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await deletePost(mockReq, mockRes);

            expect(consoleSpy).toHaveBeenCalledWith('Delete post error:', expect.any(Error));
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Edge Cases and Security', () => {
        it('should handle SQL injection attempts in post ID', async () => {
            mockReq.params.id = "'; DROP TABLE posts; --";
            prisma.posts.findUnique.mockResolvedValue(null);

            await getPostById(mockReq, mockRes);

            expect(prisma.posts.findUnique).toHaveBeenCalledWith({
                where: { id: "'; DROP TABLE posts; --" },
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            });
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Post not found'
            });
        });

        it('should handle very long post content', async () => {
            const longContent = 'a'.repeat(10000);
            mockReq.body = {
                title: 'Test Post',
                content: longContent
            };
            postSchema.validate.mockReturnValue({ error: null });

            const createdPost = {
                id: 'post-long',
                title: 'Test Post',
                content: longContent,
                authorId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                author: { id: 'user-123', email: 'test@example.com' }
            };
            prisma.posts.create.mockResolvedValue(createdPost);

            await createPost(mockReq, mockRes);

            expect(prisma.posts.create).toHaveBeenCalledWith({
                data: {
                    title: 'Test Post',
                    content: longContent,
                    authorId: 'user-123'
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });

        it('should handle special characters in post data', async () => {
            const specialData = {
                title: 'Post with émojis 🚀 and spëcial chars: <>"/\\',
                content: 'Content with\nnewlines\tand\ttabs'
            };
            mockReq.body = specialData;
            postSchema.validate.mockReturnValue({ error: null });

            const createdPost = {
                id: 'post-special',
                ...specialData,
                authorId: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                author: { id: 'user-123', email: 'test@example.com' }
            };
            prisma.posts.create.mockResolvedValue(createdPost);

            await createPost(mockReq, mockRes);

            expect(prisma.posts.create).toHaveBeenCalledWith({
                data: {
                    ...specialData,
                    authorId: 'user-123'
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });
    });
});