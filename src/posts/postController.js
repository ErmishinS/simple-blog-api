import prisma from '../config/database.js';
import { postSchema, updatePostSchema } from '../utils/validation.js';

export const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.posts.findMany({
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

    res.json({
      status: 'success',
      data: { posts }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.posts.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    res.json({
      status: 'success',
      data: { post }
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

export const createPost = async (req, res) => {
  try {
    const { error } = postSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const { title, content = '' } = req.body;
    const authorId = req.user.id;

    const post = await prisma.posts.create({
      data: {
        title,
        content,
        authorId
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

    res.status(201).json({
      status: 'success',
      data: { post },
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { error } = updatePostSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const existingPost = await prisma.posts.findUnique({
      where: { id }
    });

    if (!existingPost) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    if (existingPost.authorId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own posts'
      });
    }

    const updatedPost = await prisma.posts.update({
      where: { id },
      data: req.body,
      include: {
        author: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { post: updatedPost },
      message: 'Post updated successfully'
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingPost = await prisma.posts.findUnique({
      where: { id }
    });

    if (!existingPost) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    if (existingPost.authorId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own posts'
      });
    }

    await prisma.posts.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};