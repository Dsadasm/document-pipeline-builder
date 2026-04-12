/*
  Warnings:

  - You are about to drop the column `name` on the `Node` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Node_pipelineId_name_key";

-- AlterTable
ALTER TABLE "Node" DROP COLUMN "name";
