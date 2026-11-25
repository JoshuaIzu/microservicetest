import express from "express";
import { PrismaClient } from "@demo/reconciliation-db";
import { consume } from "../events/rabbitmq.consumer";
import { createSettlementAuth } from "./settlement.auth";
import { SettlementController } from "./settlement.controller";
import { SettlementRepository } from "./settlement.repository";
import { createSettlementRoutes } from "./settlement.routes";
import { SettlementService } from "./settlement.service";

const url = process.env.AMQP_URL;
const authBaseUrl = process.env.AUTH_BASE_URL;
if (!url || !authBaseUrl || !process.env.RECONCILIATION_DATABASE_URL) {
  throw new Error("AMQP_URL, AUTH_BASE_URL, and RECONCILIATION_DATABASE_URL are required");
}

const db = new PrismaClient();
const repository = new SettlementRepository(db);
const controller = new SettlementController(new SettlementService(repository));
const authenticate = createSettlementAuth(authBaseUrl);

const app = express();
app.use("/demo/settlements", createSettlementRoutes(controller, authenticate));

void consume(url, "reconciliation.events.v1", repository.applyEvent);
app.listen(Number(process.env.RECONCILIATION_PORT ?? 3001));
