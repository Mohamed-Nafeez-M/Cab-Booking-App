import bcrypt from "bcryptjs";
import { db, customers, drivers, leads, listings, providers, quotations, users, vehicles } from "@workspace/db";

const passwordHash = await bcrypt.hash("CabMVP123!", 10);
const user = (id: string, name: string, email: string, phone: string, role: string) => ({ id, name, email, phone, passwordHash, role });
const provider = (id: string, userId: string, companyName: string, description: string, address: string) => ({ id, userId, companyName, description, address });
const vehicle = (id: string, providerId: string, vehicleType: string, model: string, registrationNumber: string, seatingCapacity: number, description: string, imageUrl: string) => ({ id, providerId, vehicleType, model, registrationNumber, seatingCapacity, description, imageUrl });

const usersSeed = [
  user("user-admin", "Ananya Rao", "admin@cabmarket.local", "+91 90000 00001", "ADMIN"),
  user("user-customer-1", "Arjun Menon", "arjun@cabmarket.local", "+91 90000 00002", "CUSTOMER"),
  user("user-customer-2", "Meera Iyer", "meera@cabmarket.local", "+91 90000 00003", "CUSTOMER"),
  user("user-customer-3", "Rohan Das", "rohan@cabmarket.local", "+91 90000 00004", "CUSTOMER"),
  user("user-provider-1", "Karthik Travels", "karthik@cabmarket.local", "+91 90000 00101", "PROVIDER"),
  user("user-provider-2", "Suresh Mobility", "suresh@cabmarket.local", "+91 90000 00102", "PROVIDER"),
  user("user-provider-3", "Coastal Cabs", "coastal@cabmarket.local", "+91 90000 00103", "PROVIDER"),
  user("user-provider-4", "Southern Route", "southern@cabmarket.local", "+91 90000 00104", "PROVIDER"),
  user("user-provider-5", "Greenline Cars", "greenline@cabmarket.local", "+91 90000 00105", "PROVIDER"),
];

const customersSeed = [
  { id: "customer-1", userId: "user-customer-1", city: "Chennai", preferences: "AC, luggage space" },
  { id: "customer-2", userId: "user-customer-2", city: "Bangalore", preferences: "Child seat" },
  { id: "customer-3", userId: "user-customer-3", city: "Coimbatore", preferences: "Early morning pickup" },
];

const providersSeed = [
  provider("provider-1", "user-provider-1", "Karthik Travels", "Reliable intercity rides with professional drivers.", "Chennai"),
  provider("provider-2", "user-provider-2", "Suresh Mobility", "Comfortable family travel across Tamil Nadu.", "Bangalore"),
  provider("provider-3", "user-provider-3", "Coastal Cabs", "Airport transfers and coastal routes.", "Kochi"),
  provider("provider-4", "user-provider-4", "Southern Route", "Well-maintained vehicles for long-distance trips.", "Madurai"),
  provider("provider-5", "user-provider-5", "Greenline Cars", "On-time, transparent cab service.", "Hyderabad"),
];

const vehiclesSeed = [
  vehicle("vehicle-1", "provider-1", "Sedan", "Honda City", "TN 01 AB 1234", 4, "Executive sedan with generous boot space.", "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80"),
  vehicle("vehicle-2", "provider-1", "SUV", "Toyota Innova Crysta", "TN 01 CD 5678", 6, "Spacious SUV for family trips.", "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=80"),
  vehicle("vehicle-3", "provider-2", "Tempo Traveller", "Force Urbania", "KA 05 EF 9012", 12, "Group travel with room for luggage.", "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80"),
  vehicle("vehicle-4", "provider-3", "Hatchback", "Maruti Swift", "KL 07 GH 3456", 4, "Agile city car for airport rides.", "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=900&q=80"),
  vehicle("vehicle-5", "provider-4", "Mini Bus", "Tata Starbus", "TN 58 IJ 7890", 20, "Comfortable group transfer with AC.", "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=900&q=80"),
  vehicle("vehicle-6", "provider-5", "Innova", "Toyota Innova", "TS 09 KL 1122", 6, "Popular all-rounder for city and highway.", "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80"),
];

