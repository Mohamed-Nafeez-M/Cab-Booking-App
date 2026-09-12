import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("CUSTOMER"),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferences: text("preferences"),
  city: text("city"),
  aadharId: text("aadhar_id"),
  ...timestamps,
}, (table) => [index("customers_user_idx").on(table.userId)]);

export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name"),
  companyRegistrationNumber: text("company_registration_number"),
  gstNumber: text("gst_number"),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  ownerPhone: text("owner_phone"),
  ownerDob: text("owner_dob"),
  kycType: text("kyc_type"),
  kycNumber: text("kyc_number"),
  ...timestamps,
}, (table) => [
  index("providers_user_idx").on(table.userId),
  uniqueIndex("providers_company_reg_idx").on(table.companyRegistrationNumber),
]);

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  vehicleType: text("vehicle_type").notNull(),
  model: text("model").notNull(),
  registrationNumber: text("registration_number").notNull(),
  seatingCapacity: integer("seating_capacity").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  ...timestamps,
}, (table) => [index("vehicles_provider_idx").on(table.providerId)]);

export const drivers = pgTable("drivers", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  licenseNumber: text("license_number").notNull(),
  aadharId: text("aadhar_id").notNull(),
  ...timestamps,
}, (table) => [index("drivers_provider_idx").on(table.providerId)]);

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  source: text("source").notNull(),
  destination: text("destination").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("ACTIVE"),
  ...timestamps,
}, (table) => [
  index("listings_route_idx").on(table.source, table.destination),
  index("listings_provider_idx").on(table.providerId),
]);

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  destination: text("destination").notNull(),
  travelDate: text("travel_date").notNull(),
  passengers: integer("passengers").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  requirements: text("requirements").notNull(),
  status: text("status").notNull().default("OPEN"),
  ...timestamps,
}, (table) => [
  index("leads_customer_idx").on(table.customerId),
  index("leads_status_idx").on(table.status),
]);

export const quotations = pgTable("quotations", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("PENDING"),
  ...timestamps,
}, (table) => [
  index("quotations_lead_idx").on(table.leadId),
  index("quotations_provider_idx").on(table.providerId),
]);

export const ratings = pgTable("ratings", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  quotationId: text("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  review: text("review").notNull(),
  ...timestamps,
}, (table) => [index("ratings_provider_idx").on(table.providerId)]);

export const availability = pgTable("availability", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  availableFrom: text("available_from").notNull(),
  availableTo: text("available_to").notNull(),
  status: text("status").notNull().default("AVAILABLE"),
  isActive: boolean("is_active").notNull().default(true),
});