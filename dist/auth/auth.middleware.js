"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
class AuthMiddleware {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    authenticate = async (req, res, next) => {
        const token = req.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
        const payload = token ? await this.authService.authenticate(token) : null;
        if (!payload) {
            res.set("WWW-Authenticate", "Bearer");
            res.status(401).json({ error: "UNAUTHENTICATED" });
            return;
        }
        res.locals.auth = payload;
        next();
    };
}
exports.AuthMiddleware = AuthMiddleware;
//# sourceMappingURL=auth.middleware.js.map