'use client';

// import getImmediate from "/assets/img/get-immediate.png";
import { Container } from "../components/Container";
import SectionTitle from "../components/SectionTitle";

export const GetImmediate = () => {
  return (
    <Container className="text-center flex flex-wrap flex-col lg:flex-row">
      <div className="flex items-center justify-center w-full lg:w-1/2">
        <div className="max-w-2xl mb-8">
          <SectionTitle
            line={false}
            title={'This could be your journey with iCareWellbeing.'}
          />
          {/* <p className="py-5 leading-normal text-gray-500 ">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Tempora
            illum, voluptatibus dolores ad facere omnis, nobis saepe, totam
            rerum atque temporibus molestias! Similique eius, eaque harum earum
            dolores ab natus!
          </p>

          <div className="flex items-start gap-3">
            <Link href="/" className="btn text-white bg-blue-500">
              Get Quote Now
            </Link>
            <Link
              href="/"
              className="btn text-blue-400 border-2 border-blue-400"
            >
              Learn More
            </Link>
          </div> */}
        </div>
      </div>
      <div className="max-h-[80vh] flex items-center justify-center w-full lg:w-1/2">
        <img
          src={'/assets/img/get-immediate.png'}
          className={"object-contain  w-[80%] lg:w-full"}
          alt="Hero Illustration"
          loading="lazy"
          placeholder="empty"
        />
      </div>
    </Container>
  );
};
