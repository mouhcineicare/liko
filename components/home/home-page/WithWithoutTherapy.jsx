'use client';

import { Container } from "../components/Container";
import SectionTitle from "../components/SectionTitle";

export const WithWithoutTherapy = () => {
  return (
    <>
      <SectionTitle
        titleClass="text-blue-600"
        title="Life with and without therapist"
      ></SectionTitle>
      <Container className="h-screen overflow-x-auto lg:overflow-visible lg:flex inline-box">
        <div className="px-5 lg:px-14 lg:py-24 bg-with-th bg-cover bg-center flex items-center justify-center flex-col w-full lg:w-1/2">
          <div className="max-w-2xl mb-8">
            <div>
              <span className="w-28 inline-block h-2 my-4 bg-blue-600 rounded-full"></span>
              <h1 className="title font-bold leading-snug tracking-tight text-black lg:leading-tight xl:leading-tight">
                With Therapist
              </h1>
            </div>
            <div className="max-w-lg mx-auto">
              <ul className="text space-y-1 my-6">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500">&bull;</span>
                  <span>Become More Positiver</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-blue-500">&bull;</span>
                  <span>And Attract Morer</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-blue-500">&bull;</span>
                  <span>People Into His Network we can Always Help</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-blue-500">&bull;</span>
                  <span>More Power</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="px-5 lg:px-14 lg:py-24 bg-without-th bg-cover bg-center flex items-center justify-center flex-col w-full lg:w-1/2">
          <div>
            <span className="w-28 inline-block h-2 my-4 bg-white rounded-full"></span>
            <h1 className="title font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
              Without Therapist
            </h1>
          </div>
          <div className="max-w-2xl mb-8">
            <div className="max-w-lg mx-auto">
              <ul className="text space-y-1 my-6 text-white">
                <li className="flex items-start space-x-2">
                  <span>&bull;</span>
                  <span>
                    dont have a place where to put his negative energy so he do
                    so with his close people witch results inlonelinessr
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>&bull;</span>
                  <span>Does not know why</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>&bull;</span>
                  <span>He does not reach his</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>&bull;</span>
                  <span>Dreams And Goals</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};
