'use client';

import { CommunicateYourWay } from "./CommunicateYourWay";
import FeatureCards from "./FeatureCards";
import { Fqa } from "./Fqa";
import { GetImmediate } from "./GetImmediate";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { IcareHistory } from "./IcareHistory";
import LicensedPsychologist from "./LicensedPsychologists";
import Testimonials from "./Testimonials";
import WhyChooseUs from "./WhyChooseUs";
import { YourHappiness } from "./YourHappiness";
import { YourLovedOne } from "./YourLovedOne";
import Matching from "./Matching";

const HomePage = () => {
  return (
    <>
      <Hero />
      <FeatureCards />
      <div id="matching">
        <Matching />
      </div>
      <YourHappiness />
      <LicensedPsychologist />
      <HowItWorks />
      <CommunicateYourWay />
      <GetImmediate />
      <Testimonials />
      <Fqa />
      <YourLovedOne />
      <WhyChooseUs />
      <IcareHistory />
    </>
  );
};

export default HomePage