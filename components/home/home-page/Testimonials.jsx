'use client';

import React, { useEffect, useState } from "react";
import SectionTitle from "../components/SectionTitle";
// import review1 from "../assets/img/review1.jpeg";
// import review2 from "../assets/img/review2.jpeg";
// import review3 from "../assets/img/review3.jpeg";

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { Container } from "../components/Container";

const Testimonials = () => {
  return (
    <Container className={'!pt-0'}>
      <SectionTitle
        preTitleClass="title flex flex-row w-full justify-center items-center text-center"
        preTitle={`Affordable online therapy changed their lives`}
        />
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
          <img
            src={'/assets/img/review1.jpeg'}
            className="w-full "
            alt="review 1"
          />
        </SwiperSlide>
        <SwiperSlide>
          <img
            src={'/assets/img/review2.jpeg'}
            className="w-full "
            alt="review 1"
          />
        </SwiperSlide>
        <SwiperSlide>
          <img
            src={'/assets/img/review3.jpeg'}
            className="w-full "
            alt="review 1"
          />
        </SwiperSlide>
      </Swiper>
      <div className="flex items-start justify-center mt-6 px-4">
        <a href="https://www.trustpilot.com/review/icarewellbeing.com" target="_blank" className="btn text-white border-green-500 bg-green-500">
          Trust pilot
        </a>
      </div>
    </Container>
  );
};

export default Testimonials;
