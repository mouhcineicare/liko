'use client';

// import thanksToThem from "../assets/img/thanks-to-them.png";
// import heartLive from "../assets/img/heartl-ive.png";
import { Container } from "../components/Container";

export const ThanksToThem = () => {
  return (
    <Container className="flex flex-wrap flex-col-reverse lg:flex-row">
      <div className="flex items-center justify-start w-full lg:w-1/2">
        <img
          src={'/assets/img/thanks-to-them.png'}
          className={"max-h-[80vh] object-contain w-[80%] "}
          alt="Hero Illustration"
          loading="lazy"
          placeholder="empty"
        />
      </div>
      <div className="flex items-center  justify-end w-full lg:w-1/2">
        <div className="max-w-2xl mb-8">
          <span>
            <img
              src={'/assets/img/heartl-ive.png'}
              width="80"
              className={"object-contain mb-3"}
              alt="Hero Illustration"
              loading="lazy"
              placeholder="empty"
            />
          </span>
          <h1 className="text-4xl font-bold leading-snug tracking-tight text-gray-800 lg:leading-tight xl:leading-tight">
            Thanks To Them
          </h1>
          <p className="py-5 leading-normal text-gray-500 dark:text-gray-300">
            Lorem ipsum dolor sit amet, consectetur adipisicing. Necessitatibus
            molestias accusantium exercitationem.
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
