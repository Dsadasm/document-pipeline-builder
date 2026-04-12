import express from 'express';
import cors from 'cors';
import pipelineRoutes from '@src/routes/pipelines';
import nodeTypeRoutes from '@src/routes/nodeType'

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/nodeType', nodeTypeRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});