import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  CreateDriverBody,
  CreateLeadBody,
  CreateListingBody,
  CreateQuotationBody,
  CreateRatingBody,
  CreateVehicleBody,
  LoginBody,
  RegisterBody,
  UpdateCustomerProfileBody,
  UpdateDriverBody,
  UpdateLeadBody,
  UpdateListingBody,
  UpdateProviderProfileBody,
  UpdateQuotationBody,
  UpdateVehicleBody,
} from "@workspace/api-zod";
import { db, customers, drivers, leads, listings, providers, quotations, ratings, users, vehicles } from "@workspace/db";
import { getTokenUser, requireAuth, requireRole, signToken, type SessionUser } from "../lib/auth";

const router: IRouter = Router();
const id = () => randomUUID();
const asNumber = (value: string | number | null | undefined) => Number(value ?? 0);
const iso = (value: Date | string | null | undefined) => value ? new Date(value).toISOString() : new Date().toISOString();
const routeId = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

function publicUser(user: typeof users.$inferSelect) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: iso(user.createdAt) };
}

async function providerForUser(userId: string) {
  const rows = await db.select().from(providers).where(eq(providers.userId, userId)).limit(1);
  return rows[0];
}

async function customerForUser(userId: string) {
  const rows = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
  return rows[0];
}

function sessionFromUser(user: typeof users.$inferSelect): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role as SessionUser["role"] };
}

