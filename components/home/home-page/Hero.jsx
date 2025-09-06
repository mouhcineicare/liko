'use client';

import { Container } from "../components/Container";
import Button from "../components/Button";
import { twMerge } from "tailwind-merge"; // Import tailwind-merge for dynamic class merging

export const Hero = () => {
  return (
    <section aria-labelledby="hero-title" className="py-12 sm:py-16 lg:py-20">
<Container className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-8 md:gap-10 lg:gap-12">
{/* Left Column (Title & Button) */}
<div className="w-full lg:w-1/2 flex flex-col items-center md:items-center lg:items-start text-center lg:text-left p-1">
          <span className="block mb-4">
            <img
              src={'/assets/img/heartl-ive.png'}
              width="80"
              className={twMerge("object-contain mx-auto lg:mx-0")} // Center on mobile, left-align on desktop
              alt="Heart live illustration"
              loading="lazy"
            />
          </span>

          <h1
  id="hero-title"
  className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-800 mb-6 text-center md:text-left lg:text-left"
>
  UAE'S Most Affordable{" "}
  <span className="text-blue-400">Online Therapy</span> Service,
  staffed by Licensed Therapists, for only 90 AED per session.
</h1>

<p className="text-gray-500 text-sm sm:text-base mb-8 text-center lg:text-left  md:text-left">
  We believe that healthcare can be affordable while maintaining its
  clinical integrity. By using our service, you are supporting our
  vision for a more affordable healthcare world. Together, step by
  step, we can make it happen.
</p>

          <div className="flex justify-center lg:justify-start">
            <Button
              className="text-white p-2 rounded-md bg-blue-500 hover:bg-blue-600 transition-colors duration-300"
              title="I'm Ready to Heal"
            />
          </div>
        </div>

        {/* Right Column (Image) */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          <img
            src={'/assets/img/hero1.png'}
            className={twMerge("object-contain w-[80%] lg:w-full max-w-md")} // Adjusted width for responsiveness
            alt="IcareWellBeing doctor image"
            loading="lazy"
          />
        </div>
      </Container>
    </section>
  );
};