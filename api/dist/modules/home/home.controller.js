"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomePage = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const home_service_1 = require("./home.service");
function parseFeaturedLimit(request) {
    const limitParam = request.query.featuredLimit;
    if (typeof limitParam === "string") {
        const parsedLimit = Number.parseInt(limitParam, 10);
        if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
            return parsedLimit;
        }
    }
    return undefined;
}
exports.getHomePage = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const featuredLimit = parseFeaturedLimit(req);
    const data = await (0, home_service_1.getHomePageData)(featuredLimit);
    res.json({ data });
});
