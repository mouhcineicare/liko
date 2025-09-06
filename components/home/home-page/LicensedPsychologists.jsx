'use client';
import SectionTitle from "../components/SectionTitle";
import Theraipst from "./Theraipst";
import Button from "../components/Button";
import { Container } from "../components/Container";
import Image from "next/image";

const LicensedPsychologist = () => {
  return (
    <Container>
      <SectionTitle
        title="iCareWellbeing's licensed psychologists provide care and treatment for various conditions"
        titleClass="mt-5"
      />

      <div className="flex flex-col lg:flex-row md:flex-row items-center max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 gap-8">
        
        {/* Image Section (Left on Desktop, Top on Mobile) */}
        <div className="lg:w-1/2 flex justify-center mb-8 lg:mb-0">
          <Image
            src={'/assets/img/licensed.webp'}
            className="w-full object-contain max-w-[400px]"
            alt="Licensed psychologists providing care and treatment"
            width={480}
            height={450}
          />
        </div>

        {/* Therapist Info Section (Right on Desktop, Bottom on Mobile) */}
        <div className="lg:w-1/2 flex flex-col items-center justify-center text-center lg:text-left">
          <Theraipst />
          <p className="mt-5">
            To learn more about our therapists, visit 
            <a 
              href="https://icarewellbeing.com/home/icarewellbeing-therapist-profile/" 
              className="text-blue-500 underline ml-1"
            >
              iCareWellbeing Therapists page.
            </a>
          </p>

          {/* CTA Button */}
          <div className="flex justify-center lg:justify-start mt-6">
            <Button 
              className="text-white border-blue-500 p-2 rounded-md bg-blue-500"
              title="Start Healing"
              aria-label="Start your healing journey"
            />
          </div>
        </div>

      </div>
    </Container>
  );
};

export default LicensedPsychologist;
