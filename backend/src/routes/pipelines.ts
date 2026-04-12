import { Router } from 'express';
import { prisma } from '@src/db/prisma.js'
import ValidationEngine from '@src/validation/ValidationEngine.js'

const router = Router()

// Save or update pipeline
router.post('/', async (req, res) => {
    try {
        const { id, name, nodes, edges } = req.body ?? {};

        if (!name || !Array.isArray(nodes) || !Array.isArray(edges)) {
            return res.status(400).json({ error: 'Invalid payload: name, nodes and edges are required' });
        }

        const nodeTypes = await prisma.nodeType.findMany();
        for (const n of nodes) {
            // Check if node type exists in nodeTypes            
            const typeExists = nodeTypes.some(nt => nt.name === n.type);
            if (!typeExists) {
                return res.status(400).json({ error: `Node type ${n.type} not found for node ${n.id}` });
            }
        }

        const validation = ValidationEngine.validatePipeline(nodes, edges, nodeTypes);
        if (!validation.valid) {
            return res.status(400).json({ errors: validation.errors });
        }

        if (id && id !== '') {
            const existing = await prisma.pipeline.findUnique({ where: { id } });
            if (!existing) {
                return res.status(400).json({ message: 'Pipeline not found', id: id })
            }

            const pipelineId = id;
            await prisma.$transaction([
                prisma.edge.deleteMany({ where: { pipelineId } }),
                prisma.node.deleteMany({ where: { pipelineId } }),
                prisma.pipeline.update({ where: { id: pipelineId }, data: { name } }),
                prisma.node.createMany({ data: nodes.map((n: any) => ({ id: n.id, pipelineId, type: n.type, positionX: n.positionX ?? 0, positionY: n.positionY ?? 0 })) }),
                prisma.edge.createMany({ data: edges.map((e: any) => ({ pipelineId, fromNodeId: e.fromNodeId, toNodeId: e.toNodeId })) })
            ]);

            return res.json({ message: 'Pipeline updated', id: pipelineId });
        }

        // create new pipeline
        const pipeline = await prisma.pipeline.create({ data: { name } });
        const pipelineId = pipeline.id;

        await prisma.$transaction([
            prisma.node.createMany({ data: nodes.map((n: any) => ({ id: n.id, pipelineId, type: n.type, positionX: n.positionX ?? 0, positionY: n.positionY ?? 0 })) }),
            prisma.edge.createMany({ data: edges.map((e: any) => ({ pipelineId, fromNodeId: e.fromNodeId, toNodeId: e.toNodeId })) })
        ]);

        return res.status(201).json({ message: 'Pipeline created', id: pipelineId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get pipeline by ID
router.get('/:id', async (req, res) => {
    try {
        const pipeline = await prisma.pipeline.findUnique({
            where: { id: req.params.id },
            include: { nodes: true, edges: true }
        });

        if (!pipeline) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }

        res.json({
            id: pipeline.id,
            name: pipeline.name,
            nodes: pipeline.nodes.map(n => ({
                id: n.id,
                type: n.type,
                position: { x: n.positionX, y: n.positionY }
            })),
            edges: pipeline.edges.map(e => ({
                id: e.id,
                fromNodeId: e.fromNodeId,
                toNodeId: e.toNodeId
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all pipelines (list)
router.get('/', async (req, res) => {
    try {
        const pipelines = await prisma.pipeline.findMany({
            include: { nodes: true, edges: true },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(pipelines.map(p => ({
            id: p.id,
            name: p.name,
            nodeCount: p.nodes.length,
            edgeCount: p.edges.length,
            updatedAt: p.updatedAt
        })));
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete pipeline
router.delete('/:id', async (req, res) => {
    try {
        await prisma.pipeline.delete({ where: { id: req.params.id } });
        res.json({ message: 'Pipeline deleted' });
    } catch (error) {
        res.status(404).json({ error: 'Pipeline not found' });
    }
});

export default router