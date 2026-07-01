import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // =====================
  // 1. Users
  // =====================
  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@example.com",
      password,
      role: "ADMIN",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      name: "User",
      email: "user@example.com",
      password,
      role: "USER",
    },
  });

  console.log(`✅ Users created: ${admin.email}, ${user.email}`);

  // =====================
  // 2. Customers
  // =====================
  const customersData = [
    { name: "PT Maju Jaya", email: "majujaya@example.com", phone: "081234567890", address: "Jl. Sudirman No. 10, Jakarta" },
    { name: "CV Berkah Sejahtera", email: "berkah@example.com", phone: "081234567891", address: "Jl. Thamrin No. 25, Jakarta" },
    { name: "UD Sukses Makmur", email: "sukses@example.com", phone: "081234567892", address: "Jl. Gatot Subroto No. 5, Bandung" },
    { name: "PT Sentosa Abadi", email: "sentosa@example.com", phone: "081234567893", address: "Jl. Diponegoro No. 15, Surabaya" },
    { name: "CV Jaya Utama", email: "jaya@example.com", phone: "081234567894", address: "Jl. Pemuda No. 30, Semarang" },
  ];

  const customers = [];
  for (const data of customersData) {
    const customer = await prisma.customer.upsert({
      where: { email: data.email },
      update: {},
      create: data,
    });
    customers.push(customer);
  }

  console.log(`✅ Customers created: ${customers.length} customers`);

  // =====================
  // 3. Invoices with Items
  // =====================
  const currentYear = new Date().getFullYear();
  const invoicesData = [
    {
      invoiceNumber: `INV-${currentYear}-0001`,
      status: "PAID" as const,
      dueDate: new Date("2026-06-15"),
      paidDate: new Date("2026-06-10"),
      customerId: customers[0].id,
      notes: "Pembayaran project phase 1",
      items: [
        { itemName: "Website Development", description: "Pembuatan website company profile", quantityAmount: 1, unitPrice: 15000000 },
        { itemName: "Domain & Hosting 1 Tahun", description: "Domain .com + hosting 1GB", quantityAmount: 1, unitPrice: 500000 },
      ],
    },
    {
      invoiceNumber: `INV-${currentYear}-0002`,
      status: "PENDING" as const,
      dueDate: new Date("2026-07-15"),
      customerId: customers[1].id,
      notes: "Pembayaran konsultasi IT",
      items: [
        { itemName: "IT Consulting", description: "Konsultasi infrastruktur IT", quantityAmount: 10, unitPrice: 500000 },
        { itemName: "Network Setup", description: "Setup jaringan kantor", quantityAmount: 1, unitPrice: 2000000 },
      ],
    },
    {
      invoiceNumber: `INV-${currentYear}-0003`,
      status: "DRAFT" as const,
      dueDate: new Date("2026-07-30"),
      customerId: customers[2].id,
      notes: "Belum dikirim ke client",
      items: [
        { itemName: "Mobile App Development", description: "Aplikasi Android & iOS", quantityAmount: 1, unitPrice: 25000000 },
      ],
    },
    {
      invoiceNumber: `INV-${currentYear}-0004`,
      status: "OVERDUE" as const,
      dueDate: new Date("2026-05-01"),
      customerId: customers[3].id,
      notes: "Sudah melewati jatuh tempo",
      items: [
        { itemName: "Maintenance Server", description: "Maintenance bulanan server", quantityAmount: 3, unitPrice: 750000 },
        { itemName: "Backup Service", description: "Layanan backup mingguan", quantityAmount: 3, unitPrice: 200000 },
      ],
    },
    {
      invoiceNumber: `INV-${currentYear}-0005`,
      status: "PENDING" as const,
      dueDate: new Date("2026-07-20"),
      customerId: customers[4].id,
      notes: "Menunggu konfirmasi pembayaran",
      items: [
        { itemName: "UI/UX Design", description: "Desain aplikasi web", quantityAmount: 1, unitPrice: 8000000 },
        { itemName: "Prototype", description: "Prototype interaktif Figma", quantityAmount: 1, unitPrice: 3000000 },
      ],
    },
  ];

  for (const invoiceData of invoicesData) {
    const { items, ...invoiceFields } = invoiceData;

    // Hitung amounts
    const itemsWithTotal = items.map((item) => ({
      ...item,
      lineTotal: item.quantityAmount * item.unitPrice,
    }));
    const subtotalAmount = itemsWithTotal.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = Math.round(subtotalAmount * 0.11); // PPN 11%
    const discountAmount = 0;
    const totalAmount = subtotalAmount + taxAmount - discountAmount;

    await prisma.invoice.upsert({
      where: { invoiceNumber: invoiceFields.invoiceNumber },
      update: {},
      create: {
        ...invoiceFields,
        subtotalAmount,
        taxAmount,
        discountAmount,
        totalAmount,
        createdById: admin.id,
        items: {
          create: itemsWithTotal.map(({ itemName, description, quantityAmount, unitPrice, lineTotal }) => ({
            itemName,
            description,
            quantityAmount,
            unitPrice,
            lineTotal,
          })),
        },
      },
    });
  }

  console.log(`✅ Invoices created: ${invoicesData.length} invoices with items`);
  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
