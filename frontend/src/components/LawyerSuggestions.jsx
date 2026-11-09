import { useEffect, useState } from "react";
import { fetchLawyers } from "@/lib/dataService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export function LawyerSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const lawyers = await fetchLawyers();
        // Top 3 rated/priority lawyers
        const top = [...lawyers].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
        setSuggestions(top);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSuggestions();
  }, []);

  if (loading) return null;
  if (!suggestions.length) return null;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-xl">Recommended Lawyers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {suggestions.map(lawyer => (
            <div key={lawyer.id} className="border rounded-lg p-4 flex flex-col items-center text-center hover:shadow-md transition">
              <Avatar className="h-16 w-16 mb-4">
                <AvatarImage src={lawyer.avatar} />
                <AvatarFallback>{lawyer.name[0]}</AvatarFallback>
              </Avatar>
              <h4 className="font-semibold">{lawyer.name}</h4>
              <p className="text-sm text-muted-foreground">{lawyer.specialization?.join(", ")}</p>
              
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{lawyer.rating || "New"}</span>
                <span className="text-muted-foreground">({lawyer.totalReviews || 0} reviews)</span>
              </div>
              
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                 <MapPin className="h-3 w-3" /> {lawyer.location}
              </div>

              {lawyer.verified && (
                <Badge variant="secondary" className="mt-3">Verified</Badge>
              )}

              <Button className="w-full mt-4" variant="outline" onClick={() => navigate(`/lawyer/${lawyer.id}`)}>
                View Profile
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
