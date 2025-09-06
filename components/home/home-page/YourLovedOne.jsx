'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
// import thanksToThem from "../assets/img/person-two.webp";
import { Container } from "../components/Container";
import Button from "../components/Button";
// import loved1 from '../assets/img/loved1.png'
// import loved2 from '../assets/img/loved2.png'
// import loved3 from '../assets/img/loved3.png'
// import loved4 from '../assets/img/loved4.png'
import SectionTitle from '../components/SectionTitle';

export const YourLovedOne = () => {
  return (
    <Container className={"bg-blue-500"}>
      <div className="flex flex-wrap lg:flex-row justify-evenly">
        <div className="sm:px-4 flex items-center justify-start w-full lg:w-1/2">
          <img
            src={'/assets/img/person-two.webp'}
            className={" object-contain w-full sm:w-[90%]"}
            alt="Hero Illustration"
            loading="lazy"
            placeholder="empty"
          />
        </div>
        <div className=" flex items-center w-full lg:w-1/2">
          <div className="max-w-2xl mt-3 mb-8">
            <SectionTitle
              title={'Is a loved one going through a tough time?'}
              line={false}
              titleClass='text-white text-left'
              childrenClass='text-gray-100 !text-left'
            >
              A therapist may be just what you need
            </SectionTitle>
            <Button
              title={'Get Free Trial'}
              className=" text-blue-500 bg-white"
            />
          </div>
        </div>
      </div>
      {/* /////////// */}
      <div className="sm:mt-20 sm:px-4">
        {/* Mobile Version */}
        <div className="block sm:hidden">
          <Swiper
            spaceBetween={15}
            slidesPerView={1.2}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
            }}
          >
            <SwiperSlide>
              <img src={'/assets/img/loved1.png'} alt="img 1" className="w-full h-auto object-contain" />
            </SwiperSlide>
            <SwiperSlide>
              <img src={'/assets/img/loved2.png'} alt="img 2" className="w-full h-auto object-contain" />
            </SwiperSlide>
            <SwiperSlide>
              <img src={'/assets/img/loved3.png'} alt="img 3" className="w-full h-auto object-contain" />
            </SwiperSlide>
            <SwiperSlide>
              <img src={'/assets/img/loved4.png'} alt="img 4" className="w-full h-auto object-contain" />
            </SwiperSlide>
          </Swiper>
        </div>

        {/* Web Version */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <img src={'/assets/img/loved1.png'} alt="img 1" className="w-full h-auto object-contain" />
          <img src={'/assets/img/loved2.png'} alt="img 2" className="w-full h-auto object-contain" />
          <img src={'/assets/img/loved3.png'} alt="img 3" className="w-full h-auto object-contain" />
          <img src={'/assets/img/loved4.png'} alt="img 4" className="w-full h-auto object-contain" />
        </div>
      </div>
    </Container>
  );
};
