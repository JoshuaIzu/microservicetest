"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = createAuthRoutes;
const express_1 = require("express");
function createAuthRoutes(controller, middleware, signUpLimiter, loginLimiter) {
    const router = (0, express_1.Router)();
    router.post("/signup", signUpLimiter, controller.signUp);
    router.post("/login", loginLimiter, controller.login);
    router.get("/me", middleware.authenticate, controller.getMe);
    router.delete("/logout", middleware.authenticate, controller.logout);
    return router;
}
//# sourceMappingURL=auth.routes.js.map