async function listingRows(filters: {
  source?: string;
  destination?: string;
  vehicleType?: string;
  minSeats?: number;
  maxPrice?: number;
  sort?: string;
}) {
  const conditions = [eq(listings.status, "ACTIVE")];
  if (filters.source) conditions.push(ilike(listings.source, `%${filters.source}%`));
  if (filters.destination) conditions.push(ilike(listings.destination, `%${filters.destination}%`));
  if (filters.vehicleType) conditions.push(ilike(listings.vehicleType, `%${filters.vehicleType}%`));
  if (filters.minSeats) conditions.push(sql`${vehicles.seatingCapacity} >= ${filters.minSeats}`);
  if (filters.maxPrice !== undefined) conditions.push(sql`${listings.price} <= ${filters.maxPrice}`);
  const rows = await db
    .select({
      listing: listings,
      vehicle: vehicles,
      provider: providers,
      providerUser: users,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .innerJoin(providers, eq(listings.providerId, providers.id))
    .innerJoin(users, eq(providers.userId, users.id))
    .where(and(...conditions))
    .orderBy(
      filters.sort === "price_desc" ? desc(listings.price)
      : filters.sort === "price_asc" ? asc(listings.price)
      : desc(listings.createdAt),
    );
  return rows.map(({ listing, vehicle, provider, providerUser }) => ({
    id: listing.id,
    providerId: listing.providerId,
    vehicleId: listing.vehicleId,
    title: listing.title,
    description: listing.description,
    vehicleType: listing.vehicleType,
    source: listing.source,
    destination: listing.destination,
    price: asNumber(listing.price),
    status: listing.status,
    seatingCapacity: vehicle.seatingCapacity,
    providerName: providerUser.name,
    companyName: provider.companyName,
    imageUrl: vehicle.imageUrl,
    rating: 4.8,
  }));
}

async function quotationRows(where?: ReturnType<typeof eq>) {
  const query = db
    .select({ quotation: quotations, provider: providers, providerUser: users })
    .from(quotations)
    .innerJoin(providers, eq(quotations.providerId, providers.id))
    .innerJoin(users, eq(providers.userId, users.id));
  const rows = where ? await query.where(where) : await query;
  return rows.map(({ quotation, provider, providerUser }) => ({
    id: quotation.id,
    leadId: quotation.leadId,
    providerId: quotation.providerId,
    price: asNumber(quotation.price),
    message: quotation.message,
    status: quotation.status,
    providerName: providerUser.name,
    companyName: provider.companyName,
    createdAt: iso(quotation.createdAt),
  }));
}

async function leadRow(leadId: string) {
  const rows = await db
    .select({ lead: leads, customer: customers, customerUser: users })
    .from(leads)
    .innerJoin(customers, eq(leads.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .where(eq(leads.id, leadId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const leadQuotes = await quotationRows(eq(quotations.leadId, leadId));
  return {
    id: row.lead.id,
    customerId: row.lead.customerId,
    source: row.lead.source,
    destination: row.lead.destination,
    travelDate: row.lead.travelDate,
    passengers: row.lead.passengers,
    vehicleType: row.lead.vehicleType,
    requirements: row.lead.requirements,
    status: row.lead.status,
    createdAt: iso(row.lead.createdAt),
    customerName: row.customerUser.name,
    quotationCount: leadQuotes.length,
    quotations: leadQuotes,
  };
}

router.post("/auth/register", async (req, res) => {
  try {
    const input = RegisterBody.parse(req.body);
    if (input.role === "CUSTOMER" && !input.aadharId?.trim()) {
      return res.status(400).json({ error: "Aadhar ID proof is required for customer registration" });
    }
    if (input.role === "PROVIDER") {
      const companyName = input.companyName?.trim();
      const regNumber = input.companyRegistrationNumber?.trim();
      const gstNumber = input.gstNumber?.trim().toUpperCase();
      const companyAddress = (input.companyAddress || (input as any).address)?.trim();
      const city = input.city?.trim();
      const state = input.state?.trim();
      const pincode = input.pincode?.trim();
      const ownerName = input.ownerName?.trim();
      const ownerEmail = input.ownerEmail?.trim().toLowerCase();
      const ownerPhone = input.ownerPhone?.trim();
      const ownerDob = input.ownerDob?.trim();
      const kycType = input.kycType?.trim();
      const kycNumber = input.kycNumber?.trim();

      if (!companyName) return res.status(400).json({ error: "Company name is required" });
      if (!regNumber) return res.status(400).json({ error: "Company registration number is required" });
      if (!gstNumber) return res.status(400).json({ error: "GST number is required" });
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(gstNumber)) {
        return res.status(400).json({ error: "Invalid GST number format (must be 15-character GSTIN)" });
      }
      if (!companyAddress) return res.status(400).json({ error: "Company address is required" });
      if (!city) return res.status(400).json({ error: "City is required" });
      if (!state) return res.status(400).json({ error: "State is required" });
      if (!pincode) return res.status(400).json({ error: "Pincode is required" });
      if (!/^\d{6}$/.test(pincode)) {
        return res.status(400).json({ error: "Pincode must be 6 digits" });
      }

      if (!ownerName) return res.status(400).json({ error: "Owner name is required" });
      if (!ownerEmail) return res.status(400).json({ error: "Owner email is required" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
        return res.status(400).json({ error: "Invalid owner email format" });
      }
      if (!ownerPhone) return res.status(400).json({ error: "Owner phone number is required" });
      if (!/^\+?[0-9\s-]{8,15}$/.test(ownerPhone)) {
        return res.status(400).json({ error: "Invalid owner phone format" });
      }
      if (!ownerDob) return res.status(400).json({ error: "Owner date of birth is required" });

      if (!kycType) return res.status(400).json({ error: "KYC ID type is required" });
      if (!kycNumber) return res.status(400).json({ error: "KYC ID number is required" });

      if (kycType === "Aadhaar" && !/^\d{4}\s?\d{4}\s?\d{4}$/.test(kycNumber) && !/^\d{12}$/.test(kycNumber)) {
        return res.status(400).json({ error: "Aadhaar ID must be 12 digits" });
      }
      if (kycType === "PAN" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(kycNumber)) {
        return res.status(400).json({ error: "PAN ID must be in valid format (e.g. ABCDE1234F)" });
      }

      const existingCompany = await db.select().from(providers).where(eq(providers.companyRegistrationNumber, regNumber)).limit(1);
      if (existingCompany[0]) {
        return res.status(409).json({ error: "Company Registration Number already registered" });
      }
    }

    const existing = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
    if (existing[0]) return res.status(409).json({ error: "An account with that email already exists" });
    const userId = id();
    const passwordHash = await bcrypt.hash(input.password, 10);
    await db.transaction(async (tx) => {
      await tx.insert(users).values({ id: userId, name: input.name, email: input.email.toLowerCase(), phone: input.phone, passwordHash, role: input.role });
      if (input.role === "CUSTOMER") await tx.insert(customers).values({ id: id(), userId, aadharId: input.aadharId });
      if (input.role === "PROVIDER") {
        await tx.insert(providers).values({
          id: id(),
          userId,
          companyName: input.companyName?.trim() || `${input.name} Travels`,
          companyRegistrationNumber: input.companyRegistrationNumber?.trim(),
          gstNumber: input.gstNumber?.trim().toUpperCase(),
          address: (input.companyAddress || (input as any).address)?.trim(),
          city: input.city?.trim(),
          state: input.state?.trim(),
          pincode: input.pincode?.trim(),
          ownerName: input.ownerName?.trim(),
          ownerEmail: input.ownerEmail?.trim().toLowerCase(),
          ownerPhone: input.ownerPhone?.trim(),
          ownerDob: input.ownerDob?.trim(),
          kycType: input.kycType?.trim(),
          kycNumber: input.kycNumber?.trim(),
        });
      }
    });
    const created = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!created) return res.status(500).json({ error: "Unable to create account" });
    res.status(201).json({ token: signToken(sessionFromUser(created)), user: publicUser(created) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid registration" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const input = LoginBody.parse(req.body);
    const found = (await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1))[0];
    if (!found || !(await bcrypt.compare(input.password, found.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.json({ token: signToken(sessionFromUser(found)), user: publicUser(found) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid login" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const found = (await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1))[0];
  if (!found) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(found));
});

router.get("/profiles/customer", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const user = (await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1))[0];
  const profile = await customerForUser(req.user!.id);
  if (!user || !profile) return res.status(404).json({ error: "Customer profile not found" });
  res.json({ ...publicUser(user), preferences: profile.preferences, city: profile.city, aadharId: profile.aadharId });
});

router.put("/profiles/customer", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const input = UpdateCustomerProfileBody.parse(req.body);
    const userId = req.user!.id;
    const profile = await customerForUser(userId);
    if (!profile) return res.status(404).json({ error: "Customer profile not found" });
    await db.update(users).set({ ...(input.name ? { name: input.name } : {}), ...(input.phone ? { phone: input.phone } : {}), updatedAt: new Date() }).where(eq(users.id, userId));
    await db.update(customers).set({ preferences: input.preferences, city: input.city, aadharId: input.aadharId ?? profile.aadharId, updatedAt: new Date() }).where(eq(customers.id, profile.id));
    const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]!;
    res.json({ ...publicUser(user), preferences: input.preferences ?? profile.preferences, city: input.city ?? profile.city, aadharId: input.aadharId ?? profile.aadharId });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid profile" });
  }
});

router.get("/profiles/provider", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  const user = (await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1))[0];
  const profile = await providerForUser(req.user!.id);
  if (!user || !profile) return res.status(404).json({ error: "Provider profile not found" });
  res.json({
    ...publicUser(user),
    providerId: profile.id,
    companyName: profile.companyName,
    companyRegistrationNumber: profile.companyRegistrationNumber,
    gstNumber: profile.gstNumber,
    description: profile.description,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    pincode: profile.pincode,
    ownerName: profile.ownerName,
    ownerEmail: profile.ownerEmail,
    ownerPhone: profile.ownerPhone,
    ownerDob: profile.ownerDob,
    kycType: profile.kycType,
    kycNumber: profile.kycNumber,
    rating: 4.8,
  });
});

router.put("/profiles/provider", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = UpdateProviderProfileBody.parse(req.body);
    const userId = req.user!.id;
    const profile = await providerForUser(userId);
    if (!profile) return res.status(404).json({ error: "Provider profile not found" });
    await db.update(users).set({ ...(input.name ? { name: input.name } : {}), ...(input.phone ? { phone: input.phone } : {}), updatedAt: new Date() }).where(eq(users.id, userId));
    await db.update(providers).set({ companyName: input.companyName, description: input.description, address: input.address, updatedAt: new Date() }).where(eq(providers.id, profile.id));
    const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]!;
    res.json({ ...publicUser(user), providerId: profile.id, companyName: input.companyName ?? profile.companyName, description: input.description ?? profile.description, address: input.address ?? profile.address, rating: 4.8 });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid profile" });
  }
});

router.get("/listings", async (req, res) => {
  const query = req.query;
  const data = await listingRows({
    source: typeof query.source === "string" ? query.source : undefined,
    destination: typeof query.destination === "string" ? query.destination : undefined,
    vehicleType: typeof query.vehicleType === "string" ? query.vehicleType : undefined,
    minSeats: typeof query.minSeats === "string" ? Number(query.minSeats) : undefined,
    maxPrice: typeof query.maxPrice === "string" ? Number(query.maxPrice) : undefined,
    sort: typeof query.sort === "string" ? query.sort : undefined,
  });
  res.json(data);
});

router.get("/listings/:id", async (req, res) => {
  const data = (await listingRows({})).find((listing) => listing.id === routeId(req.params.id));
  if (!data) return res.status(404).json({ error: "Listing not found" });
  res.json(data);
});

router.post("/listings", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = CreateListingBody.parse(req.body);
    const provider = await providerForUser(req.user!.id);
    if (!provider) return res.status(400).json({ error: "Provider profile not found" });
    const vehicle = (await db.select().from(vehicles).where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.providerId, provider.id))).limit(1))[0];
    if (!vehicle) return res.status(400).json({ error: "Vehicle not found" });
    const created = id();
    await db.insert(listings).values({ id: created, providerId: provider.id, vehicleId: input.vehicleId, title: input.title, description: input.description, vehicleType: vehicle.vehicleType, source: input.source, destination: input.destination, price: String(input.price), status: input.status ?? "ACTIVE" });
    res.status(201).json((await listingRows({})).find((listing) => listing.id === created));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid listing" });
  }
});

