'use client';

import programOne from "../assets/img/program-one.png";
import { Container } from "../components/Container";
import {
  IoCartOutline,
  IoEyeOutline,
  IoHeartOutline,
  IoStarSharp,
} from "react-icons/io5";
// import LoveTreatementTitle from "./LoveTreatmentTitle";
import SectionTitle from "../components/SectionTitle";

export const IcareProgram = () => {
  return (
    <div>
      <Container className="bg-bg-hearts  bg-cover bg-center">
        <SectionTitle
          titleClass="text-white"
          childrenClass="text-gray-200"
          title="Icare special program for love"
        >
          Love now will always be a good experience for you with our therapist
          covering your back in any situation
        </SectionTitle>
        <Container
          className={
            "lg:flex justify-evenly inline-box lg:overflow-x-hidden overflow-x-auto gap-10"
          }
        >
          <div className="max-w-md hover:scale-[1.05] transition-transform duration-300 ease-in-out rounded-xl shadow-lg bg-gray-100">
            <div className="relative">
              <img
                src={programOne}
                className={"object-contain w-full max-h-[300px]"}
                loading="eager"
                placeholder="empty"
                alt=""
              />
              <div className="absolute top-3 left-3 h-5 w-16 py-4 font-bold text-white rounded-lg flex justify-evenly items-center bg-indigo-600">
                sale{" "}
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
                  <IoHeartOutline size={30} />
                </span>
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
                  <IoCartOutline size={30} />
                </span>
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
                  <IoEyeOutline size={30} />
                </span>
              </div>
            </div>
            <div className="px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <div className="font-bold text-indigo-600">Book Now</div>
                <div className="h-5 w-16 py-3 text-yellow-300 rounded-xl flex justify-evenly items-center bg-indigo-600">
                  <IoStarSharp color="gold" />
                  <span>4.3</span>
                </div>
              </div>

              <div className="font-bold text-xl mb-1">for individual</div>
              <p className="text-gray-700 text-base my-2">
                Lorem ipsum dolor sit amet, consectetur adipisicing elit.
                Voluptatibus quia, nulla! Maiores et perferendis eaque,
                exercitationem praesentium nihil.
              </p>
              <div>
                <span className="text-gray-600 mr-2">$15.33</span>
                <span className="text-red-500">$15.33</span>
              </div>
            </div>
            <div className="px-4 pb-4">
              <a href={"/love-treatment"}>
                <span className="cursor-pointer hover:bg-indigo-700  bg-indigo-600 rounded-full px-8 py-4 text-sm lg:text-lg font-medium text-center inline-block  text-white">
                  Learn more &gt;
                </span>
              </a>
            </div>
          </div>
          <div className="max-w-md hover:scale-[1.05] transition-transform duration-300 ease-in-out rounded-xl shadow-lg bg-gray-100">
            <div className="relative">
              <img
                src={programOne}
                className={"object-contain w-full max-h-[300px]"}
                loading="eager"
                placeholder="empty"
                alt=""
              />
              <div className="absolute top-3 left-3 h-5 w-16 py-4 font-bold text-white rounded-lg flex justify-evenly items-center bg-indigo-600">
                sale{" "}
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
                  <IoHeartOutline size={30} />
                </span>
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
                  <IoCartOutline size={30} />
                </span>
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100">
                  <IoEyeOutline size={30} />
                </span>
              </div>
            </div>
            <div className="px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <div className="font-bold text-indigo-600">Book Now</div>
                <div className="h-5 w-16 py-3 text-yellow-300 rounded-xl flex justify-evenly items-center bg-indigo-600">
                  <IoStarSharp color="gold" />
                  <span>4.3</span>
                </div>
              </div>

              <div className="font-bold text-xl mb-1">for individual</div>
              <p className="text-gray-700 text-base my-2">
                Lorem ipsum dolor sit amet, consectetur adipisicing elit.
                Voluptatibus quia, nulla! Maiores et perferendis eaque,
                exercitationem praesentium nihil.
              </p>
              <div>
                <span className="text-gray-600 mr-2">$15.33</span>
                <span className="text-red-500">$15.33</span>
              </div>
            </div>
            <div className="px-4 pb-4">
              <a href={"/love-treatment"}>
                <span className="cursor-pointer hover:bg-indigo-700  bg-indigo-600 rounded-full px-8 py-4 text-sm lg:text-lg font-medium text-center inline-block  text-white">
                  Learn more &gt;
                </span>
              </a>
            </div>
          </div>
        </Container>
      </Container>
    </div>
  );
};
