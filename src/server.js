import dotenv from 'dotenv';
import express, { json } from 'express';
import cors from 'cors';

dotenv.config()

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json());

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Simple Blog API is running',
    version: '1.0.0'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;