router.put("/listings/:id", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = UpdateListingBody.parse(req.body);
    const provider = await providerForUser(req.user!.id);
    if (!provider) return res.status(404).json({ error: "Provider profile not found" });
    const current = (await db.select().from(listings).where(and(eq(listings.id, routeId(req.params.id)), eq(listings.providerId, provider.id))).limit(1))[0];
    if (!current) return res.status(404).json({ error: "Listing not found" });
    const vehicle = input.vehicleId ? (await db.select().from(vehicles).where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.providerId, provider.id))).limit(1))[0] : null;
    await db.update(listings).set({
      ...(input.vehicleId ? { vehicleId: input.vehicleId, vehicleType: vehicle?.vehicleType ?? current.vehicleType } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.destination ? { destination: input.destination } : {}),
      ...(input.price !== undefined ? { price: String(input.price) } : {}),
      ...(input.status ? { status: input.status } : {}),
      updatedAt: new Date(),
    }).where(eq(listings.id, current.id));
    res.json((await listingRows({})).find((listing) => listing.id === current.id));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid listing" });
  }
});

router.delete("/listings/:id", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  const provider = await providerForUser(req.user!.id);
  if (!provider) return res.status(404).json({ error: "Provider profile not found" });
  await db.delete(listings).where(and(eq(listings.id, routeId(req.params.id)), eq(listings.providerId, provider.id)));
  res.status(204).send();
});

