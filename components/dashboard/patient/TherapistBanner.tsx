"use client"

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, MessageCircle, Calendar, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TherapistInfo {
  _id: string;
  fullName: string;
  image?: string;
  email?: string;
  specialties?: string[];
  experience?: number;
  rating?: number;
}

interface TherapistBannerProps {
  className?: string;
  appointments?: any[]; // Pass appointments to extract therapist info
}

export default function TherapistBanner({ className = "", appointments = [] }: TherapistBannerProps) {
  const [therapist, setTherapist] = useState<TherapistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getTherapistFromAppointments = () => {
      // Find the first appointment with a therapist assigned
      const appointmentWithTherapist = appointments.find(apt => apt.therapist && apt.therapist._id);
      
      if (appointmentWithTherapist && appointmentWithTherapist.therapist) {
        return {
          _id: appointmentWithTherapist.therapist._id,
          fullName: appointmentWithTherapist.therapist.fullName,
          image: appointmentWithTherapist.therapist.image,
          // Add default values for missing fields
          specialties: ['Mental Health'],
          experience: 5,
          rating: 4.8
        };
      }
      
      return null;
    };

    const fetchTherapist = async () => {
      try {
        setLoading(true);
        
        // First try to get therapist from appointments
        const therapistFromAppointments = getTherapistFromAppointments();
        if (therapistFromAppointments) {
          setTherapist(therapistFromAppointments);
          setLoading(false);
          return;
        }

        // Fallback to API call if no therapist found in appointments
        const response = await fetch('/api/patient/therapy');
        
        if (!response.ok) {
          if (response.status === 404) {
            // No therapist assigned - this is normal for new patients
            setTherapist(null);
            return;
          }
          throw new Error('Failed to fetch therapist information');
        }

        const data = await response.json();
        
        if (data.success && data.therapyId) {
          // Fetch detailed therapist information
          const therapistResponse = await fetch(`/api/patient/therapy/${data.therapyId}`);
          if (therapistResponse.ok) {
            const therapistData = await therapistResponse.json();
            setTherapist(therapistData);
          }
        } else {
          setTherapist(null);
        }
      } catch (err) {
        console.error('Error fetching therapist:', err);
        setError(err instanceof Error ? err.message : 'Failed to load therapist information');
      } finally {
        setLoading(false);
      }
    };

    fetchTherapist();
  }, [appointments]);

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 border-red-200 bg-red-50 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <User className="h-5 w-5" />
          <span className="text-sm">Unable to load therapist information</span>
        </div>
      </Card>
    );
  }

  if (!therapist) {
    // No therapist assigned - don't show banner
    return null;
  }

  return (
    <Card className={`p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {therapist.image ? (
              <img
                src={therapist.image}
                alt={therapist.fullName}
                className="h-12 w-12 rounded-full object-cover border-2 border-blue-200"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{therapist.fullName}</h3>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                Your Therapist
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {therapist.specialties?.join(", ") || "Mental Health Professional"}
              {therapist.experience && ` • ${therapist.experience}+ years experience`}
            </p>
            {therapist.rating && (
              <div className="flex items-center space-x-1 mt-1">
                <span className="text-sm text-gray-600">Rating:</span>
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full ${
                        i < Math.floor(therapist.rating!) ? 'bg-yellow-400' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">({therapist.rating})</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => window.open(`/therapist-profiles/${therapist._id}`, '_blank')}
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </div>
      </div>
    </Card>
  );
}
