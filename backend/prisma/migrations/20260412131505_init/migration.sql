/*
  Warnings:

  - A unique constraint covering the columns `[pipelineId,name]` on the table `Node` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Node_pipelineId_name_key" ON "Node"("pipelineId", "name");
