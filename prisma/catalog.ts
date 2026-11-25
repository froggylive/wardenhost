import { PrismaClient } from "@prisma/client";

type PlanRow = [ram: string, cpu: string, disk: string, priceRupees: number];

type CatalogCategory = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  features: string[];
  planPrefix: string;
  plans: PlanRow[];
  cpuPrices: [xeon: number, epyc: number, ryzen: number];
};

const LOCATIONS = "India, United States, Germany, Netherlands, France, United Kingdom, Singapore, Japan, Canada, Finland and Dubai.";

export const catalog: CatalogCategory[] = [
  {
    name: "Dedicated LXC VDS",
    slug: "dedicated-lxc-vds",
    description: "High-performance Dedicated LXC VDS servers powered by enterprise-grade Intel Xeon, AMD EPYC and AMD Ryzen processors. Dedicated CPU resources, enterprise NVMe SSD storage, unmetered bandwidth, up to 2 Gbps dedicated network port, full root access and KVM virtualization.",
    icon: "Cpu",
    image: "/images/category-vds.svg",
    features: ["Dedicated CPU resources", "Enterprise NVMe SSD storage", "Unmetered bandwidth", "Up to 2 Gbps dedicated network port", "Full root access", "KVM virtualization"],
    planPrefix: "LXC VDS Plan",
    cpuPrices: [50, 100, 200],
    plans: [
      ["12GB DDR5 ECC RAM", "4 Dedicated CPU Cores", "200GB NVMe SSD", 250],
      ["16GB DDR5 ECC RAM", "6 Dedicated CPU Cores", "300GB NVMe SSD", 350],
      ["24GB DDR5 ECC RAM", "8 Dedicated CPU Cores", "400GB NVMe SSD", 450],
      ["32GB DDR5 ECC RAM", "10 Dedicated CPU Cores", "500GB NVMe SSD", 550],
      ["40GB DDR5 ECC RAM", "12 Dedicated CPU Cores", "600GB NVMe SSD", 650],
      ["48GB DDR5 ECC RAM", "14 Dedicated CPU Cores", "700GB NVMe SSD", 750],
      ["64GB DDR5 ECC RAM", "16 Dedicated CPU Cores", "800GB NVMe SSD", 850],
      ["72GB DDR5 ECC RAM", "18 Dedicated CPU Cores", "900GB NVMe SSD", 940],
      ["80GB DDR5 ECC RAM", "20 Dedicated CPU Cores", "1TB NVMe SSD", 1140],
      ["96GB DDR5 ECC RAM", "24 Dedicated CPU Cores", "2TB NVMe SSD", 2240],
      ["128GB DDR5 ECC RAM", "32 Dedicated CPU Cores", "3TB NVMe SSD", 3340],
    ],
  },
  {
    name: "Dedicated KVM VDS",
    slug: "dedicated-kvm-vds",
    description: "High-performance Dedicated KVM VDS servers powered by enterprise-grade Intel Xeon, AMD EPYC and AMD Ryzen processors. Dedicated CPU resources, enterprise NVMe SSD storage, unmetered bandwidth, up to 2 Gbps dedicated network port, full root access and KVM virtualization.",
    icon: "Cpu",
    image: "/images/category-vds.svg",
    features: ["Dedicated CPU resources", "Enterprise NVMe SSD storage", "Unmetered bandwidth", "Up to 2 Gbps dedicated network port", "Full root access", "KVM virtualization"],
    planPrefix: "KVM VDS Plan",
    cpuPrices: [50, 100, 200],
    plans: [
      ["12GB DDR5 ECC RAM", "4 Dedicated CPU Cores", "200GB NVMe SSD", 250],
      ["16GB DDR5 ECC RAM", "6 Dedicated CPU Cores", "300GB NVMe SSD", 350],
      ["24GB DDR5 ECC RAM", "8 Dedicated CPU Cores", "400GB NVMe SSD", 450],
      ["32GB DDR5 ECC RAM", "10 Dedicated CPU Cores", "500GB NVMe SSD", 550],
      ["40GB DDR5 ECC RAM", "12 Dedicated CPU Cores", "600GB NVMe SSD", 650],
      ["48GB DDR5 ECC RAM", "14 Dedicated CPU Cores", "700GB NVMe SSD", 750],
      ["64GB DDR5 ECC RAM", "16 Dedicated CPU Cores", "800GB NVMe SSD", 850],
      ["72GB DDR5 ECC RAM", "18 Dedicated CPU Cores", "900GB NVMe SSD", 940],
      ["80GB DDR5 ECC RAM", "20 Dedicated CPU Cores", "1TB NVMe SSD", 1140],
      ["96GB DDR5 ECC RAM", "24 Dedicated CPU Cores", "2TB NVMe SSD", 2240],
      ["128GB DDR5 ECC RAM", "32 Dedicated CPU Cores", "3TB NVMe SSD", 3340],
    ],
  },
  {
    name: "Budget Minecraft",
    slug: "budget-minecraft",
    description: "Premium Minecraft server hosting powered by Intel Xeon, AMD EPYC and AMD Ryzen processors. High-performance CPU allocation, enterprise NVMe SSD storage, unmetered bandwidth, up to 2 Gbps network connectivity, low-latency networking, instant server deployment and 24/7 uptime monitoring.",
    icon: "Gamepad2",
    image: "/images/category-minecraft.svg",
    features: ["High-performance CPU allocation", "Enterprise NVMe SSD storage", "Unmetered bandwidth", "Up to 2 Gbps network connectivity", "Low-latency networking", "Instant server deployment", "24/7 uptime monitoring", "Paper, Purpur, Spigot, Velocity, Fabric, Forge, NeoForge"],
    planPrefix: "Budget MC Plan",
    cpuPrices: [5, 20, 50],
    plans: [
      ["8GB DDR5 RAM", "200% CPU", "30GB NVMe SSD", 50],
      ["10GB DDR5 RAM", "300% CPU", "50GB NVMe SSD", 100],
      ["14GB DDR5 RAM", "400% CPU", "70GB NVMe SSD", 200],
      ["14GB DDR5 RAM", "500% CPU", "90GB NVMe SSD", 300],
      ["15GB DDR5 RAM", "600% CPU", "120GB NVMe SSD", 400],
      ["16GB DDR5 RAM", "800% CPU", "150GB NVMe SSD", 500],
      ["20GB DDR5 RAM", "1000% CPU", "180GB NVMe SSD", 600],
      ["24GB DDR5 RAM", "1200% CPU", "220GB NVMe SSD", 700],
      ["32GB DDR5 RAM", "1400% CPU", "280GB NVMe SSD", 800],
      ["40GB DDR5 RAM", "1600% CPU", "350GB NVMe SSD", 900],
      ["48GB DDR5 RAM", "2000% CPU", "500GB NVMe SSD", 1100],
    ],
  },
  {
    name: "Premium Minecraft",
    slug: "premium-minecraft",
    description: "Premium Minecraft server hosting powered by Intel Xeon, AMD EPYC and AMD Ryzen processors. High-performance CPU allocation, enterprise NVMe SSD storage, unmetered bandwidth, up to 2 Gbps dedicated port, low-latency networking, instant server deployment and DDoS protection.",
    icon: "Gamepad2",
    image: "/images/category-minecraft.svg",
    features: ["High-performance CPU allocation", "Enterprise NVMe SSD storage", "Unmetered bandwidth", "Up to 2 Gbps dedicated port", "Low-latency networking", "Instant server deployment", "DDoS protection", "Paper, Purpur, Spigot, Vanilla, Fabric, Forge, NeoForge and Velocity"],
    planPrefix: "Premium MC Plan",
    cpuPrices: [0, 0, 0],
    plans: [
      ["12GB DDR5 RAM", "400% CPU", "100GB NVMe SSD", 150],
      ["16GB DDR5 RAM", "500% CPU", "150GB NVMe SSD", 250],
      ["20GB DDR5 RAM", "600% CPU", "200GB NVMe SSD", 350],
      ["24GB DDR5 RAM", "800% CPU", "250GB NVMe SSD", 450],
      ["32GB DDR5 RAM", "1000% CPU", "300GB NVMe SSD", 550],
      ["40GB DDR5 RAM", "1200% CPU", "400GB NVMe SSD", 650],
      ["48GB DDR5 RAM", "1400% CPU", "500GB NVMe SSD", 750],
      ["56GB DDR5 RAM", "1600% CPU", "600GB NVMe SSD", 840],
      ["64GB DDR5 RAM", "1800% CPU", "750GB NVMe SSD", 940],
      ["80GB DDR5 RAM", "2000% CPU", "1TB NVMe SSD", 1040],
      ["96GB DDR5 RAM", "2400% CPU", "2TB NVMe SSD", 2140],
    ],
  },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function importCatalog(prisma: PrismaClient) {
  const cpuNames = ["Intel Xeon 6788P", "AMD EPYC 9965", "AMD Ryzen 7 7700X"];
  const cpus = await Promise.all(cpuNames.map((name) => prisma.cpuOption.findUnique({ where: { name } })));

  for (const item of catalog) {
    const category = await prisma.category.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        icon: item.icon,
        image: item.image,
        active: true,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        icon: item.icon,
        image: item.image,
        active: true,
      },
    });

    for (let i = 0; i < item.plans.length; i++) {
      const [ram, cpu, disk, price] = item.plans[i];
      const name = `${item.planPrefix} ${i + 1}`;
      const slug = slugify(name);
      const data = {
        categoryId: category.id,
        name,
        slug,
        ram,
        cpu,
        disk,
        storageType: "NVMe SSD",
        bandwidth: "Unmetered",
        networkSpeed: "Up to 2 Gbps",
        ipv4Count: 1,
        priceCents: price * 100,
        currency: "INR",
        billingPeriod: "monthly",
        shortDescription: item.description.split(".")[0] + ".",
        fullDescription: `${item.description}\n\nHardware: ECC memory where supported · Enterprise NVMe SSD · Up to 2 Gbps network · Unmetered bandwidth.\nAvailable locations: ${LOCATIONS}`,
        orderUrl: `/order/${slug}`,
        active: true,
        inStock: true,
        featured: false,
        displayOrder: i + 1,
      };
      const existing = await prisma.plan.findUnique({ where: { slug } });
      const saved = existing
        ? await prisma.plan.update({ where: { id: existing.id }, data })
        : await prisma.plan.create({ data });
      await prisma.planFeature.deleteMany({ where: { planId: saved.id } });
      await prisma.planFeature.createMany({
        data: item.features.map((text, index) => ({ planId: saved.id, text, displayOrder: index })),
      });
    }

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      if (!cpu) continue;
      await prisma.cpuCategoryPrice.upsert({
        where: { cpuOptionId_categoryId: { cpuOptionId: cpu.id, categoryId: category.id } },
        update: { priceCents: item.cpuPrices[i] * 100 },
        create: { cpuOptionId: cpu.id, categoryId: category.id, priceCents: item.cpuPrices[i] * 100 },
      });
    }
  }

  console.log(`Catalog imported: ${catalog.length} categories, ${catalog.reduce((n, c) => n + c.plans.length, 0)} plans.`);
}
