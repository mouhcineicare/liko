'use client';


// import therapyWhenYouNeed from "../assets/img/therapy-when-need.png";
// import heartLive from "../assets/img/heartl-ive.png";
import { Container } from "../components/Container";

export const TherapyWhenYouNeed = () => {
  return (
    <Container className="flex flex-wrap ">
      <div className="flex items-center lg:pr-10 justify-start w-full lg:w-1/2">
        <div className="">
          <img
            src={'/assets/img/therapy-when-need.png'}
            className={"max-h-[80vh] object-contain w-[80%] lg:w-full"}
            alt="Hero Illustration"
            loading="lazy"
            placeholder="empty"
          />
        </div>
      </div>
      <div className="flex items-center lg:pl-10 w-full lg:w-1/2">
        <div className="max-w-2xl mb-8">
          <span>
            <img
              src={'/assets/img/heartl-ive.png'}
              width="80"
              className={"object-contain mb-4"}
              alt="Hero Illustration"
              loading="eager"
              placeholder="blur"
            />
          </span>
          <h1 className="text-4xl font-bold leading-snug tracking-tight text-gray-800 lg:leading-tight xl:leading-tight">
            Get Matched To The Best Therapist For You
          </h1>
          <p className="py-5 text-xl leading-normal text-gray-500">
            Answer a few questions to find a licensed therapist who fits your
            needs and preferences. Tap into the largest network of licensed,
            professional, board- certified providers.
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
