'use client';


import heroImg from "../assets/loveTreatment/we-help.png";
import { Container } from "../components/Container";

export const MeetOurNetwork = () => {
  return (
    <Container className="flex flex-wrap flex-col-reverse lg:flex-row">
      <div className="flex items-center w-full lg:w-1/2">
        <div className="max-w-2xl mb-8">
          <span className="w-28 inline-block h-2 my-4 bg-blue-600 rounded-full"></span>
          <h1 className="text-4xl font-bold leading-snug tracking-tight text-gray-800 lg:leading-tight xl:leading-tight">
            Meet Our Network of <br className="hidden lg:block" /> Licensed
            Provieders
          </h1>
          <p className="py-5 leading-normal text-gray-500 ">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptates
            consequuntur cumque suscipit, dignissimos totam repudiandae nulla
            blanditiis accusantium harum quae nesciunt aliquam exercitationem
            sed sunt reiciendis ducimus dolorem enim animi.
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
      <div className="flex items-center justify-center w-full lg:w-1/2">
        <img
          src={heroImg}
          className={"max-h-[80vh] object-contain w-[80%] lg:w-full"}
          alt="Hero Illustration"
          loading="lazy"
          placeholder="empty"
        />
      </div>
    </Container>
  );
};
