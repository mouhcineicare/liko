'use client';

import person from "../assets/img/person.png";
import icon1 from "../assets/icons/Vector.png";
import { Container } from "../components/Container";

export const DreamIsReality = () => {
  return (
    <Container className="py-10 flex items-center justify-between bg-weHelp  bg-cover bg-center">
      <div className=" flex items-center justify-center w-full lg:w-1/2">
        <div className="max-w-2xl mb-8">
          <h1 className="text-xl font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
            the dream has become a reality with i care
          </h1>
          <div className="px-2">
            <div className="flex justify-between items-start">
              <div className="mr-6 w-10 h-10 rounded-full bg-white flex justify-center items-center">
                <img
                  src={icon1}
                  className={"object-cover w-1/2 h-1/2"}
                  alt="Hero Illustration"
                  loading="eager"
                  placeholder="blur"
                />
              </div>
              <div className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div className="mr-6">logo</div>
              <div className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div className="mr-6">logo</div>
              <div className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div className="mr-6">logo</div>
              <div className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div className="mr-6">logo</div>
              <div className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div className="mr-6">logo</div>
              <div className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative  p-3 lg:p-6 flex items-center justify-center lg:h-auto h-[300px] w-[50%] lg:w-1/2">
        <div className="absolute w-full h-[110%] w-[96%] rounded-full border border-white ">
          {" "}
        </div>
        <div className="absolute w-full h-[110%] w-[90%] rounded-full border border-white "></div>
        <img
          src={person}
          className={"object-cover rounded-full h-full"}
          alt="Hero Illustration"
          loading="eager"
          placeholder="blur"
        />
      </div>
    </Container>
  );
};
