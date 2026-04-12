import { Router } from 'express';
import { prisma } from '@src/db/prisma.js'

const router = Router()

// Get all nodeTypes (list)
router.get('/', async (req, res) => {
    try {
        const nodeTypes = await prisma.nodeType.findMany();

        res.json(nodeTypes.map(n => ({
            name: n.name,
            inputDataType: n.inputDataType,
            outputDataType: n.outputDataType,
            allowedCycleTarget: n.allowedCycleTarget,
        })));
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router