"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star } from "lucide-react";
import { useRouter } from "next/navigation";


interface Therapist {
  _id: string;
  fullName: string;
  image: string;
  summary: string;
  specialties: string[];
}

export default function BrowseTherapists() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [specialty, setSpecialty] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const response = await fetch("/api/therapists");
      const data = await response.json();
      setTherapists(data);
    } catch (error) {
      console.error("Error fetching therapists:", error);
    }
  };

  const filteredTherapists = therapists.filter((therapist) => {
    const matchesSearch = therapist.fullName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSpecialty = !specialty || therapist.specialties.includes(specialty);
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Find Your Therapist</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search therapists..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md p-2"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
        >
          <option value="">All Specialties</option>
          <option value="Anxiety">Anxiety</option>
          <option value="Depression">Depression</option>
          <option value="Relationships">Relationships</option>
          <option value="Stress">Stress</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTherapists.map((therapist) => (
          <Card key={therapist._id} className="overflow-hidden">
            <img
              src={therapist.image}
              alt={therapist.fullName}
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{therapist.fullName}</h3>
              <p className="text-gray-600 mb-4">{therapist.summary}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {therapist.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push(`/book-appointment?therapist=${therapist._id}`)}
              >
                Book Appointment
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}