"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Plan {
  _id: string;
  title: string;
  price: number;
  type: string;
  description: string;
  features: string[];
  active: boolean;
}

export default function TherapyPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/plans",{ cache: 'no-store' });
        if (!response.ok) {
          throw new Error("Failed to fetch plans");
        }
        const data = await response.json();
        setPlans(data);
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (isLoading) {
    return (
      <section id="plans" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Choose Your Therapy Plan
            </h2>
            <p className="mt-4 text-xl text-gray-600">Loading plans...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="plans" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Choose Your Therapy Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Flexible plans designed to meet your needs
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card 
              key={plan._id} 
              className="p-8 bg-white hover:shadow-lg transition-shadow border-gray-200"
            >
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-semibold text-gray-900">{plan.title}</h3>
                <p className="mt-4 text-gray-500">{plan.description}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">د.إ{plan.price}</span>
                  <span className="ml-2 text-gray-500">/session</span>
                </div>
                <ul className="mt-6 space-y-4 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg
                        className="h-5 w-5 text-blue-500"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="ml-3 text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => router.push(`/book-appointment?plan=${plan._id}`)}
                  className="mt-8 w-full bg-blue-600 hover:bg-blue-700"
                >
                  Book Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}