router.get("/vehicles", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  const provider = await providerForUser(req.user!.id);
  res.json(provider ? await db.select().from(vehicles).where(eq(vehicles.providerId, provider.id)) : []);
});

router.post("/vehicles", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = CreateVehicleBody.parse(req.body);
    const provider = await providerForUser(req.user!.id);
    if (!provider) return res.status(404).json({ error: "Provider profile not found" });
    const vehicle = { id: id(), providerId: provider.id, ...input, seatingCapacity: Number(input.seatingCapacity) };
    await db.insert(vehicles).values(vehicle);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid vehicle" });
  }
});

router.put("/vehicles/:id", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = UpdateVehicleBody.parse(req.body);
    const provider = await providerForUser(req.user!.id);
    if (!provider) return res.status(404).json({ error: "Provider profile not found" });
    await db.update(vehicles).set({ ...input, ...(input.seatingCapacity !== undefined ? { seatingCapacity: Number(input.seatingCapacity) } : {}), updatedAt: new Date() }).where(and(eq(vehicles.id, routeId(req.params.id)), eq(vehicles.providerId, provider.id)));
    const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, routeId(req.params.id))).limit(1))[0];
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    res.json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid vehicle" });
  }
});

router.delete("/vehicles/:id", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  const provider = await providerForUser(req.user!.id);
  if (!provider) return res.status(404).json({ error: "Provider profile not found" });
  await db.delete(vehicles).where(and(eq(vehicles.id, routeId(req.params.id)), eq(vehicles.providerId, provider.id)));
  res.status(204).send();
});

router.get("/drivers", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  const provider = await providerForUser(req.user!.id);
  res.json(provider ? await db.select().from(drivers).where(eq(drivers.providerId, provider.id)) : []);
});

router.post("/drivers", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = CreateDriverBody.parse(req.body);
    const provider = await providerForUser(req.user!.id);
    if (!provider) return res.status(404).json({ error: "Provider profile not found" });
    const driver = { id: id(), providerId: provider.id, ...input };
    await db.insert(drivers).values(driver);
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid driver" });
  }
});

