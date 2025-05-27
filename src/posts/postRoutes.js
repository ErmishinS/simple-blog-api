import { Router } from 'express';
import { getAllPosts, getPostById, createPost, updatePost, deletePost } from '../posts/postController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', authenticateToken, createPost);
router.put('/:id', authenticateToken, updatePost);
router.delete('/:id', authenticateToken, deletePost);

export default router;