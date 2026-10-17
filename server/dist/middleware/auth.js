import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        req.tenantId = decoded.tenantId;
        // Verify tenant exists and user belongs to tenant
        const membership = await prisma.membership.findFirst({
            where: {
                userId: decoded.userId,
                tenantId: decoded.tenantId,
            },
            include: {
                tenant: true,
            },
        });
        if (!membership || !membership.tenant.isActive) {
            res.status(403).json({ error: 'Forbidden: Access to this workspace is not permitted or workspace is inactive' });
            return;
        }
        req.userRole = membership.role;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Unauthorized: Token is invalid or has expired' });
        return;
    }
};
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.userRole || !allowedRoles.includes(req.userRole)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions for this action' });
            return;
        }
        next();
    };
};
