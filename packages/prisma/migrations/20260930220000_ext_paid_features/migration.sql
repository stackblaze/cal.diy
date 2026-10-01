-- CreateTable
CREATE TABLE "ExtWorkflow" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "eventTypeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtWorkflowStep" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtRoutingForm" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "fields" JSONB NOT NULL,
    "routes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtRoutingForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtRoutingFormResponse" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "assignedUserId" INTEGER,
    "assignedTeamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtRoutingFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtWorkflow_userId_idx" ON "ExtWorkflow"("userId");
CREATE INDEX "ExtWorkflow_teamId_idx" ON "ExtWorkflow"("teamId");
CREATE INDEX "ExtWorkflow_eventTypeId_idx" ON "ExtWorkflow"("eventTypeId");
CREATE INDEX "ExtWorkflowStep_workflowId_idx" ON "ExtWorkflowStep"("workflowId");
CREATE INDEX "ExtRoutingForm_userId_idx" ON "ExtRoutingForm"("userId");
CREATE INDEX "ExtRoutingForm_teamId_idx" ON "ExtRoutingForm"("teamId");
CREATE INDEX "ExtRoutingFormResponse_formId_idx" ON "ExtRoutingFormResponse"("formId");

-- AddForeignKey
ALTER TABLE "ExtWorkflowStep" ADD CONSTRAINT "ExtWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ExtWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtRoutingFormResponse" ADD CONSTRAINT "ExtRoutingFormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ExtRoutingForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
