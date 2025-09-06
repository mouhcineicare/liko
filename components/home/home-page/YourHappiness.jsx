'use client';

// import born1 from "../assets/img/born1.jpeg";
// import born2 from "../assets/img/born2.jpeg";
// import born3 from "../assets/img/born3.jpeg";
import { Container } from "../components/Container";
import SectionTitle from "../components/SectionTitle";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import Image from "next/image";

export const YourHappiness = () => {
  return (
    <>
      <Container className="bg-blue-500 mt-100 text-center sm:text-left">
        <section aria-labelledby="your-happiness-section">
          <SectionTitle
            preTitleClass="text-white"
            childrenClass="text-white"
            preTitle={`Born in UAE, made for GCC`}
            line={false}
            titleClass={'text-white'}
            title={
              "Our legacy is built on commitment, qualified therapists, and affordability"
            }
          />
        </section>

        {/* Mobile View */}
        <section aria-label="Your Happiness Carousel" className="block sm:hidden">
          <Swiper
        spaceBetween={30}
        centeredSlides={true}
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        modules={[Autoplay, Pagination, Navigation]}
          >
            <SwiperSlide>
              <article>
                <div className="text-center h-[120px]">
                  <h2 className="title font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
                    Over 600 patients per month commit to more than six months of therapy with ICareWellbeing
                  </h2>
                  <span className="w-28 inline-block h-1 sm:h-2 mb-3 bg-white rounded-full"></span>
                </div>
                <div className="flex items-center justify-center">
                  <img
                    src={'assets/img/born1.jpeg'}
                    className="object-cover max-h-60 sm:max-h-96 lg:max-h-full w-[100%] lg:w-[80%]"
                    alt="600+ patients commit to therapy"
                    loading="lazy"
                    placeholder="blur"
                  />
                </div>
              </article>
            </SwiperSlide>

            <SwiperSlide>
              <article>
                <div className="text-center h-[120px]">
                  <h2 className="title font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
                    100+ Licensed therapist
                  </h2>
                  <span className="w-28 inline-block h-1 sm:h-2 mb-3 bg-white rounded-full"></span>
                </div>
                <div className="flex items-center justify-center">
                  <Image
                    src={'/assets/img/born2.jpeg'}
                    className="object-cover lg:max-h-[120px] w-[80%] lg:w-[80%]"
                    alt="600+ patients commit to therapy"
                    loading="lazy"
                    blurDataURL="blur"
                    width={300}
                    height={300}
                  />
                </div>
              </article>
            </SwiperSlide>

            <SwiperSlide>
              <article>
                <div className="text-center h-[120px]">
                  <h2 className="title font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
                    World's most affordable online therapy.
                  </h2>
                  <span className="w-28 inline-block h-1 sm:h-2 mb-3 bg-white rounded-full"></span>
                </div>
                <div className="flex items-center justify-center">
                  <img
                    src={'/assets/img/born3.jpeg'}
                    className="object-cover max-h-60 sm:max-h-96 lg:max-h-full w-[100%] lg:w-[80%]"
                    alt="600+ patients commit to therapy"
                    loading="lazy"
                    placeholder="blur"
                  />
                </div>
              </article>
            </SwiperSlide>

            {/* Similar content for the other slides */}
          </Swiper>
        </section>

        {/* Web View */}
        <div className="hidden sm:block p-2 mt-4">
          <div className="flex flex-row w-full flex-wrap justify-center items-center gap-2 ">
          <div className='w-1/3 max-w-[500px] flex flex-col-reverse items-center justify-center gap-2'>
            <img
                  src={'assets/img/born1.jpeg'}
                  className="object-cover max-w-[400px]"
                  alt="600+ patients commit to therapy"
                  loading="lazy"
                  placeholder="blur"
                />
            <article className="flex text-center items-center w-full h-1/2 justify-center w-full">
              <div className="max-w-2xl flex justify-center items-center w-full">
                <h2 className="font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
                  Over 600 patients per month commit to more than six months of therapy with ICareWellbeing
                </h2>
              </div>
            </article>
          </div>

          <div className='w-1/3 flex flex-col-reverse items-center justify-center gap-2'>
            <img
                  src={'/assets/img/born2.jpeg'}
                  className="object-cover max-w-[400px]"
                  alt="600+ patients commit to therapy"
                  loading="lazy"
                  placeholder="blur"
                />
            <article className="flex text-center items-center w-1/2 h-1/2 justify-center w-full">
              <div className="max-w-2xl flex justify-center items-center w-full">
                <h2 className="font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
                   100+ Licensed therapist.
                </h2>
              </div>
            </article>
          </div>

          <div className='w-1/3 max-w-[400px] flex flex-col-reverse items-center justify-center gap-2'>
            <img
                  src={'/assets/img/born3.jpeg'}
                  className="object-cover max-w-[400px]"
                  alt="600+ patients commit to therapy"
                  loading="lazy"
                  placeholder="blur"
                />
            <article className="flex text-center items-center w-1/2 h-1/2 justify-center w-full">
              <div className="max-w-2xl flex justify-center items-center w-full">
                <h2 className="font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
                     World's most affordable online therapy.    
                </h2>
              </div>
            </article>
          </div>
        </div>
        </div>

        <footer className="flex items-start justify-center mt-6 px-4">
          <a
            href="https://icarewellbeing.com/learn-more-about-our-movement"
            target="_blank"
            rel="noopener noreferrer"
            className="btn text-white border-none bg-blue-600 hover:bg-blue-700"
          >
            iCareWellbeing is a UAE-based company. Learn more about us here.
          </a>
        </footer>
      </Container>
    </>
  );
};
