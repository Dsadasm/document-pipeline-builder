/*
  Warnings:

  - A unique constraint covering the columns `[pipelineId,fromNodeId,toNodeId]` on the table `Edge` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Edge_pipelineId_fromNodeId_toNodeId_key" ON "Edge"("pipelineId", "fromNodeId", "toNodeId");
