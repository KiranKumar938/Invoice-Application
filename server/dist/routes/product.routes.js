import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const productSchema = z.object({
    name: z.string().min(2, 'Product/Service name is required'),
    description: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    hsnSacCode: z.string().min(2, 'HSN/SAC code is required'),
    type: z.enum(['GOODS', 'SERVICE']).default('SERVICE'),
    uom: z.string().default('NOS'),
    unitPrice: z.number().min(0, 'Price must be positive'),
    discount: z.number().min(0).max(100).default(0),
    gstRate: z.number().min(0).max(100).default(18),
    category: z.string().default('General'),
    isActive: z.boolean().default(true),
});
// GET /api/products
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const search = req.query.search?.trim().toLowerCase() || '';
        const where = { tenantId };
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { hsnSacCode: { contains: search } },
                { category: { contains: search } },
            ];
        }
        const products = await prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        res.json(products);
    }
    catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({ error: 'Failed to retrieve products' });
    }
});
// POST /api/products
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const validated = productSchema.parse(req.body);
        const product = await prisma.product.create({
            data: {
                ...validated,
                tenantId,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
            return;
        }
        console.error('Product create error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// PUT /api/products/:id
router.put('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const productId = req.params.id;
        const validated = productSchema.partial().parse(req.body);
        const existing = await prisma.product.findFirst({
            where: { id: productId, tenantId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const updated = await prisma.product.update({
            where: { id: productId },
            data: validated,
        });
        res.json(updated);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.errors[0]?.message || 'Validation error' });
            return;
        }
        console.error('Product update error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// DELETE /api/products/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const productId = req.params.id;
        const existing = await prisma.product.findFirst({
            where: { id: productId, tenantId },
            include: { lineItems: true },
        });
        if (!existing) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const lineItems = existing.lineItems || [];
        if (lineItems.length > 0) {
            res.status(400).json({ error: 'Cannot delete product used in existing invoices. Set status to Inactive instead.' });
            return;
        }
        await prisma.product.delete({ where: { id: productId } });
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Product delete error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
export default router;
