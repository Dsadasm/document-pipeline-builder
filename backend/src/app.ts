import express from 'express';
import cors from 'cors';
import pipelineRoutes from '@src/routes/pipelines';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/pipelines', pipelineRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});