const listingsSeed = [
  { id: "listing-1", providerId: "provider-1", vehicleId: "vehicle-1", title: "Chennai to Bangalore Executive Sedan", description: "A quiet, comfortable ride for work trips and weekend travel.", vehicleType: "Sedan", source: "Chennai", destination: "Bangalore", price: "4200", status: "ACTIVE" },
  { id: "listing-2", providerId: "provider-1", vehicleId: "vehicle-2", title: "Chennai to Pondicherry Family SUV", description: "Relaxed coastal travel with room for six passengers.", vehicleType: "SUV", source: "Chennai", destination: "Pondicherry", price: "2800", status: "ACTIVE" },
  { id: "listing-3", providerId: "provider-2", vehicleId: "vehicle-3", title: "Bangalore to Coimbatore Group Transfer", description: "A practical choice for reunions, teams and family groups.", vehicleType: "Tempo Traveller", source: "Bangalore", destination: "Coimbatore", price: "9800", status: "ACTIVE" },
  { id: "listing-4", providerId: "provider-3", vehicleId: "vehicle-4", title: "Kochi Airport to City Hatchback", description: "Quick airport pickups with a friendly local driver.", vehicleType: "Hatchback", source: "Kochi Airport", destination: "Kochi", price: "950", status: "ACTIVE" },
  { id: "listing-5", providerId: "provider-4", vehicleId: "vehicle-5", title: "Madurai to Rameswaram Group Ride", description: "A comfortable mini bus for temple and heritage tours.", vehicleType: "Mini Bus", source: "Madurai", destination: "Rameswaram", price: "12500", status: "ACTIVE" },
  { id: "listing-6", providerId: "provider-5", vehicleId: "vehicle-6", title: "Hyderabad to Bangalore Innova", description: "Dependable highway travel with flexible pickup points.", vehicleType: "Innova", source: "Hyderabad", destination: "Bangalore", price: "7200", status: "ACTIVE" },
];

const leadsSeed = [
  { id: "lead-1", customerId: "customer-1", source: "Chennai", destination: "Bangalore", travelDate: "2026-10-12", passengers: 3, vehicleType: "Sedan", requirements: "Pickup at 6:30 AM. Two medium suitcases.", status: "QUOTED" },
  { id: "lead-2", customerId: "customer-2", source: "Bangalore", destination: "Coimbatore", travelDate: "2026-10-18", passengers: 8, vehicleType: "Tempo Traveller", requirements: "Need an experienced highway driver.", status: "OPEN" },
  { id: "lead-3", customerId: "customer-3", source: "Madurai", destination: "Kochi", travelDate: "2026-11-02", passengers: 4, vehicleType: "SUV", requirements: "Please include one stop for lunch.", status: "ACCEPTED" },
];

const quotationsSeed = [
  { id: "quote-1", leadId: "lead-1", providerId: "provider-1", price: "4300", message: "Includes tolls, fuel and a professional driver.", status: "PENDING" },
  { id: "quote-2", leadId: "lead-1", providerId: "provider-2", price: "4700", message: "Comfortable sedan with a complimentary water kit.", status: "PENDING" },
  { id: "quote-3", leadId: "lead-3", providerId: "provider-3", price: "5600", message: "One sightseeing stop included at no extra charge.", status: "ACCEPTED" },
];

for (const row of usersSeed) await db.insert(users).values(row).onConflictDoNothing();
for (const row of customersSeed) await db.insert(customers).values(row).onConflictDoNothing();
for (const row of providersSeed) await db.insert(providers).values(row).onConflictDoNothing();
for (const row of vehiclesSeed) await db.insert(vehicles).values(row).onConflictDoNothing();
for (const row of listingsSeed) await db.insert(listings).values(row).onConflictDoNothing();
for (const row of leadsSeed) await db.insert(leads).values(row).onConflictDoNothing();
for (const row of quotationsSeed) await db.insert(quotations).values(row).onConflictDoNothing();
for (const row of [
  { id: "driver-1", providerId: "provider-1", name: "Prakash Kumar", phone: "+91 90000 10101", licenseNumber: "TN01-DRV-1001" },
  { id: "driver-2", providerId: "provider-2", name: "Vijay Anand", phone: "+91 90000 10102", licenseNumber: "KA05-DRV-1002" },
  { id: "driver-3", providerId: "provider-3", name: "Nikhil Joseph", phone: "+91 90000 10103", licenseNumber: "KL07-DRV-1003" },
]) await db.insert(drivers).values(row).onConflictDoNothing();

console.info("Cab Marketplace seed complete.");
console.info("Demo password for all seeded accounts: CabMVP123!");