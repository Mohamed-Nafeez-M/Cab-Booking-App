'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import NextLink from 'next/link';
import { useRouter, usePathname, useParams as useNextParams, useSearchParams } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Bell, BriefcaseBusiness, Building2, CarFront,
  Check, ChevronDown, ChevronLeft, CircleAlert, CircleDollarSign, Clock3, Compass, Eye, FileText,
  LayoutDashboard, ListFilter, Loader2, LogIn, LogOut, MapPin, Menu, Pencil, Plus, RefreshCcw, Search, ShieldCheck, SlidersHorizontal, Star,
  Trash2, TrendingUp, UserRound, Users, X, Zap,
} from 'lucide-react';
import {
  getGetAdminOverviewQueryKey, getGetCustomerProfileQueryKey, getGetDashboardSummaryQueryKey,
  getGetLeadQueryKey, getGetListingQueryKey, getGetMeQueryKey, getGetProviderProfileQueryKey,
  getListAdminUsersQueryKey, getListDriversQueryKey, getListLeadsQueryKey, getListListingsQueryKey,
  getListVehiclesQueryKey, useCreateDriver, useCreateLead,
  useCreateListing, useCreateQuotation, useCreateVehicle, useDeleteDriver, useDeleteListing,
  useDeleteVehicle, useGetAdminOverview, useGetCustomerProfile, useGetDashboardSummary, useGetLead,
  useGetListing, useGetMe, useGetProviderProfile, useListAdminUsers, useListDrivers, useListLeads,
  useListListings, useListVehicles, useLogin, useRegister, useUpdateDriver, useUpdateLead,
  useUpdateListing, useUpdateQuotation, useUpdateVehicle, useUpdateCustomerProfile, useUpdateProviderProfile,
} from '@workspace/api-client-react';
import type { Listing, Lead, Quotation } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/components/not-found';
import { getToken, setToken, clearToken } from '@/lib/auth';

const Link = NextLink;

function useLocation(): [string, (path: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  return [pathname ?? '', (path: string) => router.push(path)];
}

function useParams<T = Record<string, string>>(): T {
  return (useNextParams() ?? {}) as T;
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
const money = (n?: number) => `₹${Math.round(n ?? 0).toLocaleString('en-IN')}`;
const initials = (name?: string) => (name || 'Cab').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Button({ children, variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'outline' }) {
  return <button className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50', {
    primary: 'bg-primary text-primary-foreground shadow-[0_7px_18px_hsl(var(--primary)/.18)] hover:-translate-y-0.5 hover:brightness-105',
    soft: 'bg-secondary text-secondary-foreground hover:-translate-y-0.5',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:-translate-y-0.5',
    outline: 'border border-border bg-card text-foreground hover:border-primary hover:text-primary',
  }[variant], className)} {...props}>{children}</button>;
}

