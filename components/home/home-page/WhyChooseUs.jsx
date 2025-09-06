'use client';

import React from 'react';
import { Container } from '../components/Container';
// import guarantee from "/assets/icons/guarantee.png";
// import coaching from "../assets/icons/coaching.png";
// import stripe from "../assets/icons/stripe-logo.png";
// import locker from "../assets/icons/private.png";
// import qualified from "../assets/icons/qualified.png";
// import fast from "/assets/icons/fast.png";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import SectionTitle from '../components/SectionTitle';

const cardData = [
    {
        imgSrc: '/assets/icons/guarantee.png',
        title: "100% Affordable",
        description: "At iCareWellbeing, there are no hidden fees. You only pay extra for faster booking options, such as our 5-minute quick connect service.",
        alt: "100% Guarantee",
    },
    {
        imgSrc: '/assets/icons/private.png',
        title: "100% Private",
        description: "We keep 0 data regarding your mental health. We only collect the necessary information for matching, and no data is stored after you begin therapy.",
        alt: "100% Private",
    },
    {
        imgSrc: '/assets/icons/qualified.png',
        title: "Qualified Therapists",
        description: "Our therapists are fully qualified, undergoing several assessments. With the affordable pricing we offer, they choose to work with us because they genuinely care about helping you!",
        alt: "Qualified Therapist",
    },
    {
        imgSrc: '/assets/icons/fast.png',
        title: "Fastest to Start",
        description: "We understand the importance of getting started quickly. That's why we offer the world's fastest service—connect to a psychologist in just 5 minutes!",
        alt: "Fast and Easy",
    },
    {
        imgSrc: '/assets/icons/coaching.png',
        title: "We Offer In-Person Themed Therapy",
        description: "We're the first to bring therapy to you in the space where you feel most comfortable.",
        alt: "Free Coaching",
    },
    {
        imgSrc: '/assets/icons/stripe-logo.png',
        title: "Secure Stripe Payment",
        description: "We trust Stripe, the world’s leading payment infrastructure, to ensure secure and reliable transactions for all your payments.",
        alt: "stripe payment",
    }
];

const WhyChooseUs = () => {
    return (
        <Container className={"bg-blue-500"}>
            <div className="flex items-center lg:px-10 w-full bg-map bg-contain bg-right bg-no-repeat bg-fixed">
                <div className="max-w-4xl mb-8">
                    <span className="w-28 inline-block h-1 sm:h-2 my-1 bg-white rounded-full"></span>
                    <SectionTitle
                        line={false}
                        title={"Why should I choose ICarewellbeing? World’s most affordable online therapy platform."}
                        titleClass='text-left text-white'
                        childrenClass='text-left text-gray-100'
                    >
                    </SectionTitle>

                    <div className="flex justify-start">
                        <a href="https://icarewellbeing.com/home/start-online-therapy" className="btn text-blue-400 border-white bg-white">
                            Get Started
                        </a>
                    </div>
                </div>
            </div>

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
                    {cardData.map((card, index) => (
                        <SwiperSlide key={index}>
                            <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col justify-start sm:h-[470px] h-[300px]">
                                <img
                                    src={card.imgSrc}
                                    className={"object-cover w-[50px] h-[50px]"}
                                    width={30}
                                    height={30}
                                    style={{ aspectRatio: "1/1", width: 40 }}
                                    alt={card.alt}
                                    loading="lazy"
                                    placeholder="blur"
                                />
                                <h1 className="font-bold text-black">{card.title}</h1>
                                <span className="w-28 inline-block h-1 my-1 bg-blue-500 rounded-full"></span>
                                <p className="text-gray-700">{card.description}</p>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {cardData.map((card, index) => (
                    <div key={index} className="bg-white rounded-xl border shadow-sm p-6 flex flex-col justify-between h-full">
                        <img
                            src={card.imgSrc}
                            className={"object-cover"}
                            style={{ aspectRatio: "1/1" }}
                            alt={card.alt}
                            loading="lazy"
                            placeholder="blur"
                        />
                        <h1 className="mt-2 font-bold text-black">{card.title}</h1>
                        <span className="w-28 inline-block h-1 my-4 bg-blue-500 rounded-full"></span>
                        <p className="text-gray-700">{card.description}</p>
                    </div>
                ))}
            </div>
        </Container>
    );
}

export default WhyChooseUs;
