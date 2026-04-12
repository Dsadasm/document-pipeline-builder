import { prisma } from './prisma.js';
import nodeTypes from '@src/utils/nodeTypes.js'

async function seedNodeTypes() {
    console.log('Seeding node types...\n');

    try {
        for (const nodeType of nodeTypes) {
            const existing = await prisma.nodeType.findUnique({
                where: { name: nodeType.name },
            });

            if (!existing) {
                await prisma.nodeType.create({
                    data: nodeType,
                });
                console.log(`Created: ${nodeType.name}`);
            } else {
                await prisma.nodeType.update({
                    where: { name: nodeType.name },
                    data: {
                        inputDataType: nodeType.inputDataType,
                        outputDataType: nodeType.outputDataType,
                        allowedCycleTarget: nodeType.allowedCycleTarget,
                    },
                });
                console.log(`Updated: ${nodeType.name}`);
            }
        }

        console.log('\nNode types seeded successfully!');
    } catch (error) {
        console.error('Seeding failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run seeder
seedNodeTypes().catch((error) => {
    console.error(error);
    process.exit(1);
});

export { seedNodeTypes };