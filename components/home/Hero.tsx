"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();

  return (
    <div className="relative px-6 lg:px-8">
      <div className="mx-auto max-w-3xl pt-20 pb-32 sm:pt-48 sm:pb-40">
        <div>
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative overflow-hidden rounded-full py-1.5 px-4 text-sm leading-6 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
              <span className="text-gray-600">
                Get started with online therapy today.{" "}
                <a href="#plans" className="font-semibold text-blue-600">
                  <span className="absolute inset-0" aria-hidden="true" />
                  See our plans <span aria-hidden="true">&rarr;</span>
                </a>
              </span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Your Journey to Mental Wellness Starts Here
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Connect with licensed therapists online, anytime, anywhere. Professional support tailored to your needs with flexible scheduling and secure video sessions.
            </p>
            <div className="mt-8 flex gap-x-4 justify-center">
              <Button
                onClick={() => router.push("/book-appointment")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Book Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/about")}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}