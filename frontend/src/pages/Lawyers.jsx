import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IndianRupee, MapPin, Search, Star, SlidersHorizontal } from "lucide-react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchLawyers } from "@/lib/dataService";
import { toast } from "sonner";

const DEFAULT_SPECIALIZATIONS = [
  "Corporate Law",
  "Criminal Defense",
  "Family Law",
  "Property Law",
  "Civil Litigation",
  "Startup Advisory",
  "Labour Law",
  "Consumer Protection",
  "Tax Law",
  "Cyber Law",
];

const DEFAULT_LOCATIONS = [
  "New Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
];

const Lawyers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [lawyers, setLawyers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLawyers = async () => {
      try {
        setIsLoading(true);
        const data = await fetchLawyers({
          q: searchQuery,
          specialization: selectedSpecialization,
          location: selectedLocation,
        });

        if (isMounted) {
          setLawyers(data || []);
        }
      } catch (error) {
        toast.error(error.message || "Unable to load lawyers.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLawyers();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedSpecialization, selectedLocation]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSpecialization("all");
    setSelectedLocation("all");
  };

  const specializationOptions = useMemo(
    () =>
      [...new Set([...DEFAULT_SPECIALIZATIONS, ...lawyers.flatMap((lawyer) => lawyer.specialization || [])])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [lawyers],
  );

  const locationOptions = useMemo(
    () =>
      [...new Set([...DEFAULT_LOCATIONS, ...lawyers.map((lawyer) => lawyer.location)])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [lawyers],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div id="main-content" className="flex-1">
        <section className="gradient-hero py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <Badge className="mb-4">Verified Legal Professionals</Badge>
              <h1 className="mb-4 text-4xl font-bold">Find the right lawyer for your legal issue</h1>
              <p className="text-lg text-muted-foreground">
                Filter by practice area, city, or search by name.
              </p>
            </div>

            <Card className="mt-8 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Search & Filters</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label className="mb-2 block text-sm font-medium">Keyword</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Name, specialization, city..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Specialization</label>
                    <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Specializations</SelectItem>
                        {specializationOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locationOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-muted-foreground">
              {isLoading ? "Loading lawyers..." : `${lawyers.length} lawyers found`}
            </p>
          </div>

          {lawyers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lawyers.map((lawyer) => (
                <Card key={lawyer.id} className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start gap-4">
                      <img
                        src={lawyer.avatar}
                        alt={`${lawyer.name} profile`}
                        loading="lazy"
                        className="h-16 w-16 rounded-full object-cover"
                      />

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{lawyer.name}</h3>
                            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {lawyer.location}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            {lawyer.verified ? <Badge variant="secondary">Verified</Badge> : null}
                            {lawyer.isSponsored ? <Badge className="bg-orange-500">Sponsored</Badge> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{lawyer.rating}</span>
                        <span className="text-muted-foreground">({lawyer.totalReviews} reviews)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Consultation</p>
                          <div className="flex items-baseline gap-1 text-primary">
                            <span className="font-bold text-base">₹ {lawyer.hourlyRate}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">/consultation</span>
                          </div>
                        </div>
                        <div className="space-y-1 border-l pl-4">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Case Fee</p>
                          <div className="flex items-baseline gap-1 text-primary">
                            <span className="font-bold text-base">₹ {lawyer.baseCaseFee || 5000}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">/case</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-3 font-medium">
                        {lawyer.experience || 0} years of experience
                      </p>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {(lawyer.specialization || []).slice(0, 3).map((spec) => (
                        <Badge key={`${lawyer.id}-${spec}`} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>

                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{lawyer.bio}</p>

                    <Link to={`/lawyer/${lawyer.id}`} className="block">
                      <Button className="w-full">View Profile</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !isLoading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="mb-4 text-muted-foreground">No lawyers match your current filters.</p>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Lawyers;