router.put("/drivers/:id", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = UpdateDriverBody.parse(req.body);
    const provider = await providerForUser(req.user!.id);
    if (!provider) return res.status(404).json({ error: "Provider profile not found" });
    await db.update(drivers).set({ ...input, updatedAt: new Date() }).where(and(eq(drivers.id, routeId(req.params.id)), eq(drivers.providerId, provider.id)));
    const driver = (await db.select().from(drivers).where(eq(drivers.id, routeId(req.params.id))).limit(1))[0];
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid driver" });
  }
});

router.delete("/drivers/:id", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  const provider = await providerForUser(req.user!.id);
  if (!provider) return res.status(404).json({ error: "Provider profile not found" });
  await db.delete(drivers).where(and(eq(drivers.id, routeId(req.params.id)), eq(drivers.providerId, provider.id)));
  res.status(204).send();
});

router.get("/leads", requireAuth, async (req, res) => {
  let rows;
  if (req.user!.role === "CUSTOMER") {
    const customer = await customerForUser(req.user!.id);
    rows = customer ? await db.select({ id: leads.id }).from(leads).where(eq(leads.customerId, customer.id)) : [];
  } else if (req.user!.role === "PROVIDER") {
    rows = await db.select({ id: leads.id }).from(leads).where(sql`true`);
  } else {
    rows = await db.select({ id: leads.id }).from(leads).where(sql`true`);
  }
  const data = (await Promise.all(rows.map((row) => leadRow(row.id)))).filter(Boolean);
  res.json(data);
});

router.post("/leads", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const input = CreateLeadBody.parse(req.body);
    const customer = await customerForUser(req.user!.id);
    if (!customer) return res.status(404).json({ error: "Customer profile not found" });
    const leadId = id();
    await db.insert(leads).values({ id: leadId, customerId: customer.id, ...input, passengers: Number(input.passengers), status: "OPEN" });
    res.status(201).json(await leadRow(leadId));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid lead" });
  }
});

router.get("/leads/:id", requireAuth, async (req, res) => {
  const lead = await leadRow(routeId(req.params.id));
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (req.user!.role === "CUSTOMER") {
    const customer = await customerForUser(req.user!.id);
    if (!customer || lead.customerId !== customer.id) return res.status(403).json({ error: "You do not have access to this lead" });
  }
  res.json(lead);
});

