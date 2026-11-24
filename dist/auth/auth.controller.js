"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_types_1 = require("./auth.types");
class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    signUp = async (req, res) => {
        res.set("Cache-Control", "no-store");
        const input = auth_types_1.signupSchema.safeParse(req.body);
        if (!input.success) {
            res.status(400).json({ error: "INVALID_SIGNUP_INPUT" });
            return;
        }
        const result = await this.authService.signUp(input.data);
        if (!result) {
            res.status(409).json({ error: "EMAIL_ALREADY_IN_USE" });
            return;
        }
        res.status(201).json(result);
    };
    login = async (req, res) => {
        res.set("Cache-Control", "no-store");
        const input = auth_types_1.loginSchema.safeParse(req.body);
        if (!input.success) {
            res.status(400).json({ error: "INVALID_LOGIN_INPUT" });
            return;
        }
        const result = await this.authService.login(input.data);
        if (!result) {
            res.status(401).json({ error: "INVALID_CREDENTIALS" });
            return;
        }
        res.status(200).json(result);
    };
    getMe = async (_req, res) => {
        res.set("Cache-Control", "no-store");
        const auth = res.locals.auth;
        if (!auth) {
            res.status(401).json({ error: "UNAUTHENTICATED" });
            return;
        }
        const user = await this.authService.getMe(auth.sub);
        if (!user) {
            res.status(404).json({ error: "USER_NOT_FOUND" });
            return;
        }
        res.status(200).json(user);
    };
    logout = async (_req, res) => {
        const auth = res.locals.auth;
        if (!auth) {
            res.status(401).json({ error: "UNAUTHENTICATED" });
            return;
        }
        await this.authService.logout(auth);
        res.status(204).end();
    };
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map