'use client';

import howItWorks from "../assets/img/we-help.png";
import { Container } from "../components/Container";

export const WeHelp = () => {
  return (
    <Container className="flex bg-black flex-col-reverse lg:flex-row">
      <div className="flex items-center lg:px-10 justify-center lg:justify-end w-full lg:w-1/2">
        <img
          src={howItWorks}
          className={"max-h-[80vh] object-contain w-[80%] lg:w-full"}
          alt="Hero Illustration"
          loading="lazy"
          placeholder="empty"
        />
      </div>
      <div className="flex items-center justify-center lg:justify-start lg:px-10 w-full lg:w-1/2">
        <div className="max-w-2xl mb-8">
          <span className="w-28 inline-block h-2 my-4 bg-blue-600 rounded-full"></span>
          <h1 className="text-4xl font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
            We Help You Solve Any
          </h1>
          <p className="py-5 leading-normal text-gray-200">
            Maybe have an old trauma? we are here for you
          </p>

          <div className="flex items-start gap-3">
            <a href="/" className="btn text-white bg-blue-500">
              Get Quote Now
            </a>
            <a
              href="/"
              className="btn text-blue-400 border-2 border-blue-400"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </Container>
  );
};