router.put("/leads/:id", requireAuth, async (req, res) => {
  try {
    const input = UpdateLeadBody.parse(req.body);
    const lead = await leadRow(routeId(req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (req.user!.role === "CUSTOMER") {
      const customer = await customerForUser(req.user!.id);
      if (!customer || lead.customerId !== customer.id) return res.status(403).json({ error: "You do not have access to this lead" });
    }
    await db.update(leads).set({ status: input.status, updatedAt: new Date() }).where(eq(leads.id, routeId(req.params.id)));
    res.json(await leadRow(routeId(req.params.id)));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid lead update" });
  }
});

router.get("/quotations", requireAuth, async (req, res) => {
  if (req.user!.role === "PROVIDER") {
    const provider = await providerForUser(req.user!.id);
    res.json(provider ? await quotationRows(eq(quotations.providerId, provider.id)) : []);
    return;
  }
  if (req.user!.role === "CUSTOMER") {
    const customer = await customerForUser(req.user!.id);
    if (!customer) return res.json([]);
    const customerLeads = await db.select({ id: leads.id }).from(leads).where(eq(leads.customerId, customer.id));
    const data = (await Promise.all(customerLeads.map((lead) => quotationRows(eq(quotations.leadId, lead.id))))).flat();
    res.json(data);
    return;
  }
  res.json(await quotationRows());
});

router.post("/quotations", requireAuth, requireRole("PROVIDER"), async (req, res) => {
  try {
    const input = CreateQuotationBody.parse(req.body);
    const provider = await providerForUser(req.user!.id);
    if (!provider) return res.status(404).json({ error: "Provider profile not found" });
    const lead = (await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1))[0];
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    const quotationId = id();
    await db.insert(quotations).values({ id: quotationId, leadId: input.leadId, providerId: provider.id, price: String(input.price), message: input.message, status: "PENDING" });
    await db.update(leads).set({ status: "QUOTED", updatedAt: new Date() }).where(eq(leads.id, input.leadId));
    res.status(201).json((await quotationRows(eq(quotations.id, quotationId)))[0]);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid quotation" });
  }
});

router.get("/quotations/:id", requireAuth, async (req, res) => {
  const quote = (await quotationRows(eq(quotations.id, routeId(req.params.id))))[0];
  if (!quote) return res.status(404).json({ error: "Quotation not found" });
  res.json(quote);
});

router.put("/quotations/:id", requireAuth, async (req, res) => {
  try {
    const input = UpdateQuotationBody.parse(req.body);
    const quote = (await quotationRows(eq(quotations.id, routeId(req.params.id))))[0];
    if (!quote) return res.status(404).json({ error: "Quotation not found" });
    if (req.user!.role === "PROVIDER") {
      const provider = await providerForUser(req.user!.id);
      if (!provider || quote.providerId !== provider.id) return res.status(403).json({ error: "You do not have access to this quotation" });
    } else if (req.user!.role === "CUSTOMER") {
      const customer = await customerForUser(req.user!.id);
      const lead = (await db.select().from(leads).where(eq(leads.id, quote.leadId)).limit(1))[0];
      if (!customer || !lead || lead.customerId !== customer.id) return res.status(403).json({ error: "You do not have access to this quotation" });
    }
    await db.update(quotations).set({ status: input.status, updatedAt: new Date() }).where(eq(quotations.id, routeId(req.params.id)));
    if (input.status === "ACCEPTED") {
      await db.update(leads).set({ status: "ACCEPTED", updatedAt: new Date() }).where(eq(leads.id, quote.leadId));
      await db.update(quotations).set({ status: "REJECTED", updatedAt: new Date() }).where(and(eq(quotations.leadId, quote.leadId), sql`${quotations.id} <> ${quote.id}`));
    }
    res.json((await quotationRows(eq(quotations.id, routeId(req.params.id))))[0]);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid quotation update" });
  }
});

router.post("/ratings", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  try {
    const input = CreateRatingBody.parse(req.body);
    const customer = await customerForUser(req.user!.id);
    const quote = (await quotationRows(eq(quotations.id, input.quotationId)))[0];
    if (!customer || !quote || quote.status !== "ACCEPTED") return res.status(400).json({ error: "You can only rate an accepted quotation" });
    const rating = { id: id(), customerId: customer.id, providerId: quote.providerId, quotationId: input.quotationId, rating: Number(input.rating), review: input.review };
    await db.insert(ratings).values(rating);
    res.status(201).json({ ...rating, createdAt: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid rating" });
  }
});

router.get("/ratings/provider/:providerId", async (req, res) => {
  const rows = await db.select().from(ratings).where(eq(ratings.providerId, req.params.providerId)).orderBy(desc(ratings.createdAt));
  res.json(rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) })));
});

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const [allListings, allVehicles, allLeads, allQuotes] = await Promise.all([
    db.select({ id: listings.id }).from(listings),
    db.select({ id: vehicles.id }).from(vehicles),
    db.select({ id: leads.id }).from(leads),
    db.select({ id: quotations.id }).from(quotations),
  ]);
  const role = req.user!.role;
  const recentLeads = role === "CUSTOMER"
    ? (await db.select({ id: leads.id }).from(leads).innerJoin(customers, eq(leads.customerId, customers.id)).where(eq(customers.userId, req.user!.id)).orderBy(desc(leads.createdAt)).limit(3))
    : (await db.select({ id: leads.id }).from(leads).orderBy(desc(leads.createdAt)).limit(3));
  const recentQuotations = await db.select({ quotation: quotations }).from(quotations).orderBy(desc(quotations.createdAt)).limit(3);
  res.json({
    role,
    metrics: {
      listings: allListings.length,
      vehicles: allVehicles.length,
      leads: allLeads.length,
      quotations: allQuotes.length,
    },
    recentLeads: (await Promise.all(recentLeads.map((row) => leadRow(row.id)))).filter(Boolean),
    recentQuotations: await Promise.all(recentQuotations.map((row) => quotationRows(eq(quotations.id, row.quotation.id)).then((items) => items[0]))),
  });
});

router.get("/admin/overview", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const [allUsers, allCustomers, allProviders, allVehicles, allListings, allLeads, allQuotes] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select({ id: customers.id }).from(customers),
    db.select({ id: providers.id }).from(providers),
    db.select({ id: vehicles.id }).from(vehicles),
    db.select({ id: listings.id }).from(listings),
    db.select({ id: leads.id }).from(leads),
    db.select({ id: quotations.id }).from(quotations),
  ]);
  res.json({ users: allUsers.length, customers: allCustomers.length, providers: allProviders.length, vehicles: allVehicles.length, listings: allListings.length, leads: allLeads.length, quotations: allQuotes.length });
});

router.get("/admin/users", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json((await db.select().from(users).orderBy(desc(users.createdAt))).map(publicUser));
});

export default router;