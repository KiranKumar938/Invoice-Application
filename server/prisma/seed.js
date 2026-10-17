"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting Klanvision SaaS database seeding...');
    // 1. Clean existing records in reverse dependency order
    await prisma.paymentAllocation.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoiceLineItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.companySettings.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.user.deleteMany();
    // 2. Create Admin User
    const passwordHash = await bcryptjs_1.default.hash('Password123!', 10);
    const user = await prisma.user.create({
        data: {
            name: 'Mahesh Kumar',
            email: 'admin@klanvision.com',
            passwordHash,
            role: 'ADMIN',
            phone: '+91 98765 43210',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
    });
    // 3. Create Tenant (Klanvision Technologies Pvt. Ltd.)
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Klanvision Technologies',
            legalName: 'Klanvision Technologies Pvt. Ltd.',
            email: 'info@klanvision.com',
            phone: '+91 98765 43210',
            website: 'www.klanvision.com',
            address: 'A-1, 3rd Floor, Gokul Garden, Sector-11, Dwarka',
            city: 'New Delhi',
            state: 'Delhi',
            postalCode: '110075',
            country: 'India',
            gstin: '07AAACC81234F1Z5',
            pan: 'AAACC8123F',
            cin: 'U72900DL2022PTC123456',
        },
    });
    // 4. Create Membership
    await prisma.membership.create({
        data: {
            userId: user.id,
            tenantId: tenant.id,
            role: 'ADMIN',
            isDefault: true,
        },
    });
    // 5. Create Company Settings
    await prisma.companySettings.create({
        data: {
            tenantId: tenant.id,
            currency: 'INR',
            currencySymbol: '₹',
            dateFormat: 'DD/MM/YYYY',
            timeZone: 'Asia/Kolkata',
            defaultPaymentTerms: 30,
            defaultTaxRate: 18.0,
            roundOffEnabled: true,
            invoicePrefix: 'INV-2025-',
            invoiceNumberPadding: 4,
            nextInvoiceNumber: 489,
            bankName: 'HDFC Bank',
            bankAccountNumber: '50200012345678',
            bankIfsc: 'HDFC0001234',
            bankBranch: 'Dwarka Sector 11, New Delhi',
            upiId: 'klanvision@upi',
            enableUpi: true,
            enableNetBanking: true,
            enableCardPayments: false,
            emailNotifications: true,
            smsNotifications: true,
            paymentReminders: true,
            termsAndConditions: '1. Payment is due within 30 days of the invoice date.\n2. Overdue invoices will incur interest of 1.5% per month.\n3. All disputes are subject to New Delhi jurisdiction.',
            notes: 'Thank you for choosing Klanvision Technologies. For billing support, reach out to info@klanvision.com.',
            authorizedSignatory: 'Mahesh Kumar (Director)',
        },
    });
    // 6. Create Products & Services Catalog
    const products = [
        {
            name: 'Custom SaaS Platform Development',
            description: 'End-to-end bespoke web and mobile application engineering with cloud architecture.',
            sku: 'SRV-SAAS-01',
            hsnSacCode: '998314', // IT software consulting
            type: 'SERVICE',
            uom: 'HRS',
            unitPrice: 2500,
            discount: 0,
            gstRate: 18,
            category: 'Software Development',
        },
        {
            name: 'Cloud Hosting & DevOps Maintenance',
            description: 'High availability AWS/GCP cloud management, CI/CD pipelines, and 24x7 monitoring.',
            sku: 'SRV-DEVOPS-02',
            hsnSacCode: '998315',
            type: 'SERVICE',
            uom: 'NOS',
            unitPrice: 35000,
            discount: 5,
            gstRate: 18,
            category: 'Cloud Services',
        },
        {
            name: 'UI/UX Interface Design System',
            description: 'Figma high fidelity prototype, design tokens, interactive design components.',
            sku: 'SRV-UIUX-03',
            hsnSacCode: '998314',
            type: 'SERVICE',
            uom: 'NOS',
            unitPrice: 45000,
            discount: 0,
            gstRate: 18,
            category: 'Design',
        },
        {
            name: 'Enterprise Security Audit & VAPT',
            description: 'Penetration testing, vulnerability assessments, and compliance documentation.',
            sku: 'SRV-SEC-04',
            hsnSacCode: '998316',
            type: 'SERVICE',
            uom: 'NOS',
            unitPrice: 60000,
            discount: 0,
            gstRate: 18,
            category: 'Security',
        },
        {
            name: 'Annual Software Maintenance Contract (AMC)',
            description: 'Quarterly bug fixes, API updates, performance audits, and priority SLA.',
            sku: 'SRV-AMC-05',
            hsnSacCode: '998717',
            type: 'SERVICE',
            uom: 'YEAR',
            unitPrice: 120000,
            discount: 10,
            gstRate: 18,
            category: 'Support',
        },
    ];
    const createdProducts = [];
    for (const p of products) {
        const prod = await prisma.product.create({
            data: {
                ...p,
                tenantId: tenant.id,
            },
        });
        createdProducts.push(prod);
    }
    // 7. Create Customers (matching Screenshots)
    const customersData = [
        {
            name: 'ABC Technologies',
            type: 'BUSINESS',
            email: 'abc@traders.com',
            phone: '+91 98765 43210',
            gstin: '29AABCA1234F1Z5',
            pan: 'AABCA1234F',
            billingAddress: '42, Brigade Tech Gardens, Whitefield',
            billingCity: 'Bengaluru',
            billingState: 'Karnataka',
            billingPostalCode: '560066',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 54600,
            status: 'ACTIVE',
            notes: 'Strategic enterprise client for technology development.',
        },
        {
            name: 'Sri Venkateswara Traders',
            type: 'BUSINESS',
            email: 'sri@lakshmi.com',
            phone: '+91 87654 32109',
            gstin: '36AABCS5678G1Z8',
            pan: 'AABCS5678G',
            billingAddress: '12-4-88, Begumpet Main Road',
            billingCity: 'Hyderabad',
            billingState: 'Telangana',
            billingPostalCode: '500016',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 22400,
            status: 'ACTIVE',
            notes: 'B2B distribution software client.',
        },
        {
            name: 'Tech Solutions Pvt Ltd',
            type: 'BUSINESS',
            email: 'info@greentech.in',
            phone: '+91 91234 56789',
            gstin: '27AACC9876H1Z3',
            pan: 'AACC9876H',
            billingAddress: 'Tower 4, Mindspace SEZ, Airoli',
            billingCity: 'Mumbai',
            billingState: 'Maharashtra',
            billingPostalCode: '400708',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 68750,
            status: 'ACTIVE',
            notes: 'Quarterly billing schedule.',
        },
        {
            name: 'Lakshmi Enterprises',
            type: 'BUSINESS',
            email: 'royal@enterprises.com',
            phone: '+91 99887 76655',
            gstin: '33AABCR4321J1Z6',
            pan: 'AABCR4321J',
            billingAddress: '88, Mount Road, T. Nagar',
            billingCity: 'Chennai',
            billingState: 'Tamil Nadu',
            billingPostalCode: '600017',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 18900,
            status: 'ACTIVE',
            notes: 'Retail software infrastructure client.',
        },
        {
            name: 'Kiran Services',
            type: 'BUSINESS',
            email: 'kiran@services.com',
            phone: '+91 97112 33445',
            gstin: '07AABCK1122L1Z4',
            pan: 'AABCK1122L',
            billingAddress: '15, Connaught Place, Inner Circle',
            billingCity: 'New Delhi',
            billingState: 'Delhi',
            billingPostalCode: '110001',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 0,
            status: 'ACTIVE',
            notes: 'Intra-state client in Delhi (CGST + SGST applied).',
        },
        {
            name: 'XYZ Ltd.',
            type: 'BUSINESS',
            email: 'billing@xyzltd.com',
            phone: '+91 98101 22334',
            gstin: '07AAACX9988Y1Z9',
            pan: 'AAACX9988Y',
            billingAddress: 'Plot 10, Okhla Industrial Area Phase 3',
            billingCity: 'New Delhi',
            billingState: 'Delhi',
            billingPostalCode: '110020',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 18500,
            status: 'ACTIVE',
            notes: 'Pending April invoice.',
        },
        {
            name: 'Global Tech',
            type: 'BUSINESS',
            email: 'accounts@globaltech.com',
            phone: '+91 98123 44556',
            gstin: '06AABCG5544K1Z1',
            pan: 'AABCG5544K',
            billingAddress: 'DLF Cyber City, Sector 24',
            billingCity: 'Gurugram',
            billingState: 'Haryana',
            billingPostalCode: '122002',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 0,
            status: 'ACTIVE',
            notes: 'Annual support agreement.',
        },
        {
            name: 'Creative Solutions',
            type: 'BUSINESS',
            email: 'contact@creativesolutions.com',
            phone: '+91 98223 34455',
            gstin: '27AABCC4433D1Z8',
            pan: 'AABCC4433D',
            billingAddress: 'Senapati Bapat Road',
            billingCity: 'Pune',
            billingState: 'Maharashtra',
            billingPostalCode: '411016',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 8000,
            status: 'ACTIVE',
            notes: 'Overdue invoice since May 2025.',
        },
        {
            name: 'PQR Solutions',
            type: 'BUSINESS',
            email: 'pqr@solutions.in',
            phone: '+91 99112 23344',
            gstin: '07AABCP3322M1Z2',
            pan: 'AABCP3322M',
            billingAddress: 'Netaji Subhash Place, Pitampura',
            billingCity: 'New Delhi',
            billingState: 'Delhi',
            billingPostalCode: '110034',
            billingCountry: 'India',
            openingBalance: 0,
            currentOutstanding: 8000,
            status: 'ACTIVE',
            notes: 'Overdue invoice.',
        },
    ];
    const createdCustomers = {};
    for (const c of customersData) {
        const cust = await prisma.customer.create({
            data: {
                ...c,
                tenantId: tenant.id,
            },
        });
        createdCustomers[c.name] = cust;
    }
    // 8. Create Invoices (matching exact numbers in Screenshots 2 & 4)
    // Total Invoices: 12 (Paid: 8, Pending: 2, Overdue: 2)
    // Total Sales / Total Amount: ₹ 1,85,000.00
    // Total Tax: ₹ 18,500.00 (taxable ₹ 1,66,500.00 or with items)
    const invoicesData = [
        {
            number: 'INV-2025-0012',
            customer: 'ABC Technologies',
            issueDate: new Date('2025-05-05'),
            dueDate: new Date('2025-06-05'),
            subtotal: 67567.57,
            taxableAmount: 67567.57,
            gstRate: 11.0, // Or 75,000 gross
            taxTotal: 7432.43,
            totalAmount: 75000.0,
            paidAmount: 75000.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'Custom SaaS Platform Development - Milestone 3',
            hsn: '998314',
            qty: 30,
            unitPrice: 2252.25,
            isInterState: true,
        },
        {
            number: 'INV-2025-0011',
            customer: 'XYZ Ltd.',
            issueDate: new Date('2025-05-04'),
            dueDate: new Date('2025-06-04'),
            subtotal: 16666.67,
            taxableAmount: 16666.67,
            taxTotal: 1833.33,
            totalAmount: 18500.0,
            paidAmount: 0.0,
            outstandingAmount: 18500.0,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            itemDesc: 'Cloud Hosting & DevOps Maintenance - Monthly Plan',
            hsn: '998315',
            qty: 1,
            unitPrice: 16666.67,
            isInterState: false, // Intra-state Delhi
        },
        {
            number: 'INV-2025-0010',
            customer: 'Global Tech',
            issueDate: new Date('2025-05-03'),
            dueDate: new Date('2025-06-03'),
            subtotal: 10810.81,
            taxableAmount: 10810.81,
            taxTotal: 1189.19,
            totalAmount: 12000.0,
            paidAmount: 12000.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'Security Consulting & API Gateway Configuration',
            hsn: '998316',
            qty: 1,
            unitPrice: 10810.81,
            isInterState: true,
        },
        {
            number: 'INV-2025-0009',
            customer: 'Creative Solutions',
            issueDate: new Date('2025-04-01'),
            dueDate: new Date('2025-05-01'), // Already overdue
            subtotal: 7207.21,
            taxableAmount: 7207.21,
            taxTotal: 792.79,
            totalAmount: 8000.0,
            paidAmount: 0.0,
            outstandingAmount: 8000.0,
            status: 'OVERDUE',
            paymentStatus: 'UNPAID',
            itemDesc: 'Frontend Performance Tuning & Responsive Polish',
            hsn: '998314',
            qty: 1,
            unitPrice: 7207.21,
            isInterState: true,
        },
        {
            number: 'INV-2025-0008',
            customer: 'XYZ Ltd.',
            issueDate: new Date('2025-04-10'),
            dueDate: new Date('2025-05-10'),
            subtotal: 13513.51,
            taxableAmount: 13513.51,
            taxTotal: 1486.49,
            totalAmount: 15000.0,
            paidAmount: 15000.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'Server Infrastructure Setup',
            hsn: '998315',
            qty: 1,
            unitPrice: 13513.51,
            isInterState: false,
        },
        {
            number: 'INV-2025-0007',
            customer: 'PQR Solutions',
            issueDate: new Date('2025-03-25'),
            dueDate: new Date('2025-04-25'), // Overdue
            subtotal: 7207.21,
            taxableAmount: 7207.21,
            taxTotal: 792.79,
            totalAmount: 8000.0,
            paidAmount: 0.0,
            outstandingAmount: 8000.0,
            status: 'OVERDUE',
            paymentStatus: 'UNPAID',
            itemDesc: 'Database Optimization & Query Profiling',
            hsn: '998314',
            qty: 1,
            unitPrice: 7207.21,
            isInterState: false,
        },
        {
            number: 'INV-2025-0006',
            customer: 'ABC Technologies',
            issueDate: new Date('2025-04-15'),
            dueDate: new Date('2025-05-15'),
            subtotal: 10810.81,
            taxableAmount: 10810.81,
            taxTotal: 1189.19,
            totalAmount: 12000.0,
            paidAmount: 12000.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'Design System & Figma Component Library',
            hsn: '998314',
            qty: 1,
            unitPrice: 10810.81,
            isInterState: true,
        },
        {
            number: 'INV-2025-0005',
            customer: 'Sri Venkateswara Traders',
            issueDate: new Date('2025-04-20'),
            dueDate: new Date('2025-05-20'),
            subtotal: 9009.01,
            taxableAmount: 9009.01,
            taxTotal: 990.99,
            totalAmount: 10000.0,
            paidAmount: 10000.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'API Integration & Payment Gateway Setup',
            hsn: '998314',
            qty: 1,
            unitPrice: 9009.01,
            isInterState: true,
        },
        {
            number: 'INV-2025-0004',
            customer: 'Tech Solutions Pvt Ltd',
            issueDate: new Date('2025-04-22'),
            dueDate: new Date('2025-05-22'),
            subtotal: 7207.21,
            taxableAmount: 7207.21,
            taxTotal: 792.79,
            totalAmount: 8000.0,
            paidAmount: 8000.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'Code Audit & Vulnerability Assessment',
            hsn: '998316',
            qty: 1,
            unitPrice: 7207.21,
            isInterState: true,
        },
        {
            number: 'INV-2025-0003',
            customer: 'Lakshmi Enterprises',
            issueDate: new Date('2025-04-25'),
            dueDate: new Date('2025-05-25'),
            subtotal: 6306.31,
            taxableAmount: 6306.31,
            taxTotal: 693.69,
            totalAmount: 7000.0,
            paidAmount: 7000.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'POS Terminal Sync & Webhook Handlers',
            hsn: '998314',
            qty: 1,
            unitPrice: 6306.31,
            isInterState: true,
        },
        {
            number: 'INV-2025-0002',
            customer: 'Kiran Services',
            issueDate: new Date('2025-04-28'),
            dueDate: new Date('2025-05-28'),
            subtotal: 6756.76,
            taxableAmount: 6756.76,
            taxTotal: 743.24,
            totalAmount: 7500.0,
            paidAmount: 7500.0,
            outstandingAmount: 0.0,
            status: 'PAID',
            paymentStatus: 'PAID',
            itemDesc: 'Email Template Automation & CRM Integration',
            hsn: '998314',
            qty: 1,
            unitPrice: 6756.76,
            isInterState: false,
        },
        {
            number: 'INV-2025-0001',
            customer: 'Sri Venkateswara Traders',
            issueDate: new Date('2025-04-29'),
            dueDate: new Date('2025-05-29'),
            subtotal: 3603.60,
            taxableAmount: 3603.60,
            taxTotal: 396.40,
            totalAmount: 4000.0,
            paidAmount: 0.0,
            outstandingAmount: 4000.0,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            itemDesc: 'SSL Certificate Setup & Domain Redirection',
            hsn: '998315',
            qty: 1,
            unitPrice: 3603.60,
            isInterState: true,
        },
    ];
    for (const inv of invoicesData) {
        const cust = createdCustomers[inv.customer];
        const createdInv = await prisma.invoice.create({
            data: {
                tenantId: tenant.id,
                customerId: cust.id,
                invoiceNumber: inv.number,
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
                status: inv.status,
                paymentStatus: inv.paymentStatus,
                isInterState: inv.isInterState,
                subtotal: inv.subtotal,
                discountTotal: 0,
                taxableAmount: inv.taxableAmount,
                taxTotal: inv.taxTotal,
                cgstTotal: inv.isInterState ? 0 : inv.taxTotal / 2,
                sgstTotal: inv.isInterState ? 0 : inv.taxTotal / 2,
                igstTotal: inv.isInterState ? inv.taxTotal : 0,
                roundOff: 0,
                totalAmount: inv.totalAmount,
                paidAmount: inv.paidAmount,
                outstandingAmount: inv.outstandingAmount,
                createdById: user.id,
                notes: 'Payment via NEFT/RTGS or UPI is preferred.',
                terms: 'Payment due within 30 days.',
            },
        });
        // Create line item
        await prisma.invoiceLineItem.create({
            data: {
                invoiceId: createdInv.id,
                productId: createdProducts[0].id,
                description: inv.itemDesc,
                hsnSacCode: inv.hsn,
                quantity: inv.qty,
                unitPrice: inv.unitPrice,
                discountPercent: 0,
                discountAmount: 0,
                taxableAmount: inv.taxableAmount,
                gstRate: 10.0,
                cgstAmount: inv.isInterState ? 0 : inv.taxTotal / 2,
                sgstAmount: inv.isInterState ? 0 : inv.taxTotal / 2,
                igstAmount: inv.isInterState ? inv.taxTotal : 0,
                totalAmount: inv.totalAmount,
            },
        });
        // If paid, create payment record
        if (inv.paidAmount > 0) {
            const pmt = await prisma.payment.create({
                data: {
                    tenantId: tenant.id,
                    customerId: cust.id,
                    invoiceId: createdInv.id,
                    paymentNumber: `PMT-${inv.number.replace('INV-', '')}`,
                    paymentDate: new Date(inv.issueDate.getTime() + 86400000 * 2),
                    amount: inv.paidAmount,
                    paymentMethod: 'BANK_TRANSFER',
                    transactionReference: `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                    status: 'SUCCESS',
                    notes: 'Settled via RTGS/NEFT transaction.',
                },
            });
            await prisma.paymentAllocation.create({
                data: {
                    paymentId: pmt.id,
                    invoiceId: createdInv.id,
                    amount: inv.paidAmount,
                },
            });
        }
    }
    // 9. Create Activities & Notifications (matching Screenshot 4 activity feed)
    const activities = [
        {
            action: 'PAYMENT_RECEIVED',
            entityType: 'PAYMENT',
            details: 'Payment received from ABC Traders: ₹ 75,000.00 (INV-2025-0012)',
            createdAt: new Date('2025-05-05T10:24:00Z'),
        },
        {
            action: 'INVOICE_CREATED',
            entityType: 'INVOICE',
            details: 'New invoice created: INV-2025-0013 for XYZ Ltd.',
            createdAt: new Date('2025-05-04T16:32:00Z'),
        },
        {
            action: 'PAYMENT_RECEIVED',
            entityType: 'PAYMENT',
            details: 'Payment received from Global Tech: ₹ 12,000.00 (INV-2025-0010)',
            createdAt: new Date('2025-05-03T11:15:00Z'),
        },
        {
            action: 'INVOICE_OVERDUE',
            entityType: 'INVOICE',
            details: 'Invoice overdue: INV-2025-0008 • PQR Solutions',
            createdAt: new Date('2025-05-02T09:48:00Z'),
        },
        {
            action: 'SETTINGS_UPDATED',
            entityType: 'SETTINGS',
            details: 'Settings updated: Company details & GST information',
            createdAt: new Date('2025-05-01T14:16:00Z'),
        },
    ];
    for (const act of activities) {
        await prisma.auditLog.create({
            data: {
                tenantId: tenant.id,
                userId: user.id,
                action: act.action,
                entityType: act.entityType,
                details: act.details,
                createdAt: act.createdAt,
            },
        });
    }
    // Notifications
    const notifications = [
        {
            title: 'Payment Received',
            message: '₹ 75,000.00 received from ABC Traders for INV-2025-0012.',
            type: 'SUCCESS',
            isRead: false,
        },
        {
            title: 'Invoice Due Tomorrow',
            message: 'INV-2025-0011 for XYZ Ltd. is due tomorrow.',
            type: 'WARNING',
            isRead: false,
        },
        {
            title: 'GST Return Filing Reminder',
            message: 'GSTR-1 filing deadline is approaching on 11th May.',
            type: 'INFO',
            isRead: false,
        },
    ];
    for (const n of notifications) {
        await prisma.notification.create({
            data: {
                ...n,
                tenantId: tenant.id,
                userId: user.id,
            },
        });
    }
    console.log('✅ Database seeded successfully with Klanvision business data!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
