'use client';


import { useState, useRef, useEffect } from "react";
import SectionTitle from "../components/SectionTitle";
import { Container } from "../components/Container";
import TherapyForm from "./TherapyForm";
import FeatureCards from "./FeatureCards";

const services = [
  {
    id: 1,
    title: "Monthly Care Plan: 4 Online Therapy Sessions",
    duration: "4h",
    price: "90.00DH",
    description:
      "Please note in this package you will pay 324 AED for 4 sessions.",
    image: "/img/logo.svg",
  },
  {
    id: 2,
    title: "Single Online Therapy",
    duration: "1h",
    price: "90.00DH",
    description: "",
    image: "/img/logo.svg",
  },
  {
    id: 3,
    title: "Monthly Care Plan: 4 Online Therapy Sessions",
    duration: "4h",
    price: "81.00DH",
    description:
      "Please note in this package you will pay 324 AED for 4 sessions.",
    image: "/img/logo.svg",
  },
  {
    id: 4,
    title: "Monthly intensie Care Plan:8 Online Therapy Sessions",
    duration: "8h",
    price: "73.00DH",
    description:
      "Please note in this package you will pay 324 AED for 4 sessions.",
    image: "/img/logo.svg",
  },
  {
    id: 5,
    title: "Connect to psychologist 5 minute",
    duration: "2h",
    price: "180.00DH",
    description: "",
    image: "/img/logo.svg",
  },
];

const Matching = () => {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const componentRef = useRef(null);

  const nextStep = () => {
    setStep((prevStep) => prevStep + 1);
    if (componentRef.current) {
      componentRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setStep((prevStep) => (prevStep > 1 ? prevStep - 1 : prevStep));
    if (componentRef.current) {
      componentRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
  };

  return (
    <Container className={'text-center sm:text-left flex w-full flex-col justify-center'}>
      <SectionTitle title="Begin your journey to healing." />
      <div className="flex justify-center w-full items-center">
          <button
          onClick={() =>  window.open('https://icarewellbeing.com/home/start-online-therapy')}
          className="btn bg-blue-500 p-2 rounded-md mt-2 hover:bg-blue-400 text-white w-80 p-1">
              Start Booking Now
          </button>
      </div>
    </Container>
  );
};

export default Matching;