function Field({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; className?: string }) {
  return <label className={cx('grid gap-1.5 text-sm font-medium text-foreground', className)}>
    <span>{label}</span><input className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary/15" {...props} />
  </label>;
}
function Textarea({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; className?: string }) {
  return <label className={cx('grid gap-1.5 text-sm font-medium text-foreground', className)}>
    <span>{label}</span><textarea className="min-h-28 resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15" {...props} />
  </label>;
}
function SelectField({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) {
  return <label className="grid gap-1.5 text-sm font-medium text-foreground"><span>{label}</span><select className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15" {...props}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
function Status({ children }: { children?: ReactNode }) {
  const value = String(children || '');
  return <span className={cx('inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em]', value === 'ACTIVE' || value === 'ACCEPTED' ? 'bg-accent/10 text-accent' : value === 'PAUSED' || value === 'REJECTED' || value === 'CLOSED' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>{value || 'OPEN'}</span>;
}
function Skeleton({ className = '' }: { className?: string }) { return <div className={cx('skeleton rounded-xl', className)} />; }
function EmptyState({ icon: Icon = Compass, title, copy, action }: { icon?: typeof Compass; title: string; copy: string; action?: ReactNode }) {
  return <div className="grid justify-items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Icon size={21} /></div><h3 className="font-display text-lg font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
function ErrorState({ retry }: { retry?: () => void }) { return <div className="grid justify-items-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center"><CircleAlert className="text-destructive" /><h3 className="mt-3 font-semibold">We hit a small roadblock</h3><p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>{retry && <Button className="mt-4" variant="outline" onClick={retry}><RefreshCcw size={15} /> Retry</Button>}</div>; }
function Logo({ light = false }: { light?: boolean }) { return <Link href="/" data-testid="link-brand" className="flex items-center gap-2.5"><span className={cx('grid h-9 w-9 place-items-center rounded-xl', light ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground')}><CarFront size={19} strokeWidth={2.4} /></span><span className={cx('font-display text-lg font-bold tracking-tight', light && 'text-sidebar-foreground')}>Safar<span className="text-primary">Setu</span></span></Link>; }

function Topbar({ onMenu, user }: { onMenu?: () => void; user?: any }) {
  const [, setLocation] = useLocation();
  return <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-7">
    <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-muted md:hidden" onClick={onMenu} aria-label="Open menu" data-testid="button-open-menu"><Menu size={20} /></button><span className="hidden text-sm text-muted-foreground md:block">Good to see you, <b className="text-foreground">{user?.name?.split(' ')[0] || 'traveller'}</b></span></div>
    <div className="flex items-center gap-2"><button className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted" aria-label="Notifications" data-testid="button-notifications"><Bell size={18} /><i className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" /></button><button onClick={() => setLocation('/customer/profile')} className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground" data-testid="button-account">{initials(user?.name)}</button></div>
  </header>;
}

const customerNav = [{ href: '/customer/dashboard', label: 'Overview', icon: LayoutDashboard }, { href: '/customer/leads', label: 'My requests', icon: FileText }, { href: '/customer/profile', label: 'Profile', icon: UserRound }];
const providerNav = [{ href: '/provider/dashboard', label: 'Overview', icon: LayoutDashboard }, { href: '/provider/leads', label: 'Incoming leads', icon: FileText }, { href: '/provider/listings', label: 'My listings', icon: Compass }, { href: '/provider/vehicles', label: 'Vehicles', icon: CarFront }, { href: '/provider/drivers', label: 'Drivers', icon: Users }, { href: '/provider/profile', label: 'Business profile', icon: Building2 }];
function SideNav({ role, open, close }: { role: string; open: boolean; close: () => void }) {
  const [, setLocation] = useLocation(); const nav = role === 'PROVIDER' ? providerNav : role === 'ADMIN' ? [{ href: '/admin/dashboard', label: 'Admin overview', icon: ShieldCheck }] : customerNav;
  return <aside className={cx('fixed inset-y-0 left-0 z-30 flex w-[256px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform md:relative md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
    <div className="flex items-center justify-between px-2"><Logo light /><button className="rounded-lg p-2 hover:bg-sidebar-accent md:hidden" onClick={close} aria-label="Close menu" data-testid="button-close-menu"><X size={18} /></button></div>
    <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/45">{role === 'ADMIN' ? 'Control room' : 'Workspace'}</div>
    <nav className="mt-3 grid gap-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={close} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"><Icon size={17} className="opacity-80" />{label}</Link>)}</nav>
    <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4"><div className="flex items-start gap-2 text-primary"><Zap size={16} fill="currentColor" /><span className="text-xs font-bold">Setu note</span></div><p className="mt-2 text-xs leading-5 text-sidebar-foreground/60">Every quote is from a verified local provider.</p></div>
    <button onClick={() => { clearToken(); setLocation('/'); }} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-logout"><LogOut size={17} /> Sign out</button>
  </aside>;
}
function AppShell({ children, role = 'CUSTOMER', user }: { children: ReactNode; role?: string; user?: any }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-[100dvh] bg-background"><div className="flex min-h-[100dvh]"><SideNav role={role} open={open} close={() => setOpen(false)} /><div className="min-w-0 flex-1"><Topbar user={user} onMenu={() => setOpen(true)} /><main className="page-enter mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10">{children}</main></div></div></div>;
}

function PublicNav() { return <header className="absolute inset-x-0 top-0 z-10"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Logo /><div className="flex items-center gap-2 sm:gap-4"><Link href="/search" className="hidden px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground sm:block" data-testid="link-browse">Browse rides</Link><Link href="/login" className="rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary" data-testid="link-login">Log in</Link><Link href="/register" className="hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 hover:-translate-y-0.5 sm:block" data-testid="link-register">Join SafarSetu</Link></div></div></header>; }

function SearchBox({ compact = false }: { compact?: boolean }) {
  const [, setLocation] = useLocation(); const [source, setSource] = useState(''); const [destination, setDestination] = useState('');
  return <form onSubmit={(e) => { e.preventDefault(); setLocation(`/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`); }} className={cx('grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-[0_18px_50px_hsl(218_28%_19%/.1)] sm:grid-cols-[1fr_1fr_auto]', compact ? 'max-w-3xl' : 'mx-auto max-w-4xl')}>
    <label className="flex items-center gap-3 rounded-xl bg-muted/60 px-3"><MapPin size={18} className="text-primary" /><span className="sr-only">From</span><input value={source} onChange={(e) => setSource(e.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="From city or airport" data-testid="input-search-source" /></label>
    <label className="flex items-center gap-3 rounded-xl bg-muted/60 px-3"><ArrowRight size={17} className="text-accent" /><span className="sr-only">To</span><input value={destination} onChange={(e) => setDestination(e.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Where are you going?" data-testid="input-search-destination" /></label>
    <Button type="submit" className="h-12 px-6" data-testid="button-search"><Search size={17} /> Find a ride</Button>
  </form>;
}

export function Home() {
  const listings = useListListings(undefined, { query: { queryKey: getListListingsQueryKey() } });
  const featured = (listings.data || []).slice(0, 3);
  return <div className="noise min-h-[100dvh] bg-background"><PublicNav /><section className="relative overflow-hidden px-5 pb-20 pt-36 sm:px-8 sm:pt-44"><div className="absolute -right-28 -top-24 h-[440px] w-[440px] rounded-full bg-secondary/80 blur-3xl" /><div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" /><div className="relative mx-auto max-w-7xl"><div className="max-w-3xl rise-in"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" />LOCAL RIDES. CLEAR QUOTES.</div><h1 className="font-display max-w-4xl text-5xl font-bold leading-[.98] tracking-[-.055em] text-foreground sm:text-7xl lg:text-[92px]">The right ride,<br /><span className="text-primary">without the runaround.</span></h1><p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Compare trusted local cab providers, ask for a quote, and book with confidence. Built for the way India actually travels.</p></div><div className="relative mt-12 rise-in delay-2"><SearchBox /></div><div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-muted-foreground rise-in delay-3"><span className="flex items-center gap-2"><ShieldCheck size={17} className="text-accent" /> Verified providers</span><span className="flex items-center gap-2"><CircleDollarSign size={17} className="text-primary" /> No booking fees</span><span className="flex items-center gap-2"><Clock3 size={17} className="text-accent" /> Replies in minutes</span></div></div></section>
    <section className="border-y border-border bg-card px-5 py-14 sm:px-8"><div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-3"><div><p className="font-display text-4xl font-bold text-primary">3,200+</p><p className="mt-1 text-sm text-muted-foreground">rides coordinated this month</p></div><div><p className="font-display text-4xl font-bold text-foreground">4.8<span className="text-primary">/5</span></p><p className="mt-1 text-sm text-muted-foreground">average rider rating</p></div><div><p className="font-display text-4xl font-bold text-accent">18 min</p><p className="mt-1 text-sm text-muted-foreground">typical first response</p></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="flex items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Popular routes</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">A better way to get there.</h2></div><Link href="/search" className="hidden items-center gap-2 text-sm font-semibold text-primary hover:gap-3 sm:flex" data-testid="link-see-all">See all rides <ArrowUpRight size={16} /></Link></div><div className="mt-9 grid gap-4 lg:grid-cols-3">{listings.isLoading ? [1,2,3].map((x) => <Skeleton key={x} className="h-52" />) : featured.length ? featured.map((item) => <ListingCard key={item.id} listing={item} />) : <div className="lg:col-span-3"><EmptyState title="New routes are joining soon" copy="Tell us where you need to go and local providers will come back with options." action={<Link href="/search" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-empty-search">Start a search</Link>} /></div>}</div></section>
    <section className="bg-sidebar px-5 py-20 text-sidebar-foreground sm:px-8"><div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_1.2fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Why SafarSetu</p><h2 className="mt-3 max-w-xl font-display text-4xl font-bold leading-tight">Local knowledge.<br />Less guesswork.</h2></div><div className="grid gap-8 sm:grid-cols-3"><div><BadgeCheck className="text-primary" size={22} /><h3 className="mt-4 font-semibold">People you can verify</h3><p className="mt-2 text-sm leading-6 text-sidebar-foreground/60">See who is behind the wheel before you confirm.</p></div><div><SlidersHorizontal className="text-primary" size={22} /><h3 className="mt-4 font-semibold">Quotes that fit</h3><p className="mt-2 text-sm leading-6 text-sidebar-foreground/60">Share the trip details. Providers respond to the actual brief.</p></div><div><HeartMark /><h3 className="mt-4 font-semibold">Human when it matters</h3><p className="mt-2 text-sm leading-6 text-sidebar-foreground/60">A straightforward local service, not a faceless algorithm.</p></div></div></div></section>
    <footer className="bg-sidebar px-5 pb-8 text-sidebar-foreground sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-sidebar-border pt-7 text-sm text-sidebar-foreground/50 sm:flex-row sm:items-center sm:justify-between"><Logo light /><span>Made for the journeys between here and there.</span></div></footer>
  </div>;
}
function HeartMark() { return <div className="grid h-[22px] w-[22px] place-items-center text-primary"><Star size={21} fill="currentColor" /></div>; }

function ListingCard({ listing }: { listing: Listing }) {
  return <Link href={`/listings/${listing.id}`} data-testid={`card-listing-${listing.id}`} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><CarFront size={21} /></div><Status>{listing.status}</Status></div><div className="mt-7 flex items-start justify-between gap-4"><div><h3 className="font-display font-bold">{listing.title}</h3><p className="mt-1 text-sm text-muted-foreground">{listing.source} <span className="mx-1 text-primary">→</span> {listing.destination}</p></div><div className="text-right"><p className="font-display text-lg font-bold">{money(listing.price)}</p><p className="text-[11px] text-muted-foreground">starting from</p></div></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Users size={14} /> {listing.seatingCapacity} seats</span><span className="flex items-center gap-1.5"><Star size={14} className="text-primary" fill="currentColor" /> {listing.rating?.toFixed(1) || 'New'} · {listing.companyName || listing.providerName}</span></div></Link>;
}

export function SearchPage() {
  const search = useSearchParams();
  const [source, setSource] = useState(search.get('source') || ''); const [destination, setDestination] = useState(search.get('destination') || '');
  const [vehicleType, setVehicleType] = useState(''); const [sort, setSort] = useState('relevance'); const [maxPrice, setMaxPrice] = useState('');
  const params = useMemo(() => ({ source: source || undefined, destination: destination || undefined, vehicleType: vehicleType && vehicleType !== 'Any vehicle' ? vehicleType : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined, sort: sort as any }), [source, destination, vehicleType, maxPrice, sort]);
  const listings = useListListings(params, { query: { queryKey: getListListingsQueryKey(params) } });
  return <div className="min-h-[100dvh] bg-background"><PublicNav /><div className="mx-auto max-w-7xl px-5 pb-20 pt-28 sm:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Ride finder</p><h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Find your way there.</h1><p className="mt-3 text-muted-foreground">Search routes from providers who know the road.</p></div><div className="mt-8"><SearchBox compact /></div><div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]"><aside className="h-fit rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Refine</h2><button onClick={() => { setVehicleType(''); setMaxPrice(''); }} className="text-xs font-semibold text-primary" data-testid="button-clear-filters">Clear</button></div><div className="mt-6 grid gap-5"><SelectField label="Vehicle type" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} options={['Any vehicle', 'Sedan', 'SUV', 'Hatchback', 'Tempo Traveller']} /><Field label="Budget up to" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="₹ maximum" /></div></aside><section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground"><b className="text-foreground">{listings.data?.length || 0}</b> rides available</p><label className="flex items-center gap-2 text-sm text-muted-foreground"><ListFilter size={15} /><select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm" data-testid="select-sort"><option value="relevance">Most relevant</option><option value="price_asc">Lowest price</option><option value="price_desc">Highest price</option></select></label></div>{listings.isLoading ? <div className="grid gap-4 sm:grid-cols-2">{[1,2,3,4].map((x) => <Skeleton key={x} className="h-56" />)}</div> : listings.isError ? <ErrorState retry={() => listings.refetch()} /> : listings.data?.length ? <div className="grid gap-4 sm:grid-cols-2">{listings.data.map((item) => <ListingCard key={item.id} listing={item} />)}</div> : <EmptyState icon={Search} title="No rides matched that search" copy="Try a nearby city, a wider budget, or leave the vehicle type open." action={<Button variant="outline" onClick={() => { setSource(''); setDestination(''); setVehicleType(''); setMaxPrice(''); }}>Reset search</Button>} />}</section></div></div></div>;
}

export function ListingDetail() {
  const { id = '' } = useParams<{ id: string }>(); const listing = useGetListing(id, { query: { queryKey: getGetListingQueryKey(id), enabled: !!id } }); const [, setLocation] = useLocation(); const [showForm, setShowForm] = useState(false);
  return <div className="min-h-[100dvh] bg-background"><PublicNav /><div className="mx-auto max-w-5xl px-5 pb-20 pt-28 sm:px-8"><Link href="/search" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary" data-testid="link-back-search"><ChevronLeft size={16} /> Back to rides</Link>{listing.isLoading ? <div className="grid gap-5"><Skeleton className="h-64" /><Skeleton className="h-48" /></div> : listing.isError || !listing.data ? <ErrorState retry={() => listing.refetch()} /> : <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><div><div className="relative overflow-hidden rounded-3xl bg-sidebar px-7 py-10 text-sidebar-foreground sm:px-12 sm:py-14"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" /><CarFront className="relative text-primary" size={34} /><p className="relative mt-10 text-xs font-bold uppercase tracking-[.17em] text-primary">{listing.data.vehicleType} · {listing.data.seatingCapacity} seats</p><h1 className="relative mt-2 max-w-xl font-display text-4xl font-bold sm:text-5xl">{listing.data.title}</h1><p className="relative mt-4 max-w-lg text-sm leading-6 text-sidebar-foreground/65">{listing.data.description}</p><div className="relative mt-8 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-sidebar-accent px-3 py-2">{listing.data.source} <span className="mx-1 text-primary">→</span> {listing.data.destination}</span><span className="rounded-full bg-sidebar-accent px-3 py-2 flex items-center gap-1"><Star size={14} className="text-primary" fill="currentColor" /> {listing.data.rating?.toFixed(1) || 'New'} rating</span></div></div><div className="mt-6 rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">Your provider</p><h2 className="mt-2 font-display text-xl font-bold">{listing.data.companyName || listing.data.providerName}</h2><p className="mt-1 text-sm text-muted-foreground">{listing.data.providerName} · verified local operator</p></div><div className="grid h-11 w-11 place-items-center rounded-full bg-secondary font-bold text-secondary-foreground">{initials(listing.data.providerName)}</div></div></div></div><aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-lg shadow-foreground/[.03]"><p className="text-sm text-muted-foreground">Estimated fare</p><p className="mt-1 font-display text-4xl font-bold">{money(listing.data.price)}</p><p className="text-xs text-muted-foreground">one way · final quote from provider</p><div className="my-6 border-t border-border" />{showForm ? <QuoteRequestForm listing={listing.data} onDone={() => setLocation('/customer/leads')} /> : <><Button className="w-full" onClick={() => setShowForm(true)} data-testid="button-request-quote">Request a quote <ArrowRight size={16} /></Button><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">No payment now. Share your trip details and compare responses.</p></>}</aside></div>}</div></div>;
}
function QuoteRequestForm({ listing, onDone }: { listing: Listing; onDone: () => void }) {
  const create = useCreateLead(); const [form, setForm] = useState({ source: listing.source, destination: listing.destination, travelDate: '', passengers: String(listing.seatingCapacity > 1 ? 2 : 1), vehicleType: listing.vehicleType, requirements: '' });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate({ data: { ...form, passengers: Number(form.passengers) } }, { onSuccess: onDone }); };
  return <form onSubmit={submit} className="grid gap-3"><Field label="Travel date" type="date" required value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} data-testid="input-travel-date" /><Field label="Passengers" type="number" min="1" required value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} data-testid="input-passengers" /><Textarea label="Anything the provider should know?" placeholder="Pickup time, luggage, stops..." value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} data-testid="input-requirements" /><Button type="submit" disabled={create.isPending} data-testid="button-submit-lead">{create.isPending ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />} Send request</Button>{create.isError && <p className="text-xs text-destructive">Could not send the request. Please try again.</p>}</form>;
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const register = useRegister();
  const [role, setRole] = useState<'CUSTOMER' | 'PROVIDER'>('CUSTOMER');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', aadharId: '' });

  // Provider registration state
  const [providerStep, setProviderStep] = useState<number>(1);
  const [providerForm, setProviderForm] = useState({
    companyName: '',
    companyRegistrationNumber: '',
    gstNumber: '',
    companyAddress: '',
    city: '',
    state: '',
    pincode: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerDob: '',
    kycType: '',
    kycNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const busy = login.isPending || register.isPending;

  const validateBasic = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^\+?[0-9\s-]{8,15}$/.test(form.phone.trim())) errs.phone = 'Valid phone number is required';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Valid email address is required';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const validateCompany = () => {
    const errs: Record<string, string> = {};
    if (!providerForm.companyName.trim()) errs.companyName = 'Company name is required';
    if (!providerForm.companyRegistrationNumber.trim()) errs.companyRegistrationNumber = 'Company registration number is required';
    if (!providerForm.gstNumber.trim()) errs.gstNumber = 'GST number is required';
    else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(providerForm.gstNumber.trim())) {
      errs.gstNumber = 'Invalid GST format (must be 15-character GSTIN, e.g. 22AAAAA0000A1Z5)';
    }
    if (!providerForm.companyAddress.trim()) errs.companyAddress = 'Company address is required';
    if (!providerForm.city.trim()) errs.city = 'City is required';
    if (!providerForm.state.trim()) errs.state = 'State is required';
    if (!providerForm.pincode.trim()) errs.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(providerForm.pincode.trim())) errs.pincode = 'Pincode must be 6 digits';
    return errs;
  };

  const validateOwner = () => {
    const errs: Record<string, string> = {};
    if (!providerForm.ownerName.trim()) errs.ownerName = 'Owner name is required';
    if (!providerForm.ownerEmail.trim()) errs.ownerEmail = 'Owner email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerForm.ownerEmail.trim())) errs.ownerEmail = 'Invalid email format';
    if (!providerForm.ownerPhone.trim()) errs.ownerPhone = 'Owner phone number is required';
    else if (!/^\+?[0-9\s-]{8,15}$/.test(providerForm.ownerPhone.trim())) errs.ownerPhone = 'Invalid phone format';
    if (!providerForm.ownerDob.trim()) errs.ownerDob = 'Owner date of birth is required';
    return errs;
  };

  const validateKYC = () => {
    const errs: Record<string, string> = {};
    if (!providerForm.kycType.trim()) errs.kycType = 'KYC ID type is required';
    if (!providerForm.kycNumber.trim()) errs.kycNumber = 'KYC ID number is required';
    else if (providerForm.kycType === 'Aadhaar' && !(/^\d{4}\s?\d{4}\s?\d{4}$/.test(providerForm.kycNumber.trim()) || /^\d{12}$/.test(providerForm.kycNumber.trim()))) {
      errs.kycNumber = 'Aadhaar number must be 12 digits';
    } else if (providerForm.kycType === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(providerForm.kycNumber.trim())) {
      errs.kycNumber = 'PAN must be in valid format (e.g. ABCDE1234F)';
    }
    return errs;
  };

  const handleNextStep = (currentStep: number) => {
    setServerError('');
    if (currentStep === 1) {
      const errs = validateBasic();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      setProviderForm((prev) => ({
        ...prev,
        ownerName: prev.ownerName || form.name,
        ownerEmail: prev.ownerEmail || form.email,
        ownerPhone: prev.ownerPhone || form.phone,
      }));
      setProviderStep(2);
    } else if (currentStep === 2) {
      const errs = validateCompany();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      setProviderStep(3);
    } else if (currentStep === 3) {
      const errs = validateOwner();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      setProviderStep(4);
    }
  };

  const handleProviderSubmit = (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    const basicErrs = validateBasic();
    const compErrs = validateCompany();
    const ownerErrs = validateOwner();
    const kycErrs = validateKYC();
    const allErrs = { ...basicErrs, ...compErrs, ...ownerErrs, ...kycErrs };
    if (Object.keys(allErrs).length > 0) {
      setErrors(allErrs);
      if (Object.keys(basicErrs).length > 0) setProviderStep(1);
      else if (Object.keys(compErrs).length > 0) setProviderStep(2);
      else if (Object.keys(ownerErrs).length > 0) setProviderStep(3);
      else setProviderStep(4);
      return;
    }
    setErrors({});
    register.mutate(
      {
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: 'PROVIDER',
          companyName: providerForm.companyName,
          companyRegistrationNumber: providerForm.companyRegistrationNumber,
          gstNumber: providerForm.gstNumber,
          companyAddress: providerForm.companyAddress,
          city: providerForm.city,
          state: providerForm.state,
          pincode: providerForm.pincode,
          ownerName: providerForm.ownerName,
          ownerEmail: providerForm.ownerEmail,
          ownerPhone: providerForm.ownerPhone,
          ownerDob: providerForm.ownerDob,
          kycType: providerForm.kycType,
          kycNumber: providerForm.kycNumber,
        },
      },
      {
        onSuccess: (res) => {
          setToken(res.token);
          setSubmittedSuccess(true);
        },
        onError: (err: any) => {
          setServerError(err?.message || 'That didn’t work. Check your details and try again.');
        },
      }
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      login.mutate(
        { data: { email: form.email, password: form.password } },
        {
          onSuccess: (res) => {
            setToken(res.token);
            setLocation(res.user.role === 'PROVIDER' ? '/provider/dashboard' : res.user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard');
          },
        }
      );
    } else {
      register.mutate(
        { data: { ...form, role: 'CUSTOMER' } },
        {
          onSuccess: (res) => {
            setToken(res.token);
            setLocation('/customer/dashboard');
          },
        }
      );
    }
  };

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[.85fr_1.15fr]">
      <div className="hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div>
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Compass size={25} />
          </div>
          <h1 className="max-w-md font-display text-5xl font-bold leading-[1.05]">
            Good journeys<br /><span className="text-primary">start local.</span>
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-6 text-sidebar-foreground/60">
            One place for trusted cabs, honest quotes, and the people who keep India moving.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/45">SafarSetu · Local mobility, connected.</p>
      </div>
      <div className="flex items-center justify-center px-5 py-10 sm:px-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-auth-home">
            <ChevronLeft size={16} /> Back to home
          </Link>
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{mode === 'login' ? 'Welcome back' : 'Get moving'}</p>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight">
              {mode === 'login' ? 'Sign in to SafarSetu' : role === 'PROVIDER' ? 'Cab Provider Registration' : 'Create your account'}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Your next ride is closer than you think.'
                : role === 'PROVIDER'
                ? 'Register your company, owner, and KYC details to start offering rides.'
                : 'Choose how you’ll use the marketplace.'}
            </p>
          </div>

          {mode === 'register' && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
              <button
                type="button"
                onClick={() => { setRole('CUSTOMER'); setErrors({}); setServerError(''); }}
                className={cx('rounded-xl py-3 text-sm font-semibold', role === 'CUSTOMER' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
                data-testid="button-role-customer"
              >
                <UserRound size={16} className="mr-1 inline" /> I need a ride
              </button>
              <button
                type="button"
                onClick={() => { setRole('PROVIDER'); setErrors({}); setServerError(''); }}
                className={cx('rounded-xl py-3 text-sm font-semibold', role === 'PROVIDER' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
                data-testid="button-role-provider"
              >
                <BriefcaseBusiness size={16} className="mr-1 inline" /> I provide rides
              </button>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={submit} className="grid gap-4">
              <Field
                label="Email address"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="input-email"
              />
              <Field
                label="Password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                data-testid="input-password"
              />
              <Button type="submit" className="mt-2 h-12" disabled={busy} data-testid="button-auth-submit">
                {busy ? <Loader2 className="animate-spin" size={17} /> : <LogIn size={17} />} Sign in
              </Button>
              {login.isError && (
                <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  That didn’t work. Check your details and try again.
                </div>
              )}
            </form>
          ) : role === 'CUSTOMER' ? (
            <form onSubmit={submit} className="grid gap-4">
              <Field
                label="Full name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="input-name"
              />
              <Field
                label="Phone number"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                data-testid="input-phone"
              />
              <Field
                label="Email address"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="input-email"
              />
              <Field
                label="Aadhar ID (KYC)"
                required
                minLength={4}
                value={form.aadharId}
                onChange={(e) => setForm({ ...form, aadharId: e.target.value })}
                placeholder="XXXX XXXX XXXX"
                data-testid="input-aadhar"
              />
              <Field
                label="Password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                data-testid="input-password"
              />
              <Button type="submit" className="mt-2 h-12" disabled={busy} data-testid="button-auth-submit">
                {busy ? <Loader2 className="animate-spin" size={17} /> : <ArrowRight size={17} />} Create account
              </Button>
              {register.isError && (
                <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  That didn’t work. Check your details and try again.
                </div>
              )}
            </form>
          ) : submittedSuccess ? (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center" data-testid="container-success">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/20 text-accent">
                <Check size={28} />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground" data-testid="text-success-message">
                Provider registration submitted successfully
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your company, owner, and KYC details have been securely recorded.
              </p>
              <Button
                type="button"
                className="mt-6 w-full h-12"
                onClick={() => setLocation('/provider/dashboard')}
                data-testid="button-go-dashboard"
              >
                Go to Provider Dashboard <ArrowRight size={17} />
              </Button>
            </div>
          ) : (
            <div>
              {/* Stepper Tabs */}
              <div className="mb-6 grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 text-center text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setProviderStep(1)}
                  className={cx('rounded-lg py-2 transition', providerStep === 1 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  data-testid="step-tab-basic"
                >
                  1. Basic
                </button>
                <button
                  type="button"
                  onClick={() => setProviderStep(2)}
                  className={cx('rounded-lg py-2 transition', providerStep === 2 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  data-testid="step-tab-company"
                >
                  2. Company
                </button>
                <button
                  type="button"
                  onClick={() => setProviderStep(3)}
                  className={cx('rounded-lg py-2 transition', providerStep === 3 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  data-testid="step-tab-owner"
                >
                  3. Owner
                </button>
                <button
                  type="button"
                  onClick={() => setProviderStep(4)}
                  className={cx('rounded-lg py-2 transition', providerStep === 4 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  data-testid="step-tab-kyc"
                >
                  4. KYC
                </button>
              </div>

              {providerStep === 1 && (
                <form onSubmit={(e) => { e.preventDefault(); handleNextStep(1); }} className="grid gap-4" data-testid="form-provider-basic">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-display text-lg font-bold" data-testid="heading-basic-details">Basic Provider Registration</h3>
                    <span className="text-xs text-muted-foreground">Step 1 of 4</span>
                  </div>
                  <div>
                    <Field
                      label="Full name"
                      required
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((prev) => ({ ...prev, name: '' })); }}
                      data-testid="input-name"
                    />
                    {errors.name && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-name">{errors.name}</p>}
                  </div>
                  <div>
                    <Field
                      label="Phone number"
                      required
                      value={form.phone}
                      onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors((prev) => ({ ...prev, phone: '' })); }}
                      data-testid="input-phone"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-phone">{errors.phone}</p>}
                  </div>
                  <div>
                    <Field
                      label="Email address"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors((prev) => ({ ...prev, email: '' })); }}
                      data-testid="input-email"
                    />
                    {errors.email && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-email">{errors.email}</p>}
                  </div>
                  <div>
                    <Field
                      label="Password"
                      type="password"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors((prev) => ({ ...prev, password: '' })); }}
                      data-testid="input-password"
                    />
                    {errors.password && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-password">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="mt-2 h-12" data-testid="button-next-company">
                    Next: Company Details <ArrowRight size={17} />
                  </Button>
                </form>
              )}

              {providerStep === 2 && (
                <form onSubmit={(e) => { e.preventDefault(); handleNextStep(2); }} className="grid gap-4" data-testid="form-provider-company">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-display text-lg font-bold" data-testid="heading-company-details">Company Details</h3>
                    <span className="text-xs text-muted-foreground">Step 2 of 4</span>
                  </div>
                  <div>
                    <Field
                      label="Company Name"
                      required
                      value={providerForm.companyName}
                      onChange={(e) => { setProviderForm({ ...providerForm, companyName: e.target.value }); setErrors((prev) => ({ ...prev, companyName: '' })); }}
                      data-testid="input-company-name"
                    />
                    {errors.companyName && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-company-name">{errors.companyName}</p>}
                  </div>
                  <div>
                    <Field
                      label="Company Registration Number"
                      required
                      value={providerForm.companyRegistrationNumber}
                      onChange={(e) => { setProviderForm({ ...providerForm, companyRegistrationNumber: e.target.value }); setErrors((prev) => ({ ...prev, companyRegistrationNumber: '' })); }}
                      data-testid="input-company-reg"
                    />
                    {errors.companyRegistrationNumber && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-company-reg">{errors.companyRegistrationNumber}</p>}
                  </div>
                  <div>
                    <Field
                      label="GST Number"
                      required
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      value={providerForm.gstNumber}
                      onChange={(e) => { setProviderForm({ ...providerForm, gstNumber: e.target.value.toUpperCase() }); setErrors((prev) => ({ ...prev, gstNumber: '' })); }}
                      data-testid="input-company-gst"
                    />
                    {errors.gstNumber && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-company-gst">{errors.gstNumber}</p>}
                  </div>
                  <div>
                    <Field
                      label="Company Address"
                      required
                      value={providerForm.companyAddress}
                      onChange={(e) => { setProviderForm({ ...providerForm, companyAddress: e.target.value }); setErrors((prev) => ({ ...prev, companyAddress: '' })); }}
                      data-testid="input-company-address"
                    />
                    {errors.companyAddress && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-company-address">{errors.companyAddress}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Field
                        label="City"
                        required
                        value={providerForm.city}
                        onChange={(e) => { setProviderForm({ ...providerForm, city: e.target.value }); setErrors((prev) => ({ ...prev, city: '' })); }}
                        data-testid="input-company-city"
                      />
                      {errors.city && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-company-city">{errors.city}</p>}
                    </div>
                    <div>
                      <Field
                        label="State"
                        required
                        value={providerForm.state}
                        onChange={(e) => { setProviderForm({ ...providerForm, state: e.target.value }); setErrors((prev) => ({ ...prev, state: '' })); }}
                        data-testid="input-company-state"
                      />
                      {errors.state && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-company-state">{errors.state}</p>}
                    </div>
                  </div>
                  <div>
                    <Field
                      label="Pincode"
                      required
                      maxLength={6}
                      placeholder="6-digit pincode"
                      value={providerForm.pincode}
                      onChange={(e) => { setProviderForm({ ...providerForm, pincode: e.target.value }); setErrors((prev) => ({ ...prev, pincode: '' })); }}
                      data-testid="input-company-pincode"
                    />
                    {errors.pincode && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-company-pincode">{errors.pincode}</p>}
                  </div>
                  <div className="mt-2 flex gap-3">
                    <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setProviderStep(1)} data-testid="button-back-step">
                      <ChevronLeft size={16} /> Back
                    </Button>
                    <Button type="submit" className="h-12 flex-[2]" data-testid="button-next-owner">
                      Next: Owner Details <ArrowRight size={17} />
                    </Button>
                  </div>
                </form>
              )}

              {providerStep === 3 && (
                <form onSubmit={(e) => { e.preventDefault(); handleNextStep(3); }} className="grid gap-4" data-testid="form-provider-owner">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-display text-lg font-bold" data-testid="heading-owner-details">Owner Details</h3>
                    <span className="text-xs text-muted-foreground">Step 3 of 4</span>
                  </div>
                  <div>
                    <Field
                      label="Owner Full Name"
                      required
                      value={providerForm.ownerName}
                      onChange={(e) => { setProviderForm({ ...providerForm, ownerName: e.target.value }); setErrors((prev) => ({ ...prev, ownerName: '' })); }}
                      data-testid="input-owner-name"
                    />
                    {errors.ownerName && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-owner-name">{errors.ownerName}</p>}
                  </div>
                  <div>
                    <Field
                      label="Owner Email"
                      type="email"
                      required
                      value={providerForm.ownerEmail}
                      onChange={(e) => { setProviderForm({ ...providerForm, ownerEmail: e.target.value }); setErrors((prev) => ({ ...prev, ownerEmail: '' })); }}
                      data-testid="input-owner-email"
                    />
                    {errors.ownerEmail && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-owner-email">{errors.ownerEmail}</p>}
                  </div>
                  <div>
                    <Field
                      label="Owner Phone Number"
                      required
                      value={providerForm.ownerPhone}
                      onChange={(e) => { setProviderForm({ ...providerForm, ownerPhone: e.target.value }); setErrors((prev) => ({ ...prev, ownerPhone: '' })); }}
                      data-testid="input-owner-phone"
                    />
                    {errors.ownerPhone && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-owner-phone">{errors.ownerPhone}</p>}
                  </div>
                  <div>
                    <Field
                      label="Owner Date of Birth"
                      type="date"
                      required
                      value={providerForm.ownerDob}
                      onChange={(e) => { setProviderForm({ ...providerForm, ownerDob: e.target.value }); setErrors((prev) => ({ ...prev, ownerDob: '' })); }}
                      data-testid="input-owner-dob"
                    />
                    {errors.ownerDob && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-owner-dob">{errors.ownerDob}</p>}
                  </div>
                  <div className="mt-2 flex gap-3">
                    <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setProviderStep(2)} data-testid="button-back-step">
                      <ChevronLeft size={16} /> Back
                    </Button>
                    <Button type="submit" className="h-12 flex-[2]" data-testid="button-next-kyc">
                      Next: KYC Details <ArrowRight size={17} />
                    </Button>
                  </div>
                </form>
              )}

              {providerStep === 4 && (
                <form onSubmit={handleProviderSubmit} className="grid gap-4" data-testid="form-provider-kyc">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-display text-lg font-bold" data-testid="heading-kyc-details">KYC Details</h3>
                    <span className="text-xs text-muted-foreground">Step 4 of 4</span>
                  </div>
                  <div>
                    <label className="grid gap-1.5 text-sm font-medium text-foreground">
                      <span>KYC ID Type</span>
                      <select
                        className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15"
                        value={providerForm.kycType}
                        onChange={(e) => { setProviderForm({ ...providerForm, kycType: e.target.value }); setErrors((prev) => ({ ...prev, kycType: '' })); }}
                        data-testid="select-kyc-type"
                      >
                        <option value="">Select KYC ID Type</option>
                        <option value="Aadhaar">Aadhaar</option>
                        <option value="PAN">PAN</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    {errors.kycType && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-kyc-type">{errors.kycType}</p>}
                  </div>
                  <div>
                    <Field
                      label="KYC ID Number"
                      required
                      placeholder={providerForm.kycType === 'Aadhaar' ? '12-digit Aadhaar number' : providerForm.kycType === 'PAN' ? '10-character PAN (e.g. ABCDE1234F)' : 'Enter KYC ID number'}
                      value={providerForm.kycNumber}
                      onChange={(e) => { setProviderForm({ ...providerForm, kycNumber: e.target.value }); setErrors((prev) => ({ ...prev, kycNumber: '' })); }}
                      data-testid="input-kyc-number"
                    />
                    {errors.kycNumber && <p className="mt-1 text-xs text-destructive font-medium" data-testid="error-kyc-number">{errors.kycNumber}</p>}
                  </div>
                  {serverError && (
                    <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" data-testid="form-error">
                      {serverError}
                    </div>
                  )}
                  <div className="mt-2 flex gap-3">
                    <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setProviderStep(3)} data-testid="button-back-step">
                      <ChevronLeft size={16} /> Back
                    </Button>
                    <Button type="submit" className="h-12 flex-[2]" disabled={busy} data-testid="button-auth-submit">
                      {busy ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />} Complete Registration
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'New to SafarSetu?' : 'Already have an account?'} <Link href={mode === 'login' ? '/register' : '/login'} className="font-semibold text-primary hover:underline" data-testid="link-auth-switch">{mode === 'login' ? 'Create one' : 'Sign in'}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ProtectedSkeleton() {
  return <div className="min-h-[100dvh] bg-background p-8"><Skeleton className="h-10 w-44" /><div className="mt-12 grid gap-4 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;
}
export function Protected({ role, children }: { role: string; children: ReactNode }) {
  // `mounted` guards every localStorage read: Next.js server-renders this client
  // component for the initial HTML (no `window`/`localStorage` there), so the
  // first client render must match that server output exactly, or React throws
  // a hydration mismatch. We render the same skeleton on the server and on the
  // very first client pass, and only branch on the real auth state after mount.
  const [, setLocation] = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const hasToken = mounted && !!getToken();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: hasToken, retry: false } });
  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) setLocation('/login');
    else if (me.isError) { clearToken(); setLocation('/login'); }
    else if (me.data && me.data.role !== role) setLocation(me.data.role === 'PROVIDER' ? '/provider/dashboard' : me.data.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard');
  }, [mounted, me.data, me.isError, role, setLocation]);
  if (!mounted) return <ProtectedSkeleton />;
  if (!getToken()) return null;
  if (me.isLoading || me.isError) return <ProtectedSkeleton />;
  return <AppShell role={me.data?.role || role} user={me.data}>{children}</AppShell>;
}

export function DashboardPage({ role }: { role: 'CUSTOMER' | 'PROVIDER' }) {
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } }); const data = summary.data; const metrics = data?.metrics || {};
  return <Protected role={role}><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{role === 'PROVIDER' ? 'Provider workspace' : 'Your travel desk'}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{role === 'PROVIDER' ? 'Keep the wheels turning.' : 'Your rides, at a glance.'}</h1><p className="mt-2 text-sm text-muted-foreground">{role === 'PROVIDER' ? 'A quick view of your marketplace activity.' : 'Everything you need for the next journey.'}</p></div>{role === 'CUSTOMER' && <Link href="/search" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-new-request"><Plus size={17} /> New ride request</Link>}{role === 'PROVIDER' && <Link href="/provider/listings" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-new-listing"><Plus size={17} /> Add listing</Link>}</div>{summary.isError ? <div className="mt-8"><ErrorState retry={() => summary.refetch()} /></div> : <><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(role === 'CUSTOMER' ? [['Active requests', metrics.activeLeads ?? 0, FileText], ['Quotes received', metrics.quotations ?? 0, CircleDollarSign], ['Trips completed', metrics.completedTrips ?? 0, Check], ['Saved providers', metrics.savedProviders ?? 0, Star]] : [['Open leads', metrics.openLeads ?? 0, FileText], ['Quotes sent', metrics.quotations ?? 0, CircleDollarSign], ['Active listings', metrics.activeListings ?? 0, Compass], ['Avg. response', `${metrics.averageResponseMinutes ?? 0}m`, Clock3]]).map(([label, value, Icon]: any, i) => <div key={label as string} className={cx('rise-in rounded-2xl border border-border bg-card p-5', `delay-${Math.min(i + 1, 4)}`)}><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon size={18} className="text-primary" /></div><p className="mt-5 font-display text-3xl font-bold">{value}</p><div className="mt-3 flex items-center gap-1 text-xs text-accent"><TrendingUp size={13} /> {i === 0 ? 'Updated just now' : 'This month'}</div></div>)}</div><div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{role === 'CUSTOMER' ? 'Recent requests' : 'Latest leads'}</h2><Link href={role === 'CUSTOMER' ? '/customer/leads' : '/provider/leads'} className="text-sm font-semibold text-primary" data-testid="link-dashboard-view-all">View all</Link></div>{data?.recentLeads?.length ? <div className="mt-5 grid gap-2">{data.recentLeads.slice(0, 5).map((lead) => <LeadRow key={lead.id} lead={lead} role={role} />)}</div> : <div className="py-12"><EmptyState icon={FileText} title="No requests yet" copy={role === 'CUSTOMER' ? 'Your next route starts with a quick search.' : 'New trip requests will appear here.'} /></div>}</section><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{role === 'CUSTOMER' ? 'How it works' : 'A note for today'}</h2>{role === 'CUSTOMER' ? <div className="mt-6 grid gap-5">{[['01', 'Tell us the route', 'Share where, when, and how many people.'], ['02', 'Compare real quotes', 'Local providers respond to your actual trip.'], ['03', 'Pick with confidence', 'Accept the quote that feels right.']].map(([n, t, c]) => <div className="flex gap-3" key={n}><span className="font-mono text-xs font-bold text-primary">{n}</span><div><h3 className="text-sm font-semibold">{t}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{c}</p></div></div>)}</div> : <div className="mt-6 rounded-2xl bg-secondary/70 p-5"><p className="font-display text-2xl font-bold text-secondary-foreground">Reply fast.<br />Win trust.</p><p className="mt-3 text-sm leading-6 text-secondary-foreground/70">A thoughtful message often matters as much as the price.</p></div>}</section></div></>}</Protected>;
}
function LeadRow({ lead, role }: { lead: Lead; role: string }) { return <Link href={`${role === 'PROVIDER' ? '/provider/leads/' : '/customer/leads/'}${lead.id}`} className="group flex items-center justify-between gap-4 rounded-xl border border-transparent p-3 hover:border-border hover:bg-muted/50" data-testid={`row-lead-${lead.id}`}><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><MapPin size={17} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{lead.source} <span className="text-primary">→</span> {lead.destination}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(lead.travelDate)} · {lead.passengers} passengers</p></div></div><div className="flex shrink-0 items-center gap-3"><Status>{lead.status}</Status><ChevronDown className="-rotate-90 text-muted-foreground group-hover:text-primary" size={16} /></div></Link>; }

export function CustomerLeads() {
  const leads = useListLeads({ query: { queryKey: getListLeadsQueryKey() } }); return <Protected role="CUSTOMER"><PageHeading eyebrow="Your travel desk" title="Ride requests" copy="Keep track of your routes and the quotes coming in." action={<Link href="/search" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-lead-search"><Plus size={17} /> New request</Link>} />{leads.isLoading ? <div className="mt-8 grid gap-3">{[1,2,3].map((x) => <Skeleton key={x} className="h-20" />)}</div> : leads.isError ? <div className="mt-8"><ErrorState retry={() => leads.refetch()} /></div> : leads.data?.length ? <div className="mt-8 grid gap-3">{leads.data.map((lead) => <LeadRow key={lead.id} lead={lead} role="CUSTOMER" />)}</div> : <div className="mt-8"><EmptyState icon={FileText} title="Your first request is one search away" copy="Compare local providers for your next trip." action={<Link href="/search" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-empty-leads">Find a ride</Link>} /></div>}</Protected>;
}
export function LeadDetail({ role }: { role: 'CUSTOMER' | 'PROVIDER' }) {
  const { id = '' } = useParams<{ id: string }>(); const lead = useGetLead(id, { query: { queryKey: getGetLeadQueryKey(id), enabled: !!id } }); const updateLead = useUpdateLead(); const updateQuote = useUpdateQuotation(); const createQuote = useCreateQuotation(); const [quote, setQuote] = useState({ price: '', message: '' }); const [notice, setNotice] = useState('');
  const d = lead.data; const quotations = d?.quotations || [];
  return <Protected role={role}><Link href={role === 'CUSTOMER' ? '/customer/leads' : '/provider/leads'} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary" data-testid="link-back-leads"><ChevronLeft size={16} /> Back to requests</Link>{lead.isLoading ? <div className="mt-8"><Skeleton className="h-52" /></div> : lead.isError || !d ? <div className="mt-8"><ErrorState retry={() => lead.refetch()} /></div> : <div className="mt-7 grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section><div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Trip request</p><h1 className="mt-2 font-display text-3xl font-bold">{d.source} <span className="text-primary">→</span> {d.destination}</h1></div><Status>{d.status}</Status></div><div className="mt-7 grid grid-cols-2 gap-5 border-t border-border pt-5 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Travel date</p><p className="mt-1 text-sm font-semibold">{dateLabel(d.travelDate)}</p></div><div><p className="text-xs text-muted-foreground">Passengers</p><p className="mt-1 text-sm font-semibold">{d.passengers}</p></div><div><p className="text-xs text-muted-foreground">Vehicle</p><p className="mt-1 text-sm font-semibold">{d.vehicleType}</p></div></div>{d.requirements && <div className="mt-6 rounded-xl bg-muted p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trip notes</p><p className="mt-2 text-sm leading-6">{d.requirements}</p></div>}</div>{role === 'PROVIDER' && <form onSubmit={(e) => { e.preventDefault(); createQuote.mutate({ data: { leadId: d.id, price: Number(quote.price), message: quote.message } }, { onSuccess: () => { setNotice('Quote sent to the customer.'); setQuote({ price: '', message: '' }); lead.refetch(); } }); }} className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Respond to this lead</p><div className="mt-4 grid gap-4"><Field label="Your quote" type="number" required placeholder="₹ total fare" value={quote.price} onChange={(e) => setQuote({ ...quote, price: e.target.value })} data-testid="input-quotation-price" /><Textarea label="Message to customer" required placeholder="Tell them what’s included..." value={quote.message} onChange={(e) => setQuote({ ...quote, message: e.target.value })} data-testid="input-quotation-message" /><Button type="submit" disabled={createQuote.isPending} data-testid="button-submit-quotation">{createQuote.isPending ? <Loader2 className="animate-spin" size={16} /> : <SendIcon />} Send quotation</Button>{notice && <p className="text-sm font-semibold text-accent">{notice}</p>}</div></form>}</section><section><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Responses</p><h2 className="mt-1 font-display text-2xl font-bold">{quotations.length} quotations</h2></div><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">{role === 'CUSTOMER' ? 'Compare & choose' : 'Your opportunity'}</span></div>{quotations.length ? <div className="grid gap-3">{quotations.map((q) => <QuotationCard key={q.id} quotation={q} role={role} onAction={(status) => updateQuote.mutate({ id: q.id, data: { status } }, { onSuccess: () => { setNotice(`Quotation ${status.toLowerCase()}.`); lead.refetch(); } })} />)}</div> : <EmptyState icon={CircleDollarSign} title="No quotations yet" copy={role === 'CUSTOMER' ? 'Providers will see your request and respond here.' : 'Be the first provider to send a clear, competitive quote.'} />}</section></div>}</Protected>;
}
function SendIcon() { return <ArrowRight size={16} />; }
function QuotationCard({ quotation, role, onAction }: { quotation: Quotation; role: string; onAction: (status: 'ACCEPTED' | 'REJECTED') => void }) { return <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{initials(quotation.providerName)}</div><div><p className="font-semibold">{quotation.companyName || quotation.providerName}</p><p className="text-xs text-muted-foreground">{quotation.providerName} · {dateLabel(quotation.createdAt)}</p></div></div><Status>{quotation.status}</Status></div><div className="mt-5 flex items-end justify-between gap-4"><div><p className="font-display text-2xl font-bold">{money(quotation.price)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{quotation.message}</p></div>{role === 'CUSTOMER' && quotation.status === 'PENDING' && <div className="flex gap-2"><Button variant="outline" onClick={() => onAction('REJECTED')} data-testid={`button-reject-${quotation.id}`}>Pass</Button><Button onClick={() => onAction('ACCEPTED')} data-testid={`button-accept-${quotation.id}`}><Check size={16} /> Accept</Button></div>}</div></div>; }

function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: ReactNode }) { return <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{copy}</p></div>{action}</div>; }

export function ProfilePage({ role }: { role: 'CUSTOMER' | 'PROVIDER' }) {
  const customer = useGetCustomerProfile({ query: { queryKey: getGetCustomerProfileQueryKey(), enabled: role === 'CUSTOMER' } }); const provider = useGetProviderProfile({ query: { queryKey: getGetProviderProfileQueryKey(), enabled: role === 'PROVIDER' } }); const updateCustomer = useUpdateCustomerProfile(); const updateProvider = useUpdateProviderProfile(); const d: any = role === 'CUSTOMER' ? customer.data : provider.data; const [form, setForm] = useState<any>(null); useEffect(() => { if (d) setForm({ name: d.name || '', phone: d.phone || '', ...(role === 'CUSTOMER' ? { city: d.city || '', preferences: d.preferences || '' } : { companyName: d.companyName || '', description: d.description || '', address: d.address || '' }) }); }, [d, role]); const save = (e: FormEvent) => { e.preventDefault(); (role === 'CUSTOMER' ? updateCustomer : updateProvider).mutate({ data: form }, { onSuccess: () => setNotice('Profile saved.') }); }; const [notice, setNotice] = useState('');
  return <Protected role={role}><PageHeading eyebrow="Your details" title={role === 'CUSTOMER' ? 'Profile' : 'Business profile'} copy={role === 'CUSTOMER' ? 'Keep your details ready for a smoother booking.' : 'Help riders choose you with a profile that feels real.'} />{(role === 'CUSTOMER' ? customer.isError : provider.isError) ? <div className="mt-8"><ErrorState retry={() => (role === 'CUSTOMER' ? customer.refetch() : provider.refetch())} /></div> : !form ? <div className="mt-8"><Skeleton className="h-96" /></div> : <form onSubmit={save} className="mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><Field label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-profile-name" /><Field label="Phone number" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-profile-phone" />{role === 'CUSTOMER' ? <><Field label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="input-profile-city" /><Textarea className="sm:col-span-2" label="Travel preferences" value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} data-testid="input-profile-preferences" /></> : <><Field label="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} data-testid="input-company-name" /><Field label="Base address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-company-address" /><Textarea className="sm:col-span-2" label="About your service" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-company-description" /></>}</div><div className="mt-7 flex items-center gap-4 border-t border-border pt-5"><Button type="submit" disabled={updateCustomer.isPending || updateProvider.isPending} data-testid="button-save-profile">Save changes</Button>{notice && <span className="text-sm font-semibold text-accent">{notice}</span>}{(updateCustomer.isError || updateProvider.isError) && <span className="text-sm font-semibold text-destructive">Could not save. Please try again.</span>}</div></form>}</Protected>;
}

export function ProviderLeads() { const leads = useListLeads({ query: { queryKey: getListLeadsQueryKey() } }); return <Protected role="PROVIDER"><PageHeading eyebrow="Marketplace pulse" title="Incoming leads" copy="Respond thoughtfully. The best rides start with a clear answer." />{leads.isLoading ? <div className="mt-8 grid gap-3">{[1,2,3].map((x) => <Skeleton key={x} className="h-20" />)}</div> : leads.data?.length ? <div className="mt-8 grid gap-3">{leads.data.map((lead) => <LeadRow key={lead.id} lead={lead} role="PROVIDER" />)}</div> : <div className="mt-8"><EmptyState icon={FileText} title="No open leads just yet" copy="Keep your listings active and new requests will land here." /></div>}</Protected>; }

type Resource = 'vehicles' | 'drivers' | 'listings';
export function ResourcePage({ resource }: { resource: Resource }) {
  const [editing, setEditing] = useState<any>(null); const [open, setOpen] = useState(false); const qc = useQueryClient();
  const vehicles = useListVehicles({ query: { queryKey: getListVehiclesQueryKey() } }); const drivers = useListDrivers({ query: { queryKey: getListDriversQueryKey() } }); const listings = useListListings(undefined, { query: { queryKey: getListListingsQueryKey() } }); const deleteVehicle = useDeleteVehicle(); const deleteDriver = useDeleteDriver(); const deleteListing = useDeleteListing();
  const title = resource[0].toUpperCase() + resource.slice(1); const data: any[] = resource === 'vehicles' ? (vehicles.data || []) : resource === 'drivers' ? (drivers.data || []) : (listings.data || []); const query = resource === 'vehicles' ? vehicles : resource === 'drivers' ? drivers : listings;
  const close = () => { setOpen(false); setEditing(null); }; return <Protected role="PROVIDER"><PageHeading eyebrow="Your fleet" title={title} copy={resource === 'listings' ? 'Control which routes customers can discover.' : resource === 'vehicles' ? 'Keep your available cars and capacities up to date.' : 'Introduce the people your customers will meet.'} action={<Button onClick={() => { setEditing(null); setOpen(true); }} data-testid={`button-add-${resource}`}><Plus size={17} /> Add {resource.slice(0, -1)}</Button>} />{query.isLoading ? <div className="mt-8 grid gap-3 sm:grid-cols-2">{[1,2,3].map((x) => <Skeleton key={x} className="h-40" />)}</div> : query.isError ? <div className="mt-8"><ErrorState retry={() => query.refetch()} /></div> : data.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.map((item) => <ResourceCard key={item.id} resource={resource} item={item} onEdit={() => { setEditing(item); setOpen(true); }} onDelete={() => { if (confirm('Remove this item?')) { if (resource === 'vehicles') deleteVehicle.mutate({ id: item.id }, { onSuccess: () => vehicles.refetch() }); else if (resource === 'drivers') deleteDriver.mutate({ id: item.id }, { onSuccess: () => drivers.refetch() }); else deleteListing.mutate({ id: item.id }, { onSuccess: () => listings.refetch() }); } }} />)}</div> : <div className="mt-8"><EmptyState icon={resource === 'vehicles' ? CarFront : resource === 'drivers' ? Users : Compass} title={`No ${resource} yet`} copy={`Add your first ${resource.slice(0, -1)} to get started.`} action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Add one</Button>} /></div>}{open && <ResourceDialog resource={resource} editing={editing} onClose={close} onSaved={() => { close(); qc.invalidateQueries({ queryKey: resource === 'vehicles' ? getListVehiclesQueryKey() : resource === 'drivers' ? getListDriversQueryKey() : getListListingsQueryKey() }); }} />}</Protected>;
}
function ResourceCard({ resource, item, onEdit, onDelete }: { resource: Resource; item: any; onEdit: () => void; onDelete: () => void }) { return <div className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">{resource === 'vehicles' ? <CarFront size={20} /> : resource === 'drivers' ? <Users size={20} /> : <Compass size={20} />}</div><div className="flex gap-1 opacity-70"><button onClick={onEdit} className="rounded-lg p-2 hover:bg-muted hover:text-primary" aria-label="Edit" data-testid={`button-edit-${item.id}`}><Pencil size={15} /></button><button onClick={onDelete} className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive" aria-label="Delete" data-testid={`button-delete-${item.id}`}><Trash2 size={15} /></button></div></div><h3 className="mt-5 font-display font-bold">{resource === 'vehicles' ? `${item.model} · ${item.vehicleType}` : resource === 'drivers' ? item.name : item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{resource === 'vehicles' ? `${item.registrationNumber} · ${item.seatingCapacity} seats` : resource === 'drivers' ? `${item.phone} · ${item.licenseNumber}` : `${item.source} → ${item.destination}`}</p>{resource === 'listings' && <div className="mt-4 flex items-center justify-between"><Status>{item.status}</Status><span className="font-display font-bold">{money(item.price)}</span></div>}</div>; }
function ResourceDialog({ resource, editing, onClose, onSaved }: { resource: Resource; editing: any; onClose: () => void; onSaved: () => void }) {
  const createV = useCreateVehicle(); const updateV = useUpdateVehicle(); const createD = useCreateDriver(); const updateD = useUpdateDriver(); const createL = useCreateListing(); const updateL = useUpdateListing();
  const vehicleOptions = useListVehicles({ query: { queryKey: getListVehiclesQueryKey(), enabled: resource === 'listings' } });
  const [f, setF] = useState<any>(editing || (resource === 'vehicles' ? { vehicleType: 'Sedan', model: '', registrationNumber: '', seatingCapacity: 4, description: '', imageUrl: '' } : resource === 'drivers' ? { name: '', phone: '', licenseNumber: '', aadharId: '' } : { vehicleId: '', title: '', description: '', source: '', destination: '', price: 0, status: 'ACTIVE' }));
  const [formError, setFormError] = useState('');
  const save = (e: FormEvent) => { e.preventDefault(); setFormError(''); const done = { onSuccess: onSaved, onError: (err: any) => setFormError(err?.message || 'Could not save. Please check the details and try again.') }; if (resource === 'vehicles') editing ? updateV.mutate({ id: editing.id, data: { ...f, seatingCapacity: Number(f.seatingCapacity) } }, done) : createV.mutate({ data: { ...f, seatingCapacity: Number(f.seatingCapacity) } }, done); else if (resource === 'drivers') editing ? updateD.mutate({ id: editing.id, data: f }, done) : createD.mutate({ data: f }, done); else editing ? updateL.mutate({ id: editing.id, data: { ...f, price: Number(f.price) } }, done) : createL.mutate({ data: { ...f, price: Number(f.price) } }, done); };
  const busy = createV.isPending || updateV.isPending || createD.isPending || updateD.isPending || createL.isPending || updateL.isPending;
  return <div className="fixed inset-0 z-40 grid place-items-center bg-sidebar/45 p-4 backdrop-blur-sm"><div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">{editing ? 'Edit details' : 'Add to your fleet'}</p><h2 className="mt-2 font-display text-2xl font-bold">{editing ? `Edit ${resource.slice(0, -1)}` : `New ${resource.slice(0, -1)}`}</h2></div><button onClick={onClose} className="rounded-xl p-2 hover:bg-muted" aria-label="Close dialog" data-testid="button-close-dialog"><X size={18} /></button></div><form onSubmit={save} className="mt-7 grid gap-4 sm:grid-cols-2">{resource === 'vehicles' && <><SelectField label="Vehicle type" value={f.vehicleType} onChange={(e) => setF({ ...f, vehicleType: e.target.value })} options={['Sedan', 'SUV', 'Hatchback', 'Tempo Traveller']} /><Field label="Model" required value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} data-testid="input-vehicle-model" /><Field label="Registration number" required value={f.registrationNumber} onChange={(e) => setF({ ...f, registrationNumber: e.target.value })} data-testid="input-registration" /><Field label="Seats" type="number" min="1" required value={f.seatingCapacity} onChange={(e) => setF({ ...f, seatingCapacity: e.target.value })} data-testid="input-seats" /><Textarea className="sm:col-span-2" label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="input-vehicle-description" /></>}{resource === 'drivers' && <><Field className="sm:col-span-2" label="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="input-driver-name" /><Field label="Phone" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} data-testid="input-driver-phone" /><Field label="License number" required value={f.licenseNumber} onChange={(e) => setF({ ...f, licenseNumber: e.target.value })} data-testid="input-license" /><Field className="sm:col-span-2" label="Aadhar ID (KYC)" required minLength={4} value={f.aadharId} onChange={(e) => setF({ ...f, aadharId: e.target.value })} placeholder="XXXX XXXX XXXX" data-testid="input-driver-aadhar" /></>}{resource === 'listings' && <><Field className="sm:col-span-2" label="Listing title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="input-listing-title" />{vehicleOptions.data?.length ? <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2"><span>Vehicle</span><select required value={f.vehicleId} onChange={(e) => setF({ ...f, vehicleId: e.target.value })} className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="select-listing-vehicle"><option value="" disabled>Choose a vehicle from your fleet</option>{vehicleOptions.data.map((v: any) => <option key={v.id} value={v.id}>{v.model} · {v.registrationNumber}</option>)}</select></label> : <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground sm:col-span-2">You don&apos;t have any vehicles yet. <Link href="/provider/vehicles" className="font-semibold text-primary hover:underline">Add a vehicle</Link> first, then come back to create a listing.</p>}<Field label="Price" type="number" min="0" required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} data-testid="input-listing-price" /><Field label="From" required value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} data-testid="input-listing-source" /><Field label="To" required value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} data-testid="input-listing-destination" /><SelectField label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={['ACTIVE', 'PAUSED']} /><Textarea className="sm:col-span-2" label="Description" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="input-listing-description" /></>}{formError && <p className="text-sm text-destructive sm:col-span-2" role="alert">{formError}</p>}<div className="mt-2 flex justify-end gap-2 border-t border-border pt-5 sm:col-span-2"><Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel-dialog">Cancel</Button><Button type="submit" disabled={busy || (resource === 'listings' && !vehicleOptions.data?.length)} data-testid="button-save-resource">{busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save</Button></div></form></div></div>;
}

export function AdminPage() { const overview = useGetAdminOverview({ query: { queryKey: getGetAdminOverviewQueryKey() } }); const users = useListAdminUsers({ query: { queryKey: getListAdminUsersQueryKey() } }); return <Protected role="ADMIN"><PageHeading eyebrow="Control room" title="Platform overview" copy="A clear pulse on the SafarSetu marketplace." /><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{overview.isLoading ? [1,2,3,4].map((x) => <Skeleton key={x} className="h-32" />) : [['Users', overview.data?.users, Users], ['Customers', overview.data?.customers, UserRound], ['Providers', overview.data?.providers, BriefcaseBusiness], ['Vehicles', overview.data?.vehicles, CarFront], ['Listings', overview.data?.listings, Compass], ['Leads', overview.data?.leads, FileText], ['Quotations', overview.data?.quotations, CircleDollarSign]].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><Icon size={18} className="text-primary" /><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value ?? 0}</p></div>)}</div><section className="mt-8 rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Directory</p><h2 className="mt-1 font-display text-xl font-bold">Registered users</h2></div><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">{users.data?.length || 0} accounts</span></div>{users.isLoading ? <div className="mt-6 grid gap-2">{[1,2,3].map((x) => <Skeleton key={x} className="h-14" />)}</div> : users.data?.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3 font-semibold">Name</th><th className="pb-3 font-semibold">Email</th><th className="pb-3 font-semibold">Role</th><th className="pb-3 font-semibold">Joined</th></tr></thead><tbody>{users.data.map((u) => <tr key={u.id} className="border-b border-border/60 last:border-0"><td className="py-4 font-semibold">{u.name}</td><td className="py-4 text-muted-foreground">{u.email}</td><td className="py-4"><Status>{u.role}</Status></td><td className="py-4 text-muted-foreground">{dateLabel(u.createdAt)}</td></tr>)}</tbody></table></div> : <div className="py-8"><EmptyState icon={Users} title="No users found" copy="New accounts will show up here." /></div>}</section></Protected>; }

