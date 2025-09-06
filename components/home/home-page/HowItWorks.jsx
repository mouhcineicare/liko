'use client';

import { Container } from "../components/Container";
import SectionTitle from "../components/SectionTitle";
import Button from "../components/Button";
import Image from 'next/image';

export const HowItWorks = () => {
  return (
    <Container className="text-center sm:text-left">
      <div className="flex flex-col items-center">
        <Image
          src={'/assets/img/heartl-ive.png'}
          className="mx-auto sm:mx-0 my-2 object-contain w-20"
          alt="Hero Illustration"
          width={80}
          height={80}
        />
      </div>

      <SectionTitle
        preTitle="Explore how we make your experience tailored uniquely to you"
        line={false}
        preTitleClass="text-xl"
        title=""
        className="font-bold"
        childrenClass="text-left mt-4"
      >
        <strong>1.</strong> First, choose the service that best meets your needs. <br />
        <strong>2.</strong> Next, select a preferred time. Please note that it is subject to change. <br />
        <strong>3.</strong> Finally, fill out a form that helps us match you with a therapist based on your preferences.
      </SectionTitle>

  <Container className="flex flex-col md:flex-row lg:flex-row items-center lg:items-start gap-4">
        {/* Content Section (Left on Desktop, Top on Mobile) */}
  <div className="lg:w-1/2 flex flex-col justify-center items-center px-6 text-center lg:text-left">
       <p className="text-md p-2">Complete the form based on your preferences and mental health needs. Legitimate information enhances your experience.</p>
      <Button title="Find My Therapist" className="w-1/2 p-2 rounded-md text-white bg-blue-500 border-blue-500" />
  </div>

  {/* Image Section (Right on Desktop, Bottom on Mobile) */}
  <div className="lg:w-1/2 flex justify-center">
    <Image
      src={'/assets/img/how-it-works.png'}
      className="w-full w-full"
      alt="How It Works"
      width={200}
      height={200}
    />
  </div>
</Container>


      {/* Bottom Icon */}
      <div className="mt-6 flex justify-center">
        <Image
          src={'/assets/img/heart2.png'}
          className="w-[90px] object-contain"
          alt="Heart Icon"
          width={90}
          height={90}
        />
      </div>
    </Container>
  );
};
